import { z } from 'zod';

const API = 'https://yce-api-01.makeupar.com/s2s/v2.0';
const MAX_RESPONSE_BYTES = 256 * 1024;
export type GarmentCategory = 'upper_body' | 'full_body' | 'outer';
export type Fetch = typeof globalThis.fetch;
export type UploadImage = { bytes: Buffer; mime: 'image/jpeg' | 'image/png'; name: string };
export class ProviderError extends Error {}

/** The only AWS upload/result hosts documented by this integration. No redirects. */
export function safeProviderUrl(value: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new ProviderError('Provider returned an invalid image URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      !/^yce-[a-z0-9-]+\.s3-accelerate\.amazonaws\.com$/.test(url.hostname)) {
    throw new ProviderError('Provider returned an unsupported image host.');
  }
  return url;
}

const fileResponse = z.object({ data: z.object({ files: z.array(z.object({
  file_id: z.string().min(1).max(1024),
  requests: z.array(z.object({ url: z.string().max(8192), method: z.literal('PUT'),
    headers: z.record(z.string(), z.union([z.string(), z.number()])).default({}) })).min(1).max(1)
})).length(1) }) });
const taskResponse = z.object({ data: z.object({ task_id: z.string().min(1).max(1024) }) });
const pollResponse = z.object({ data: z.object({ task_status: z.string(),
  results: z.object({ url: z.string().max(8192).optional() }).nullish(), error: z.unknown().optional() }) });

export interface YouCamOptions { apiKey: string; fetch?: Fetch; pollIntervalMs?: number; timeoutMs?: number }
export class YouCam {
  private readonly fetcher: Fetch;
  constructor(private readonly options: YouCamOptions) { this.fetcher = options.fetch ?? globalThis.fetch; }

  private async request(url: string | URL, init: RequestInit, signal: AbortSignal): Promise<Response> {
    try {
      const response = await this.fetcher(url, { ...init, redirect: 'error', signal: AbortSignal.any([
        signal, AbortSignal.timeout(30_000)
      ]) });
      if (!response.ok) {
        await response.body?.cancel();
        throw new ProviderError(response.status === 401 || response.status === 403
          ? 'YouCam authorization failed. Ask the operator to check the server configuration.'
          : 'YouCam could not complete the request. Please try again later.');
      }
      return response;
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      throw new ProviderError(signal.aborted ? 'Try-on was cancelled or timed out.' : 'YouCam could not be reached. Please try again later.');
    }
  }

  private async json(path: string, method: 'GET' | 'POST', signal: AbortSignal, body?: unknown): Promise<unknown> {
    const response = await this.request(API + path, { method, headers: {
      Authorization: `Bearer ${this.options.apiKey}`, 'Content-Type': 'application/json'
    }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }, signal);
    // Bound even a chunked response. Never include provider bodies or URLs in an error.
    if (!response.body) throw new ProviderError('YouCam returned an empty response.');
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_RESPONSE_BYTES) { await reader.cancel(); throw new Error('oversize'); }
        chunks.push(value);
      }
      return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
    } catch { throw new ProviderError('YouCam returned an invalid response.'); }
    finally { reader.releaseLock(); }
  }

  private async upload(image: UploadImage, signal: AbortSignal): Promise<string> {
    const parsed = fileResponse.safeParse(await this.json('/file', 'POST', signal, { files: [{
      content_type: image.mime, file_name: image.name, file_size: image.bytes.byteLength
    }] }));
    if (!parsed.success) throw new ProviderError('YouCam returned an invalid upload response.');
    const file = parsed.data.data.files[0]!;
    const request = file.requests[0]!;
    const url = safeProviderUrl(request.url);
    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers)) {
      if (/^(authorization|proxy-authorization|cookie|host|connection|transfer-encoding)$/i.test(key)) {
        throw new ProviderError('YouCam returned unsafe upload headers.');
      }
      try { headers.set(key, String(value)); } catch { throw new ProviderError('YouCam returned invalid upload headers.'); }
    }
    if (!headers.has('Content-Type')) headers.set('Content-Type', image.mime);
    const response = await this.request(url, { method: 'PUT', headers, body: new Uint8Array(image.bytes) }, signal);
    await response.body?.cancel();
    return file.file_id;
  }

  async render(person: UploadImage, garment: UploadImage, category: GarmentCategory,
    onState: (state: 'uploading' | 'rendering') => void, externalSignal: AbortSignal): Promise<string> {
    const signal = AbortSignal.any([externalSignal, AbortSignal.timeout(this.options.timeoutMs ?? 300_000)]);
    onState('uploading');
    const src = await this.upload(person, signal);
    const ref = await this.upload(garment, signal);
    const task = taskResponse.safeParse(await this.json('/task/cloth-v4', 'POST', signal, {
      src_file_id: src, ref_file_id: ref, garment_category: category,
      ...(category === 'outer' ? { filter_multi_person: 'strict' } : {})
    }));
    if (!task.success) throw new ProviderError('YouCam returned an invalid task response.');
    onState('rendering');
    for (let poll = 0; poll < 120; poll++) {
      if (signal.aborted) throw new ProviderError('Try-on was cancelled or timed out.');
      const result = pollResponse.safeParse(await this.json(`/task/cloth-v4/${encodeURIComponent(task.data.data.task_id)}`, 'GET', signal));
      if (!result.success) throw new ProviderError('YouCam returned an invalid task response.');
      const data = result.data.data;
      if (data.task_status === 'success') {
        if (!data.results?.url) throw new ProviderError('YouCam returned no result image.');
        return safeProviderUrl(data.results.url).href;
      }
      if (['error', 'failed', 'failure', 'cancelled'].includes(data.task_status) || data.error) {
        throw new ProviderError('YouCam could not render these images. Try a clear, front-facing photo and a single garment.');
      }
      await new Promise<void>((resolve, reject) => {
        const cleanup = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); };
        const abort = () => { cleanup(); reject(new ProviderError('Try-on was cancelled or timed out.')); };
        const timer = setTimeout(() => { cleanup(); resolve(); }, this.options.pollIntervalMs ?? 2500);
        timer.unref();
        signal.addEventListener('abort', abort, { once: true });
        if (signal.aborted) abort();
      });
    }
    throw new ProviderError('YouCam is taking too long. Please try again later.');
  }
}
