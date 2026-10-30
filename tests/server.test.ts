import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import sharp from 'sharp';
import { createApp, type AppOptions } from '../server/index.js';
import { YouCam, safeProviderUrl, type Fetch } from '../server/youcam.js';

const origin = 'http://localhost:5173';
const liveEnv = { YOUCAM_API_KEY: 'test-secret-not-a-real-key', ALLOW_LIVE_TRYON: 'true', APP_ORIGIN: origin };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const output = 'https://yce-us.s3-accelerate.amazonaws.com/result.jpg?signature=test';
const png = await sharp({ create: { width: 512, height: 384, channels: 3, background: '#988a77' } }).png().toBuffer();
const dataURL = `data:image/png;base64,${png.toString('base64')}`;
const valid = { personImage: dataURL, garmentImage: dataURL, category: 'upper_body', consent: true };

function providerFetch(options: { unsafeUpload?: string; unsafeOutput?: string; fail?: boolean; waiting?: boolean; uploadHeaders?: Record<string, string> } = {}) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  let fileCount = 0;
  const fetcher: Fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    if (options.fail) return json({ error: 'upstream-sensitive-error' }, 401);
    if (String(url).endsWith('/file')) return json({ data: { files: [{ file_id: `file-${++fileCount}`, requests: [{
      url: options.unsafeUpload ?? `https://yce-us.s3-accelerate.amazonaws.com/upload-${fileCount}`,
      method: 'PUT', headers: options.uploadHeaders ?? { 'Content-Type': 'image/jpeg', 'x-amz-meta-test': 'preserved' }
    }] }] } });
    if (init?.method === 'PUT') return new Response(null, { status: 200 });
    if (init?.method === 'POST') return json({ data: { task_id: 'task-id' } });
    return json({ data: { task_status: options.waiting ? 'running' : 'success', results: options.waiting ? null : { url: options.unsafeOutput ?? output } } });
  };
  return { fetcher, calls };
}

async function start(options: AppOptions = {}) {
  const app = createApp({ env: {}, dbPath: ':memory:', ...options });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return {
    request: (path: string, init?: RequestInit) => fetch(base + path, init),
    async close() { await app.locals.close(); await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve())); }
  };
}
const post = (body: unknown = valid, cookie?: string, requestOrigin = origin): RequestInit => ({ method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: requestOrigin, ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body) });
async function poll(server: Awaited<ReturnType<typeof start>>, id: string, cookie: string) {
  for (let i = 0; i < 100; i++) {
    const response = await server.request(`/api/tryons/${id}`, { headers: { Cookie: cookie } });
    const job = await response.json();
    if (job.state === 'success' || job.state === 'error') return job;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw new Error('Job did not settle');
}

test('disabled mode is honest and never contacts YouCam', async () => {
  let called = false;
  const server = await start({ fetch: async () => { called = true; throw new Error('must not fetch'); } });
  try {
    const status = await (await server.request('/api/status')).json();
    assert.equal(status.provider, 'YouCam');
    assert.equal(status.liveEnabled, false);
    assert.match(status.reason, /Configuration required/);
    const response = await server.request('/api/tryons', post());
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, 'CONFIGURATION_REQUIRED');
    assert.equal(called, false);
  } finally { await server.close(); }
});

test('both live gates are required', async () => {
  for (const env of [{ YOUCAM_API_KEY: 'test' }, { ALLOW_LIVE_TRYON: 'true' }]) {
    const server = await start({ env });
    try { assert.equal((await (await server.request('/api/status')).json()).liveEnabled, false); }
    finally { await server.close(); }
  }
});

test('public status exposes only a validated release SHA and no server secrets', async () => {
  const revision = 'f686cfd077a51a67fad1cd2312a5f5f4928b3758';
  for (const RELEASE_SHA of [revision, 'not-a-sha-secret', '../private/.env', 'a'.repeat(41)]) {
    const server = await start({ env: { YOUCAM_API_KEY: 'test-secret-not-a-real-key', RELEASE_SHA } });
    try {
      const status = await (await server.request('/api/status')).json();
      assert.equal(status.revision, RELEASE_SHA === revision ? revision : undefined);
      assert.doesNotMatch(JSON.stringify(status), /test-secret|not-a-sha-secret|private/);
    } finally { await server.close(); }
  }
});

