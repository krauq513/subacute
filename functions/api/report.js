// Cloudflare Pages Function: /api/report
import { handleReportRequest } from '../../lib/sync-engine.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
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

  const clientIp =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for') ||
    'unknown';

  const result = await handleReportRequest({
    method: request.method,
    body,
    clientIp,
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
