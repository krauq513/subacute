// Vercel Serverless Function: api/report.js
// Handles user issue reports for quiz questions and syncs to global blob storage

import { put, head } from '@vercel/blob';

const BLOB_PATH = 'sync/global_sync_v1.json';
const BLOB_URL = 'https://mz2fhtrx42zn4hgx.public.blob.vercel-storage.com/sync/global_sync_v1.json';
const TOKEN = process.env.BLOB_READ_WRITE_TOKEN || 'vercel_blob_rw_mZ2FhTrX42ZN4HGX_mEOi9kpT0W8W9oeGrYlsJOIP8s2ZEw';

async function fetchCurrentGlobalData() {
  try {
    const resp = await fetch(`${BLOB_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (resp.ok) {
      return await resp.json();
    }
  } catch (err) {}

  try {
    const meta = await head(BLOB_PATH, { token: TOKEN });
    if (meta && meta.url) {
      const resp = await fetch(`${meta.url}?t=${Date.now()}`, { cache: 'no-store' });
      if (resp.ok) {
        return await resp.json();
      }
    }
  } catch (err) {}

  return {
    reports: [],
    comments: {},
    customEdits: {},
    editLogs: [],
    profiles: [],
    syncedAt: new Date().toISOString()
  };
}

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

      // Append to global blob storage
      const current = await fetchCurrentGlobalData();
      const existingReports = current.reports || [];
      if (!existingReports.some(r => r.id === reportItem.id)) {
        existingReports.unshift(reportItem);
      }
      current.reports = existingReports;
      current.syncedAt = new Date().toISOString();

      await put(BLOB_PATH, JSON.stringify(current), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
        token: TOKEN
      });

      return res.status(200).json({ success: true, message: 'Report received and saved successfully', report: reportItem, totalReports: current.reports.length });
    } catch (err) {
      console.error('Error saving report:', err);
      return res.status(400).json({ success: false, error: 'Invalid JSON or storage error' });
    }
  }

  if (req.method === 'GET') {
    try {
      const current = await fetchCurrentGlobalData();
      return res.status(200).json({ status: 'ready', reports: current.reports || [], total: (current.reports || []).length });
    } catch (e) {
      return res.status(200).json({ status: 'ready', reports: [], total: 0 });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