test('production trust boundary and spending configuration fail closed', async () => {
  for (const APP_ORIGIN of [undefined, '', 'http://example.com', 'https://example.com/', 'https://example.com/path', 'https://user@example.com', 'https://example.com?query=1']) {
    assert.throws(() => createApp({ env: { NODE_ENV: 'production', APP_ORIGIN }, dbPath: ':memory:' }), /exact HTTPS origin/);
  }
  for (const MAX_LIVE_JOBS_PER_DAY of ['', '0', '-1', '1.5', 'not-a-number', 'Infinity']) {
    assert.throws(() => createApp({ env: { MAX_LIVE_JOBS_PER_DAY }, dbPath: ':memory:' }), /positive integer/);
  }
  const server = await start({ env: { ...liveEnv, NODE_ENV: 'production', APP_ORIGIN: 'https://app.example' }, fetch: providerFetch().fetcher });
  try {
    assert.equal((await server.request('/api/tryons', post())).status, 403);
    const response = await server.request('/api/tryons', post(valid, undefined, 'https://app.example'));
    assert.equal(response.status, 202);
    assert.match(response.headers.get('set-cookie')!, /; Secure/i);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
  } finally { await server.close(); }
});

test('writes require exact trusted Origin before parsing the body', async () => {
  const server = await start({ env: liveEnv });
  try {
    for (const requestOrigin of ['https://evil.example', 'http://localhost:5173.evil.example', 'null', '']) {
      assert.equal((await server.request('/api/tryons', post(valid, undefined, requestOrigin))).status, 403);
      assert.equal((await server.request('/api/session', { method: 'DELETE', headers: { Origin: requestOrigin } })).status, 403);
    }
    assert.equal((await server.request('/api/session', { method: 'DELETE' })).status, 403);
    assert.equal((await server.request('/api/tryons', {
      ...post(), headers: { ...post().headers, 'Sec-Fetch-Site': 'cross-site' }
    })).status, 403);
  } finally { await server.close(); }
});

test('unsupported formats, oversized dimensions and malformed encodings never reach provider', async () => {
  const { fetcher, calls } = providerFetch();
  const server = await start({ env: liveEnv, fetch: fetcher });
  try {
    const oversized = await sharp({ create: { width: 4097, height: 384, channels: 3, background: '#fff' } }).png().toBuffer();
    const narrow = await sharp({ create: { width: 512, height: 383, channels: 3, background: '#fff' } }).png().toBuffer();
    const gif = await sharp(png).gif().toBuffer();
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="512" height="384"><rect width="100%" height="100%"/></svg>');
    for (const personImage of [
      'data:image/png;base64,' + oversized.toString('base64'),
      'data:image/png;base64,' + narrow.toString('base64'),
      'data:image/gif;base64,' + gif.toString('base64'),
      'data:image/png;base64,' + gif.toString('base64'),
      'data:image/svg+xml;base64,' + svg.toString('base64'),
      'data:image/png;base64,' + svg.toString('base64'),
      dataURL + '=', 'data:image/png;base64,%%%'
    ]) assert.equal((await server.request('/api/tryons', post({ ...valid, personImage }))).status, 400);
    assert.equal(calls.length, 0);
  } finally { await server.close(); }
});

test('decoded images are rotated and metadata is stripped before either upload', async () => {
  const { fetcher, calls } = providerFetch();
  const server = await start({ env: liveEnv, fetch: fetcher });
  try {
    const tagged = await sharp(png).jpeg().withMetadata({ orientation: 6 }).toBuffer();
    assert.ok((await sharp(tagged).metadata()).exif);
    const image = 'data:image/jpeg;base64,' + tagged.toString('base64');
    const response = await server.request('/api/tryons', post({ ...valid, personImage: image, garmentImage: image }));
    const cookie = response.headers.get('set-cookie')!.split(';')[0]!;
    const queued = await response.json();
    assert.equal((await poll(server, queued.id, cookie)).state, 'success');
    for (const upload of calls.filter(call => call.init?.method === 'PUT')) {
      const metadata = await sharp(Buffer.from(upload.init!.body as Uint8Array)).metadata();
      assert.equal(metadata.format, 'jpeg');
      assert.equal(metadata.width, 384);
      assert.equal(metadata.height, 512);
      assert.equal(metadata.exif, undefined);
      assert.equal(metadata.icc, undefined);
      assert.equal(metadata.xmp, undefined);
      assert.equal(metadata.orientation, undefined);
    }
  } finally { await server.close(); }
});

