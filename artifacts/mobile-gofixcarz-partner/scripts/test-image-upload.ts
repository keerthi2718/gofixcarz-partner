#!/usr/bin/env npx tsx
/**
 * Integration test — Garage logo S3 upload flow
 * ------------------------------------------------
 * Tests every step of the 3-step flow against the live API:
 *   Step 1  POST /auth/sign-in              → get access token
 *   Step 2  POST /images/upload-url         → get { upload_url, object_key }
 *   Step 3  PUT  <upload_url>               → raw binary (no Auth header)
 *   Step 4  POST /garage/logo               → { object_key } → { logo_url }
 *   Step 5  GET  /garage                    → verify logo_url is set
 *
 * Usage:
 *   PARTNER_EMAIL=you@example.com PARTNER_PASSWORD=secret \
 *     pnpm --filter @workspace/mobile-gofixcarz-partner exec tsx scripts/test-image-upload.ts
 *
 * Optional:
 *   IMAGE_PATH=/path/to/image.jpg   (defaults to a 1×1 white JPEG)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ── Config ──────────────────────────────────────────────────────────────────
const BASE_URL     = process.env.API_BASE_URL     ?? 'https://api.gofixcarz.com/api/v1';
const EMAIL        = process.env.PARTNER_EMAIL    ?? '';
const PASSWORD     = process.env.PARTNER_PASSWORD ?? '';
const IMAGE_PATH   = process.env.IMAGE_PATH       ?? '';

// A minimal 1×1 white JPEG (631 bytes) used when no IMAGE_PATH is provided.
// Generated from: convert -size 1x1 xc:white /tmp/tiny.jpg && xxd -i /tmp/tiny.jpg
const TINY_JPEG_B64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAAR' +
  'CAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAA' +
  'AAAAAAAD/2gAMAwEAAhEDEQA/AJAA/9k=';

// ── Helpers ──────────────────────────────────────────────────────────────────
const pass = (msg: string) => console.log(`  ✅  ${msg}`);
const fail = (msg: string) => { console.error(`  ❌  ${msg}`); process.exit(1); };
const step = (n: number, msg: string) => console.log(`\nStep ${n}: ${msg}`);

async function postJson(url: string, body: unknown, token?: string) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function getJson(url: string, token: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log(' GoFixCarz — Garage logo S3 upload integration test');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  API: ${BASE_URL}`);

  if (!EMAIL || !PASSWORD) {
    fail('Set PARTNER_EMAIL and PARTNER_PASSWORD environment variables before running.');
  }

  // ── Step 1: authenticate ─────────────────────────────────────────────────
  step(1, 'Authenticate (POST /auth/sign-in)');
  const { status: authStatus, json: authJson } = await postJson(
    `${BASE_URL}/auth/sign-in`,
    { email: EMAIL, password: PASSWORD },
  );
  console.log(`     HTTP ${authStatus}`);
  if (authStatus !== 200 || !authJson?.data?.access_token) {
    console.error('     Response:', JSON.stringify(authJson, null, 2));
    fail('Authentication failed. Check credentials.');
  }
  const token: string = authJson.data.access_token;
  pass(`Authenticated. Token: ${token.slice(0, 20)}…`);

  // ── Step 2: get pre-signed upload URL ────────────────────────────────────
  step(2, 'Request pre-signed upload URL (POST /images/upload-url)');
  const { status: urlStatus, json: urlJson } = await postJson(
    `${BASE_URL}/images/upload-url`,
    { file_name: `test_logo_${Date.now()}.jpg`, content_type: 'image/jpeg' },
    token,
  );
  console.log(`     HTTP ${urlStatus}`);
  if (urlStatus !== 200 || !urlJson?.data?.upload_url) {
    console.error('     Response:', JSON.stringify(urlJson, null, 2));
    fail('Failed to get pre-signed URL.');
  }
  const { upload_url, object_key } = urlJson.data;
  pass(`Got pre-signed URL. object_key: ${object_key}`);
  console.log(`     URL prefix: ${upload_url.slice(0, 80)}…`);

  // ── Step 3: PUT binary to S3 ─────────────────────────────────────────────
  step(3, 'PUT binary image to S3 (no Authorization header)');

  let imageBuffer: Buffer;
  let imageMime = 'image/jpeg';

  if (IMAGE_PATH && fs.existsSync(IMAGE_PATH)) {
    imageBuffer = fs.readFileSync(IMAGE_PATH);
    imageMime   = IMAGE_PATH.endsWith('.png') ? 'image/png'
                : IMAGE_PATH.endsWith('.webp') ? 'image/webp'
                : 'image/jpeg';
    console.log(`     Using file: ${path.basename(IMAGE_PATH)} (${imageBuffer.byteLength} bytes)`);
  } else {
    imageBuffer = Buffer.from(TINY_JPEG_B64, 'base64');
    console.log(`     Using built-in 1×1 white JPEG (${imageBuffer.byteLength} bytes)`);
  }

  const s3Res = await fetch(upload_url, {
    method:  'PUT',
    headers: { 'Content-Type': imageMime },
    // @ts-expect-error — Node 18+ fetch accepts Buffer as body
    body:    imageBuffer,
  });
  console.log(`     HTTP ${s3Res.status}`);
  if (!s3Res.ok) {
    const errBody = await s3Res.text().catch(() => '');
    console.error('     S3 response body:', errBody);
    fail(`S3 PUT failed with HTTP ${s3Res.status}. See body above.`);
  }
  pass('Image uploaded to S3 successfully.');

  // ── Step 4: register object_key with garage API ──────────────────────────
  step(4, 'Register logo with garage API (POST /garage/logo)');
  const { status: logoStatus, json: logoJson } = await postJson(
    `${BASE_URL}/garage/logo`,
    { object_key },
    token,
  );
  console.log(`     HTTP ${logoStatus}`);
  if (logoStatus < 200 || logoStatus >= 300) {
    console.error('     Response:', JSON.stringify(logoJson, null, 2));
    fail('POST /garage/logo failed.');
  }
  const logo_url: string = logoJson?.data?.logo_url ?? '';
  pass(`Logo registered. logo_url: ${logo_url.slice(0, 80)}…`);

  // ── Step 5: verify via GET /garage ───────────────────────────────────────
  step(5, 'Verify logo is set (GET /garage)');
  const { status: garageStatus, json: garageJson } = await getJson(`${BASE_URL}/garage`, token);
  console.log(`     HTTP ${garageStatus}`);
  if (garageStatus !== 200) {
    console.error('     Response:', JSON.stringify(garageJson, null, 2));
    fail('GET /garage failed.');
  }
  const returnedUrl: string = garageJson?.data?.logo_url ?? '';
  if (!returnedUrl) {
    fail('Garage returned but logo_url is empty — upload may not have persisted.');
  }
  pass(`Garage logo_url confirmed: ${returnedUrl.slice(0, 80)}…`);

  // ── Done ─────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(' All 5 steps passed ✅  — S3 upload flow is working');
  console.log('═══════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('\nUnhandled error:', err);
  process.exit(1);
});
