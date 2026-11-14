// Vercel Serverless Function: api/report.js
// Handles user issue reports for quiz questions and syncs to GitHub Gist (zero Vercel Blob usage)

import { fetchGistData, saveGistData } from '../lib/gist.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const reportItem = {
        id: data?.id || ('rep_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)),
        questionId: data?.questionId || 'unknown',
        subject: data?.subject || 'unknown',
        year: data?.year || 'unknown',
        qNum: data?.qNum || 0,
        qLabel: data?.qLabel || '',
        sectionName: data?.sectionName || '',
        stemPreview: data?.stemPreview || '',
        category: data?.category || '기타',
        description: data?.description || '',
        profileName: data?.profileName || '익명',
        createdAt: data?.createdAt || new Date().toISOString(),
        clientIp: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'
      };

      console.log('🚨 [USER_ISSUE_REPORT]:', JSON.stringify(reportItem));

      const current = await fetchGistData();
      const existingReports = Array.isArray(current.reports) ? current.reports : [];
      if (!existingReports.some(r => r.id === reportItem.id)) {
        existingReports.unshift(reportItem);
      }
      current.reports = existingReports;
      current.syncedAt = new Date().toISOString();

      await saveGistData(current);

      return res.status(200).json({
        success: true,
        message: 'Report received and saved successfully',
        report: reportItem,
        totalReports: current.reports.length
      });
    } catch (err) {
      console.error('Error saving report:', err);
      return res.status(400).json({ success: false, error: 'Invalid JSON or storage error' });
    }
  }

  if (req.method === 'GET') {
    try {
      const current = await fetchGistData();
      const reports = Array.isArray(current.reports) ? current.reports : [];
      return res.status(200).json({ status: 'ready', reports, total: reports.length });
    } catch (e) {
      return res.status(200).json({ status: 'ready', reports: [], total: 0 });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