test('consent, data URLs, MIME and image dimensions are checked', async () => {
  const { fetcher, calls } = providerFetch();
  const server = await start({ env: liveEnv, fetch: fetcher });
  try {
    const tiny = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#000' } }).png().toBuffer();
    for (const body of [
      { ...valid, consent: false }, { ...valid, consent: undefined }, { ...valid, category: 'lower_body' },
      { ...valid, personImage: 'https://localhost/private' },
      { ...valid, personImage: 'data:image/jpeg;base64,' + png.toString('base64') },
      { ...valid, personImage: 'data:image/png;base64,' + tiny.toString('base64') },
      { ...valid, personImage: 'data:image/png;base64,aGVsbG8=' }
    ]) assert.equal((await server.request('/api/tryons', post(body))).status, 400);
    assert.equal(calls.length, 0);
  } finally { await server.close(); }
});

test('queue, real adapter contract, isolation and session deletion', async () => {
  const { fetcher, calls } = providerFetch();
  const server = await start({ env: liveEnv, fetch: fetcher, pollIntervalMs: 1 });
  try {
    const response = await server.request('/api/tryons', post());
    assert.equal(response.status, 202);
    const rawCookie = response.headers.get('set-cookie')!;
    assert.match(rawCookie, /HttpOnly/i);
    assert.match(rawCookie, /SameSite=Strict/i);
    const cookie = rawCookie.split(';')[0]!;
    const queued = await response.json();
    assert.equal(queued.state, 'queued');
    const job = await poll(server, queued.id, cookie);
    assert.equal(job.state, 'success');
    assert.equal(job.resultUrl, output);
    assert.equal((await server.request(`/api/tryons/${queued.id}`)).status, 404);
    const other = await server.request('/api/tryons', post());
    const otherCookie = other.headers.get('set-cookie')!.split(';')[0]!;
    assert.equal((await server.request(`/api/tryons/${queued.id}`, { headers: { Cookie: otherCookie } })).status, 404);
    assert.equal((await server.request('/api/session', { method: 'DELETE', headers: { Origin: origin, Cookie: cookie } })).status, 204);
    assert.equal((await server.request(`/api/tryons/${queued.id}`, { headers: { Cookie: cookie } })).status, 404);
    const first = calls[0]!;
    assert.equal(first.url, 'https://yce-api-01.makeupar.com/s2s/v2.0/file');
    const file = JSON.parse(String(first.init?.body)).files[0];
    assert.equal(file.content_type, 'image/jpeg');
    assert.equal(file.file_name, 'person.jpg');
    assert.ok(file.file_size > 0);
    const uploads = calls.filter(call => call.init?.method === 'PUT');
    assert.ok(uploads.length >= 2);
    assert.equal(new Headers(uploads[0]!.init?.headers).get('x-amz-meta-test'), 'preserved');
    assert.equal(new Headers(uploads[0]!.init?.headers).get('Authorization'), null);
    assert.equal(first.init?.redirect, 'error');
    assert.equal(uploads[0]!.init?.redirect, 'error');
    const task = calls.find(call => call.url.endsWith('/task/cloth-v4'))!;
    assert.deepEqual(JSON.parse(String(task.init?.body)), { src_file_id: 'file-1', ref_file_id: 'file-2', garment_category: 'upper_body' });
    assert.equal(new Headers(task.init?.headers).get('Authorization'), `Bearer ${liveEnv.YOUCAM_API_KEY}`);
  } finally { await server.close(); }
});

