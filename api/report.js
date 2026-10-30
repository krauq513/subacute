// Vercel Serverless Function: api/report.js
// Handles user issue reports for quiz questions

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const reportLog = {
        receivedAt: new Date().toISOString(),
        questionId: data?.questionId || 'unknown',
        subject: data?.subject || 'unknown',
        year: data?.year || 'unknown',
        qNum: data?.qNum || 0,
        qLabel: data?.qLabel || '',
        category: data?.category || '기타',
        description: data?.description || '',
        profileName: data?.profileName || '익명',
        clientIp: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'
      };

      console.log('🚨 [USER_ISSUE_REPORT]:', JSON.stringify(reportLog));
      return res.status(200).json({ success: true, message: 'Report received successfully', reportId: reportLog.questionId });
    } catch (err) {
      console.error('Error parsing report body:', err);
      return res.status(400).json({ success: false, error: 'Invalid JSON' });
    }
  }

  if (req.method === 'GET') {
    return res.status(200).json({ status: 'ready', message: 'Subacute Issue Reporting API' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
