// Cloudflare Pages Function: /api/sync
import { handleSyncRequest } from '../../lib/sync-engine.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, If-None-Match',
  'Cache-Control': 'no-store'
};

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  let body = null;
  if (request.method === 'POST') {
    try {
      body = await request.text();
    } catch {
      body = null;
    }
  }

  const url = new URL(request.url);
  const result = await handleSyncRequest({
    method: request.method,
    queryEtag: url.searchParams.get('etag') || '',
    queryHash: url.searchParams.get('hash') || '',
    headerIfNoneMatch: request.headers.get('if-none-match') || '',
    body,
    env
  });

  if (result.body === null) {
    return new Response(null, { status: result.status, headers: CORS_HEADERS });
  }

  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
}