test('provider upload and result URLs reject SSRF, credentials and redirects', async () => {
  for (const url of [
    'http://yce-us.s3-accelerate.amazonaws.com/file', 'https://127.0.0.1/file',
    'https://yce-us.s3-accelerate.amazonaws.com.evil.example/file',
    'https://evil@yce-us.s3-accelerate.amazonaws.com/file',
    'https://yce-us.s3-accelerate.amazonaws.com:8443/file', 'https://example.com/file'
  ]) assert.throws(() => safeProviderUrl(url));
  assert.equal(safeProviderUrl(output).href, output);
  const image = { bytes: png, mime: 'image/png' as const, name: 'test.png' };
  for (const config of [{ unsafeUpload: 'https://127.0.0.1/private' }, { unsafeOutput: 'https://evil.example/result' }]) {
    const { fetcher, calls } = providerFetch(config);
    const provider = new YouCam({ apiKey: 'test', fetch: fetcher });
    await assert.rejects(provider.render(image, image, 'full_body', () => {}, new AbortController().signal), /unsupported image host/);
    assert.equal(calls.some(call => call.url.includes('127.0.0.1') || call.url.includes('evil.example')), false);
  }
});

test('provider credential headers and oversized or malformed responses fail safely', async () => {
  const image = { bytes: png, mime: 'image/png' as const, name: 'test.png' };
  for (const header of ['Authorization', 'Proxy-Authorization', 'Cookie', 'Host', 'Transfer-Encoding', 'Connection']) {
    const fixture = providerFetch({ uploadHeaders: { [header]: 'sensitive-provider-value' } });
    const provider = new YouCam({ apiKey: 'test-secret-not-a-real-key', fetch: fixture.fetcher });
    await assert.rejects(provider.render(image, image, 'outer', () => {}, new AbortController().signal), /unsafe upload headers/);
    assert.equal(fixture.calls.length, 1);
    assert.equal(fixture.calls.some(call => call.init?.method === 'PUT'), false);
  }
  for (const body of ['invalid-json-secret', 'x'.repeat(256 * 1024 + 1)]) {
    let calls = 0;
    const provider = new YouCam({ apiKey: 'test', fetch: async () => { calls++; return new Response(body); } });
    await assert.rejects(provider.render(image, image, 'outer', () => {}, new AbortController().signal), /invalid response/);
    assert.equal(calls, 1);
  }
});

test('provider failures expose a safe error rather than credentials or upstream text', async () => {
  const { fetcher } = providerFetch({ fail: true });
  const server = await start({ env: liveEnv, fetch: fetcher });
  try {
    const response = await server.request('/api/tryons', post());
    const cookie = response.headers.get('set-cookie')!.split(';')[0]!;
    const queued = await response.json();
    const job = await poll(server, queued.id, cookie);
    assert.equal(job.state, 'error');
    assert.match(job.error, /authorization failed/);
    assert.doesNotMatch(JSON.stringify(job), /test-secret|upstream-sensitive/);
  } finally { await server.close(); }
});

test('global daily cap persists after clearing a session', async () => {
  const { fetcher } = providerFetch();
  const server = await start({ env: liveEnv, fetch: fetcher, dailyCap: 1 });
  try {
    const response = await server.request('/api/tryons', post());
    const cookie = response.headers.get('set-cookie')!.split(';')[0]!;
    assert.equal(response.status, 202);
    await server.request('/api/session', { method: 'DELETE', headers: { Origin: origin, Cookie: cookie } });
    assert.equal((await server.request('/api/tryons', post())).status, 429);
  } finally { await server.close(); }
});

test('per-session quota rejects further jobs while allowing another session', async () => {
  const { fetcher } = providerFetch();
  const server = await start({ env: liveEnv, fetch: fetcher, sessionCap: 1 });
  try {
    const response = await server.request('/api/tryons', post());
    const cookie = response.headers.get('set-cookie')!.split(';')[0]!;
    assert.equal((await server.request('/api/tryons', post(valid, cookie))).status, 429);
    assert.equal((await server.request('/api/tryons', post())).status, 202);
  } finally { await server.close(); }
});

