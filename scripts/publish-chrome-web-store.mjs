#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const zipArg = process.argv[2];
const zipPath = zipArg ? path.resolve(process.cwd(), zipArg) : null;

if (!zipPath || !existsSync(zipPath)) {
  console.error('❌ Usage: node scripts/publish-chrome-web-store.mjs <path-to-extension-zip>');
  process.exit(1);
}

const required = [
  'CWS_CLIENT_ID',
  'CWS_CLIENT_SECRET',
  'CWS_REFRESH_TOKEN',
  'CWS_EXTENSION_ID',
  'CWS_PUBLISHER_ID',
];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`❌ Missing required env: ${key}`);
    process.exit(1);
  }
}

const publishType = process.env.CWS_PUBLISH_TYPE || 'DEFAULT_PUBLISH';
const skipReview = process.env.CWS_SKIP_REVIEW === '1';

const accessToken = await fetchAccessToken();
const resourcePath =
  `publishers/${process.env.CWS_PUBLISHER_ID}/items/${process.env.CWS_EXTENSION_ID}`;

const upload = await apiFetch(
  `https://chromewebstore.googleapis.com/upload/v2/${resourcePath}:upload`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/zip',
    },
    body: readFileSync(zipPath),
  },
  accessToken,
);

if (upload.uploadState && upload.uploadState !== 'UPLOAD_STATE_SUCCESS') {
  throw new Error(`upload failed with state ${upload.uploadState}`);
}

const publish = await apiFetch(
  `https://chromewebstore.googleapis.com/v2/${resourcePath}:publish`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      publishType,
      skipReview,
    }),
  },
  accessToken,
);

console.log(JSON.stringify({
  uploadState: upload.uploadState ?? null,
  itemId: upload.itemId ?? process.env.CWS_EXTENSION_ID,
  published: publish,
}, null, 2));

async function fetchAccessToken() {
  const body = new URLSearchParams({
    client_id: process.env.CWS_CLIENT_ID,
    client_secret: process.env.CWS_CLIENT_SECRET,
    refresh_token: process.env.CWS_REFRESH_TOKEN,
    grant_type: 'refresh_token',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`oauth token exchange failed: ${res.status} ${await res.text()}`);
  }

  const json = await res.json();
  if (!json.access_token) throw new Error('oauth token exchange returned no access_token');
  return json.access_token;
}

async function apiFetch(url, init, accessToken) {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Chrome Web Store API failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}
