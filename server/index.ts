import express, { type Request, type Response, type NextFunction } from 'express';
import { randomBytes, createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { z } from 'zod';
import { YouCam, ProviderError, type Fetch, type UploadImage, type GarmentCategory } from './youcam.js';

const DAY = 86_400_000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const cookieName = 'spindle_session';
const input = z.object({
  personImage: z.string().max(12_000_000), garmentImage: z.string().max(12_000_000),
  category: z.enum(['upper_body', 'full_body', 'outer']), consent: z.literal(true)
}).strict();
type State = 'queued' | 'uploading' | 'rendering' | 'success' | 'error';
type Job = { id: string; session: string; state: State; result_url: string | null; error: string | null; created_at: number };
type Pending = { person: UploadImage; garment: UploadImage; category: GarmentCategory; controller: AbortController; session: string };

export interface AppOptions {
  env?: NodeJS.ProcessEnv;
  dbPath?: string;
  fetch?: Fetch;
  pollIntervalMs?: number;
  providerTimeoutMs?: number;
  dailyCap?: number;
  sessionCap?: number;
}

async function validateImage(data: string, name: string): Promise<UploadImage> {
  const match = /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/]*={0,2})$/.exec(data);
  if (!match || !match[2] || match[2].length % 4 !== 0) throw new Error('Use a JPEG or PNG image, not a URL.');
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES || bytes.toString('base64') !== match[2]) {
    throw new Error('Each image must be a valid JPEG or PNG smaller than 8 MB.');
  }
  try {
    const image = sharp(bytes, { limitInputPixels: 4096 * 4096, failOn: 'warning', animated: false });
    const meta = await image.metadata();
    if ((meta.format !== 'jpeg' && meta.format !== 'png') ||
        match[1] !== (meta.format === 'jpeg' ? 'image/jpeg' : 'image/png') ||
        !meta.width || !meta.height || (meta.pages ?? 1) !== 1 ||
        Math.max(meta.width, meta.height) > 4096 || Math.min(meta.width, meta.height) < 384 ||
        Math.max(meta.width, meta.height) < 512) throw new Error('dimensions');
    // Fully decode and re-encode. Metadata including GPS and EXIF is not forwarded.
    const normalized = await image.rotate().flatten({ background: '#ffffff' }).jpeg({ quality: 92 }).toBuffer();
    if (normalized.length > MAX_IMAGE_BYTES) throw new Error('size');
    return { bytes: normalized, mime: 'image/jpeg', name: `${name}.jpg` };
  } catch { throw new Error('Use a readable JPEG or PNG, at least 512 × 384 pixels with neither side above 4096 pixels.'); }
}

