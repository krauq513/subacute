// Vercel Serverless Function wrapper: api/report.js
// Delegates to shared Edge/Node engine in lib/sync-engine.js
import { handleReportRequest } from '../lib/sync-engine.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const clientIp =
    (req.headers && req.headers['x-forwarded-for']) ||
    (req.socket && req.socket.remoteAddress) ||
    'unknown';

  const result = await handleReportRequest({
    method: req.method,
    body: req.body ?? null,
    clientIp
  });

  if (result.body === null) {
    return res.status(result.status).end();
  }
  return res.status(result.status).json(result.body);
}
