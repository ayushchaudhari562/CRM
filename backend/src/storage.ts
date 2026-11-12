// Private file storage (Supabase Storage, REST API, no extra library).
// Upload: API gives the phone a one-time signed upload URL; the file goes straight to storage, never through us.
// Read: API turns stored paths into short-lived signed URLs. The bucket is private; the secret key stays here.
// Files are kept for life: nothing here deletes them.
import { randomUUID } from 'node:crypto';
import { env } from './env';
import { HttpError } from './http';
import type { Meeting, UploadKind } from '../../src/types';

const BASE = `${env.supabaseUrl}/storage/v1`;
const READ_URL_SECONDS = 3600;

/** What each kind may be: content types (-> file extension) and max size. */
export const UPLOAD_RULES: Record<UploadKind, { types: Record<string, string>; maxBytes: number }> = {
  selfie: { types: { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }, maxBytes: 5 * 1024 * 1024 },
  photo: { types: { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' }, maxBytes: 8 * 1024 * 1024 },
  voice: { types: { 'audio/mp4': 'm4a', 'audio/m4a': 'm4a', 'audio/aac': 'aac', 'audio/mpeg': 'mp3', 'audio/webm': 'webm' }, maxBytes: 30 * 1024 * 1024 }, // 60 min at 32 kbps ≈ 15 MB
  file: { types: { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png' }, maxBytes: 10 * 1024 * 1024 },
};

function headers(json = true): Record<string, string> {
  const key = env.storageKey!;
  return {
    apikey: key,
    // Legacy service_role keys are JWTs and also go in Authorization; new sb_secret_ keys go in apikey only.
    ...(key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}),
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  };
}

const call = (path: string, init: RequestInit) =>
  fetch(`${BASE}${path}`, { ...init, signal: AbortSignal.timeout(8000) }).catch(() => {
    throw new HttpError(503, 'storage_unavailable', 'File storage is not reachable. Please try again.');
  });

/** Files of a salesman live under their id, so a path proves who owns it. */
export const isOwnPath = (salesmanId: string, path: string) => path.startsWith(`${salesmanId}/`) && !path.includes('..');

export async function createUpload(salesmanId: string, kind: UploadKind, contentType: string, sizeBytes: number) {
  if (!env.storageKey) throw new HttpError(503, 'storage_not_configured', 'File upload is not set up yet.');
  const rule = UPLOAD_RULES[kind];
  const ext = rule.types[contentType];
  if (!ext) throw new HttpError(400, 'invalid', `This file type is not allowed for ${kind}.`);
  if (sizeBytes > rule.maxBytes) throw new HttpError(400, 'too_large', `Max ${rule.maxBytes / 1024 / 1024} MB for ${kind}.`);

  const path = `${salesmanId}/${kind}/${randomUUID()}.${ext}`;
  const res = await call(`/object/upload/sign/${env.storageBucket}/${path}`, { method: 'POST', headers: headers(), body: '{}' });
  if (!res.ok) throw new HttpError(503, 'storage_error', 'Could not prepare the upload. Please try again.');
  const { url } = (await res.json()) as { url: string };
  // Phone does: PUT uploadUrl, body = file, header Content-Type = contentType. URL works once, for ~2 hours.
  return { path, uploadUrl: `${BASE}${url}`, contentType };
}

// path -> signed URL, reused until shortly before it expires (keeps lists fast: no storage call per request).
const urlCache = new Map<string, { url: string; expiresAt: number }>();

/** Signed read URLs for many paths in ONE storage call. Missing / unknown paths map to null. */
async function signedUrls(paths: string[]): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  const now = Date.now();
  const todo = [...new Set(paths)].filter((p) => {
    const hit = urlCache.get(p);
    if (hit && hit.expiresAt > now) out.set(p, hit.url);
    return !out.has(p);
  });
  if (!todo.length || !env.storageKey) return out;

  const res = await call(`/object/sign/${env.storageBucket}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ expiresIn: READ_URL_SECONDS, paths: todo }),
  }).catch(() => null); // storage down: show the visit without files rather than failing the whole screen
  if (!res?.ok) return out;
  if (urlCache.size > 5000) urlCache.clear();
  for (const r of (await res.json()) as { path: string | null; signedURL: string | null }[]) {
    if (!r.path || !r.signedURL) continue;
    const url = `${BASE}${r.signedURL}`;
    out.set(r.path, url);
    urlCache.set(r.path, { url, expiresAt: now + (READ_URL_SECONDS - 300) * 1000 });
  }
  return out;
}

/** Replace stored paths in meetings with signed URLs (null = not available). */
export async function withFileUrls<T extends Meeting>(meetings: T[]): Promise<T[]> {
  const paths = meetings.flatMap((m) => [m.selfieUrl, m.voiceNoteUrl, ...m.attachments.map((a) => a.url)]).filter((p): p is string => !!p);
  const urls = paths.length ? await signedUrls(paths) : new Map<string, string | null>();
  const sign = (p: string | null) => (p ? (urls.get(p) ?? null) : null);
  return meetings.map((m) => ({
    ...m,
    selfieUrl: sign(m.selfieUrl),
    voiceNoteUrl: sign(m.voiceNoteUrl),
    attachments: m.attachments.map((a) => ({ ...a, url: sign(a.url) ?? '' })),
  }));
}

/** One-time setup: create the private bucket with size + type limits. Safe to run again. */
export async function ensureBucket() {
  const allTypes = [...new Set(Object.values(UPLOAD_RULES).flatMap((r) => Object.keys(r.types)))];
  const body = JSON.stringify({ id: env.storageBucket, name: env.storageBucket, public: false, file_size_limit: Math.max(...Object.values(UPLOAD_RULES).map((r) => r.maxBytes)), allowed_mime_types: allTypes });
  const res = await call('/bucket', { method: 'POST', headers: headers(), body });
  if (res.ok) return 'created';
  const text = await res.text();
  if (/already exists|Duplicate/i.test(text)) {
    // Keep limits in step with UPLOAD_RULES.
    const upd = await call(`/bucket/${env.storageBucket}`, { method: 'PUT', headers: headers(), body });
    if (!upd.ok) throw new Error(`Bucket update failed: ${upd.status} ${await upd.text()}`);
    return 'updated';
  }
  throw new Error(`Bucket create failed: ${res.status} ${text}`);
}