export function createApp(options: AppOptions = {}) {
  const env = options.env ?? process.env;
  const production = env.NODE_ENV === 'production';
  const apiKey = env.YOUCAM_API_KEY?.trim();
  const liveEnabled = Boolean(apiKey && env.ALLOW_LIVE_TRYON === 'true');
  const reason = liveEnabled ? 'Live YouCam processing is enabled. Images are sent to YouCam only after consent.'
    : 'Configuration required: set YOUCAM_API_KEY and ALLOW_LIVE_TRYON=true on the server. No live images are being generated.';
  const configuredCap = Number(env.MAX_LIVE_JOBS_PER_DAY ?? 30);
  const dailyCap = options.dailyCap ?? (Number.isSafeInteger(configuredCap) && configuredCap > 0 ? configuredCap : 30);
  const secureCookie = production || env.COOKIE_SECURE === 'true';
  const dbPath = options.dbPath ?? env.SQLITE_PATH ?? resolve(env.DATA_DIR ?? resolve(process.cwd(), '.data'), 'spindle.sqlite');
  if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(dbPath);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, session TEXT NOT NULL, state TEXT NOT NULL,
      result_url TEXT, error TEXT, created_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS jobs_session ON jobs(session);
    CREATE TABLE IF NOT EXISTS quotas (scope TEXT NOT NULL, day TEXT NOT NULL, count INTEGER NOT NULL,
      PRIMARY KEY(scope, day));`);
  // Source bytes are never persisted so unfinished jobs cannot be resumed after a restart.
  db.prepare("UPDATE jobs SET state='error', error='The server restarted. Please submit the images again.' WHERE state IN ('queued','uploading','rendering')").run();
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', false);
  const provider = new YouCam({ apiKey: apiKey ?? '', fetch: options.fetch, pollIntervalMs: options.pollIntervalMs, timeoutMs: options.providerTimeoutMs });
  const pending = new Map<string, Pending>();
  const workers = new Set<Promise<void>>();
  const ingress = new Map<string, { start: number; count: number }>();
  let running = 0;
  let decoding = 0;
  let closed = false;
  const dayKey = () => new Date().toISOString().slice(0, 10);
  const sessionHash = (token: string) => createHash('sha256').update(token).digest('hex');
  const findJob = (id: string) => db.prepare('SELECT * FROM jobs WHERE id=? AND created_at>?').get(id, Date.now() - DAY) as Job | undefined;
  const publicJob = (job: Job) => ({ id: job.id, state: job.state, createdAt: new Date(job.created_at).toISOString(),
    ...(job.result_url ? { resultUrl: job.result_url } : {}), ...(job.error ? { error: job.error } : {}) });
  const update = (id: string, state: State, resultUrl: string | null = null, error: string | null = null) => {
    if (!closed) db.prepare('UPDATE jobs SET state=?, result_url=?, error=? WHERE id=?').run(state, resultUrl, error, id);
  };
  const pump = () => {
    if (closed) return;
    for (const [id, item] of pending) {
      if (running >= 2) break;
      const job = findJob(id);
      if (!job || job.state !== 'queued') continue;
      // Change state synchronously before the next worker is scheduled.
      update(id, 'uploading');
      running++;
      const work = (async () => {
        try {
          const url = await provider.render(item.person, item.garment, item.category, state => update(id, state), item.controller.signal);
          if (!item.controller.signal.aborted) update(id, 'success', url);
        } catch (error) {
          update(id, 'error', null, error instanceof ProviderError ? error.message : 'Try-on could not be completed. Please try again.');
        } finally {
          pending.delete(id);
          running--;
          queueMicrotask(pump);
        }
      })();
      workers.add(work);
      void work.finally(() => workers.delete(work)).catch(() => { /* Worker errors are contained above. */ });
    }
  };
  const cleanup = () => {
    const cutoff = Date.now() - DAY;
    for (const [id, item] of pending) {
      const job = findJob(id);
      if (!job) { item.controller.abort(); pending.delete(id); }
    }
    db.prepare('DELETE FROM jobs WHERE created_at<=?').run(cutoff);
    db.prepare('DELETE FROM sessions WHERE created_at<=?').run(cutoff);
    db.prepare('DELETE FROM quotas WHERE day<?').run(dayKey());
    for (const [key, record] of ingress) if (record.start < Date.now() - 60_000) ingress.delete(key);
  };
  cleanup();
  const cleanupTimer = setInterval(cleanup, 60_000);
  cleanupTimer.unref();
  // Tests and graceful shutdown can await cancellation before closing SQLite.
  app.locals.close = async () => {
    if (closed) return;
    closed = true;
    clearInterval(cleanupTimer);
    for (const item of pending.values()) item.controller.abort();
    pending.clear();
    await Promise.allSettled([...workers]);
    db.close();
  };

  app.use('/api', (_req, res, next) => {
    res.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
    next();
  });
  // Require an exact trusted Origin for all writes, including session deletion.
  // No CORS headers are emitted. Vite proxies /api during development.
  app.use('/api', (req, res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const origin = req.get('origin');
      const expected = env.APP_ORIGIN ?? (production ? `${req.protocol}://${req.get('host')}` : 'http://localhost:5173');
      if (!origin || origin !== expected || req.get('sec-fetch-site') === 'cross-site') {
        res.status(403).json({ error: 'This request must come from the application origin.' }); return;
      }
    }
    next();
  });
  app.get('/api/status', (_req, res) => { res.json({ liveEnabled, provider: 'YouCam', reason }); });
  // Session creation is restricted to a write with a valid Origin, not arbitrary GETs.
  const session = (req: Request, res: Response, create: boolean): string | undefined => {
    const token = (req.headers.cookie ?? '').split(';').map(s => s.trim()).find(s => s.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
    if (token && /^[a-f0-9]{64}$/.test(token)) {
      const hash = sessionHash(token);
      if (db.prepare('SELECT id FROM sessions WHERE id=? AND created_at>?').get(hash, Date.now() - DAY)) return hash;
    }
    if (!create) return undefined;
    const fresh = randomBytes(32).toString('hex');
    const hash = sessionHash(fresh);
    db.prepare('INSERT INTO sessions(id,created_at) VALUES(?,?)').run(hash, Date.now());
    res.cookie(cookieName, fresh, { httpOnly: true, sameSite: 'strict', secure: secureCookie, maxAge: DAY, path: '/api' });
    return hash;
  };
  app.post('/api/tryons', (req, res, next) => {
    if (!liveEnabled) { res.status(503).json({ error: reason, code: 'CONFIGURATION_REQUIRED' }); return; }
    const ip = req.ip ?? 'unknown';
    const entry = ingress.get(ip);
    if (!entry || Date.now() - entry.start >= 60_000) {
      if (ingress.size >= 10_000) { res.status(429).json({ error: 'The service is busy. Please try again later.' }); return; }
      ingress.set(ip, { start: Date.now(), count: 1 });
    } else if (++entry.count > 12) { res.set('Retry-After', '60').status(429).json({ error: 'Too many requests. Please wait a minute.' }); return; }
    next();
  }, express.json({ limit: '23mb', strict: true, type: 'application/json' }), async (req, res) => {
    const parsed = input.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Provide two JPEG or PNG data URLs, a valid category and explicit consent: true.' }); return; }
    const owner = session(req, res, true)!;
    const quotaCount = (scope: string) => Number((db.prepare('SELECT count FROM quotas WHERE scope=? AND day=?').get(scope, dayKey()) as { count: number } | undefined)?.count ?? 0);
    const withinQuota = () => quotaCount('global') < dailyCap && quotaCount(owner) < (options.sessionCap ?? 5);
    if (!withinQuota()) { res.status(429).json({ error: 'The daily try-on limit has been reached. Please try again tomorrow.' }); return; }
    if (pending.size >= 12 || decoding >= 2) { res.status(429).json({ error: 'The render queue is full. Please try again shortly.' }); return; }
    let person: UploadImage, garment: UploadImage;
    decoding++;
    try {
      // Sequential decoding limits transient native image memory usage.
      person = await validateImage(parsed.data.personImage, 'person');
      garment = await validateImage(parsed.data.garmentImage, 'garment');
    } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid image.' }); return; }
    finally { decoding--; }
    if (closed) { res.status(503).json({ error: 'The service is shutting down.' }); return; }
    if (!db.prepare('SELECT id FROM sessions WHERE id=?').get(owner)) {
      res.status(409).json({ error: 'This session was cleared. Please start a new try-on.' }); return;
    }
    // Recheck after asynchronous decoding. No await occurs between quota check and reservation.
    if (!withinQuota() || pending.size >= 12) { res.status(429).json({ error: 'The try-on limit has been reached. Please try again later.' }); return; }
    const id = randomBytes(20).toString('hex');
    const createdAt = Date.now();
    db.exec('BEGIN IMMEDIATE');
    try {
      for (const scope of ['global', owner]) db.prepare('INSERT INTO quotas(scope,day,count) VALUES(?,?,1) ON CONFLICT(scope,day) DO UPDATE SET count=count+1').run(scope, dayKey());
      db.prepare("INSERT INTO jobs(id,session,state,created_at) VALUES(?,?,'queued',?)").run(id, owner, createdAt);
      db.exec('COMMIT');
    } catch { db.exec('ROLLBACK'); res.status(503).json({ error: 'Could not queue the try-on. Please try again.' }); return; }
    pending.set(id, { person, garment, category: parsed.data.category, controller: new AbortController(), session: owner });
    res.status(202).json({ id, state: 'queued', createdAt: new Date(createdAt).toISOString() });
    queueMicrotask(pump);
  });
  app.get('/api/tryons/:id', (req, res) => {
    const owner = session(req, res, false);
    const job = /^[a-f0-9]{40}$/.test(req.params.id) ? findJob(req.params.id) : undefined;
    if (!owner || !job || job.session !== owner) { res.status(404).json({ error: 'Try-on not found or expired.' }); return; }
    res.json(publicJob(job));
  });
  app.delete('/api/session', (req, res) => {
    const owner = session(req, res, false);
    if (owner) {
      for (const [id, item] of pending) if (item.session === owner) { item.controller.abort(); pending.delete(id); }
      db.prepare('DELETE FROM jobs WHERE session=?').run(owner);
      db.prepare('DELETE FROM sessions WHERE id=?').run(owner);
      // Keep daily anonymous quota counters. Clearing local jobs cannot refund provider spend.
    }
    res.clearCookie(cookieName, { httpOnly: true, sameSite: 'strict', secure: secureCookie, path: '/api' });
    res.status(204).end();
  });
  app.use('/api', (_req, res) => { res.status(404).json({ error: 'API route not found.' }); });
  if (production) {
    const dist = fileURLToPath(new URL('../dist/', import.meta.url));
    app.use(express.static(dist, { dotfiles: 'deny', index: false }));
    app.get('/{*path}', (_req, res, next) => { res.sendFile(resolve(dist, 'index.html'), err => { if (err) next(err); }); });
  }
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (res.headersSent) return;
    const status = typeof error === 'object' && error !== null && 'status' in error ? Number(error.status) : 500;
    res.status(status === 413 ? 413 : status === 400 ? 400 : 500).json({ error: status === 413
      ? 'The request is too large. Each image must be smaller than 8 MB.'
      : status === 400 ? 'Invalid JSON request.' : 'The request could not be completed.' });
  });
  return app;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  if (existsSync('.env')) process.loadEnvFile('.env');
  const app = createApp();
  const server = app.listen(Number(process.env.PORT ?? 3001), '0.0.0.0', () => {
    console.info('Spindle API listening. Check /api/status for provider configuration.');
  });
  const shutdown = () => { server.close(() => { void app.locals.close().then(() => process.exit(0)); }); };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}
