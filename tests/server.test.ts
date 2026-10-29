import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

function providerFetch(options: { unsafeUpload?: string; unsafeOutput?: string; fail?: boolean; waiting?: boolean } = {}) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  let fileCount = 0;
  const fetcher: Fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    if (options.fail) return json({ error: 'upstream-sensitive-error' }, 401);
    if (String(url).endsWith('/file')) return json({ data: { files: [{ file_id: `file-${++fileCount}`, requests: [{
      url: options.unsafeUpload ?? `https://yce-us.s3-accelerate.amazonaws.com/upload-${fileCount}`,
      method: 'PUT', headers: { 'Content-Type': 'image/jpeg', 'x-amz-meta-test': 'preserved' }
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

test('writes require exact trusted Origin before parsing the body', async () => {
  const server = await start({ env: liveEnv });
  try {
    for (const requestOrigin of ['https://evil.example', 'http://localhost:5173.evil.example', 'null', '']) {
      assert.equal((await server.request('/api/tryons', post(valid, undefined, requestOrigin))).status, 403);
      assert.equal((await server.request('/api/session', { method: 'DELETE', headers: { Origin: requestOrigin } })).status, 403);
    }
    assert.equal((await server.request('/api/session', { method: 'DELETE' })).status, 403);
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