test('ingress rate limit bounds even invalid submissions and advertises retry delay', async () => {
  const { fetcher, calls } = providerFetch();
  const server = await start({ env: liveEnv, fetch: fetcher });
  try {
    for (let attempt = 0; attempt < 12; attempt++) {
      assert.equal((await server.request('/api/tryons', post({ ...valid, consent: false }))).status, 400);
    }
    const limited = await server.request('/api/tryons', post());
    assert.equal(limited.status, 429);
    assert.equal(limited.headers.get('retry-after'), '60');
    assert.equal(calls.length, 0);
  } finally { await server.close(); }
});

test('input byte and HTTP body limits reject oversized uploads before provider traffic', async () => {
  const { fetcher, calls } = providerFetch();
  const server = await start({ env: liveEnv, fetch: fetcher });
  try {
    const image = 'data:image/png;base64,' + Buffer.alloc(8 * 1024 * 1024 + 1).toString('base64');
    assert.equal((await server.request('/api/tryons', post({ ...valid, personImage: image }))).status, 400);
    const response = await server.request('/api/tryons', post({ padding: 'a'.repeat(24 * 1024 * 1024) }));
    assert.equal(response.status, 413);
    assert.equal(calls.length, 0);
  } finally { await server.close(); }
});

test('persistent metadata survives restart with session ownership', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'spindle-test-'));
  const dbPath = join(directory, 'metadata.sqlite');
  const { fetcher } = providerFetch();
  let server = await start({ env: liveEnv, fetch: fetcher, dbPath });
  try {
    const response = await server.request('/api/tryons', post());
    const cookie = response.headers.get('set-cookie')!.split(';')[0]!;
    const queued = await response.json();
    await poll(server, queued.id, cookie);
    await server.close();
    server = await start({ env: liveEnv, fetch: fetcher, dbPath });
    const job = await (await server.request(`/api/tryons/${queued.id}`, { headers: { Cookie: cookie } })).json();
    assert.equal(job.state, 'success');
    assert.equal(job.resultUrl, output);
  } finally { await server.close(); await rm(directory, { recursive: true, force: true }); }
});

test('restart marks interrupted work failed without retrying or refunding quota', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'spindle-restart-'));
  const dbPath = join(directory, 'metadata.sqlite');
  const { fetcher, calls } = providerFetch({ waiting: true });
  let server = await start({ env: liveEnv, fetch: fetcher, dbPath, dailyCap: 1, pollIntervalMs: 10_000 });
  try {
    const response = await server.request('/api/tryons', post());
    const cookie = response.headers.get('set-cookie')!.split(';')[0]!;
    const queued = await response.json();
    await server.close();
    const callsBeforeRestart = calls.length;
    const db = new DatabaseSync(dbPath);
    const storedSession = db.prepare('SELECT id FROM sessions').get() as { id: string };
    assert.notEqual(storedSession.id, cookie.split('=')[1]);
    assert.match(storedSession.id, /^[a-f0-9]{64}$/);
    db.close();
    server = await start({ env: liveEnv, fetch: fetcher, dbPath, dailyCap: 1 });
    const job = await (await server.request(`/api/tryons/${queued.id}`, { headers: { Cookie: cookie } })).json();
    assert.equal(job.state, 'error');
    assert.match(job.error, /server restarted/);
    assert.equal(job.resultUrl, undefined);
    assert.equal((await server.request('/api/tryons', post())).status, 429);
    assert.equal(calls.length, callsBeforeRestart);
  } finally { await server.close(); await rm(directory, { recursive: true, force: true }); }
});

test('expired jobs and expired sessions lose access immediately', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'spindle-expiry-'));
  const dbPath = join(directory, 'metadata.sqlite');
  const server = await start({ env: liveEnv, fetch: providerFetch().fetcher, dbPath });
  try {
    const response = await server.request('/api/tryons', post());
    const cookie = response.headers.get('set-cookie')!.split(';')[0]!;
    const queued = await response.json();
    await poll(server, queued.id, cookie);
    const db = new DatabaseSync(dbPath);
    const expired = Date.now() - 25 * 60 * 60 * 1000;
    db.prepare('UPDATE jobs SET created_at=? WHERE id=?').run(expired, queued.id);
    assert.equal((await server.request(`/api/tryons/${queued.id}`, { headers: { Cookie: cookie } })).status, 404);
    db.prepare('UPDATE jobs SET created_at=? WHERE id=?').run(Date.now(), queued.id);
    db.prepare('UPDATE sessions SET created_at=?').run(expired);
    assert.equal((await server.request(`/api/tryons/${queued.id}`, { headers: { Cookie: cookie } })).status, 404);
    db.close();
  } finally { await server.close(); await rm(directory, { recursive: true, force: true }); }
});

