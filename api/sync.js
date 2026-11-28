// Vercel Serverless Function wrapper: api/sync.js
// Delegates to shared Edge/Node engine in lib/sync-engine.js
import { handleSyncRequest } from '../lib/sync-engine.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, If-None-Match');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const result = await handleSyncRequest({
    method: req.method,
    queryEtag: (req.query && req.query.etag) || '',
    queryHash: (req.query && req.query.hash) || '',
    headerIfNoneMatch: (req.headers && req.headers['if-none-match']) || '',
    body: req.body ?? null
  });

  if (result.body === null) {
    return res.status(result.status).end();
  }
  return res.status(result.status).json(result.body);
}