test('provider timeout ends polling and never automatically recreates a paid task', async () => {
  const { fetcher, calls } = providerFetch({ waiting: true });
  const server = await start({ env: liveEnv, fetch: fetcher, providerTimeoutMs: 30, pollIntervalMs: 1 });
  try {
    const response = await server.request('/api/tryons', post());
    const cookie = response.headers.get('set-cookie')!.split(';')[0]!;
    const queued = await response.json();
    const job = await poll(server, queued.id, cookie);
    assert.equal(job.state, 'error');
    assert.match(job.error, /cancelled or timed out/);
    assert.equal(calls.filter(c => c.init?.method === 'POST' && c.url.endsWith('/task/cloth-v4')).length, 1);
  } finally { await server.close(); }
});

test('provider throttling is safe and does not retry a billable POST', async () => {
  const fixture = providerFetch();
  let tasks = 0;
  const fetcher: Fetch = async (url, init) => {
    if (init?.method === 'POST' && String(url).endsWith('/task/cloth-v4')) {
      tasks++;
      return json({ error: 'secret-signed-url-or-account-information' }, 429);
    }
    return fixture.fetcher(url, init);
  };
  const server = await start({ env: liveEnv, fetch: fetcher });
  try {
    const response = await server.request('/api/tryons', post());
    const cookie = response.headers.get('set-cookie')!.split(';')[0]!;
    const queued = await response.json();
    const job = await poll(server, queued.id, cookie);
    assert.equal(job.state, 'error');
    assert.doesNotMatch(JSON.stringify(job), /secret-signed|test-secret/);
    assert.equal(tasks, 1);
  } finally { await server.close(); }
});

test('background polling can be cancelled without holding submit HTTP open', async () => {
  const { fetcher } = providerFetch({ waiting: true });
  const server = await start({ env: liveEnv, fetch: fetcher, pollIntervalMs: 10_000 });
  try {
    const response = await server.request('/api/tryons', post());
    assert.equal(response.status, 202);
    const cookie = response.headers.get('set-cookie')!.split(';')[0]!;
    const queued = await response.json();
    await server.request('/api/session', { method: 'DELETE', headers: { Origin: origin, Cookie: cookie } });
    assert.equal((await server.request(`/api/tryons/${queued.id}`, { headers: { Cookie: cookie } })).status, 404);
  } finally { await server.close(); }
});

test('outerwear category reaches V4 unchanged with strict single-person filtering', async () => {
  const { fetcher, calls } = providerFetch();
  const server = await start({ env: liveEnv, fetch: fetcher, pollIntervalMs: 1 });
  try {
    const response = await server.request('/api/tryons', post({ ...valid, category: 'outer' }));
    assert.equal(response.status, 202);
    const cookie = response.headers.get('set-cookie')!.split(';')[0]!;
    const queued = await response.json();
    assert.equal((await poll(server, queued.id, cookie)).state, 'success');
    const task = calls.find(call => call.url.endsWith('/task/cloth-v4'))!;
    assert.deepEqual(JSON.parse(String(task.init?.body)), {
      src_file_id: 'file-1', ref_file_id: 'file-2', garment_category: 'outer', filter_multi_person: 'strict'
    });
    assert.equal(calls.filter(c => c.url.endsWith('/task/cloth-v4')).length, 1);
  } finally { await server.close(); }
});

test('unrecognized outerwear aliases are rejected instead of silently falling back', async () => {
  const { fetcher, calls } = providerFetch();
  const server = await start({ env: liveEnv, fetch: fetcher });
  try {
    for (const category of ['outerwear', 'jacket', 'coat', 'auto']) {
      assert.equal((await server.request('/api/tryons', post({ ...valid, category }))).status, 400);
    }
    assert.equal(calls.length, 0);
  } finally { await server.close(); }
});
