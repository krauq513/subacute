// Vercel Serverless Function: api/sync.js
// Handles real-time cross-client synchronization for profiles, error reports, comments, and edits

import { put, head } from '@vercel/blob';

const BLOB_PATH = 'sync/global_sync_v1.json';

function mergeData(serverData, clientData) {
  // 1. Reports merge
  const reportMap = new Map();
  (serverData.reports || []).forEach(r => { if (r && r.id) reportMap.set(r.id, r); });
  (clientData.clientReports || []).forEach(r => {
    if (r && r.id) {
      if (!reportMap.has(r.id)) {
        reportMap.set(r.id, r);
      } else {
        const existing = reportMap.get(r.id);
        reportMap.set(r.id, { ...existing, ...r });
      }
    }
  });
  const mergedReports = Array.from(reportMap.values()).sort((a, b) => {
    const ta = new Date(a.createdAt || 0).getTime();
    const tb = new Date(b.createdAt || 0).getTime();
    return tb - ta;
  });

  // 2. Comments merge
  const mergedComments = { ...(serverData.comments || {}) };
  const deletedSet = new Set(clientData.deletedCommentIds || []);

  if (clientData.clientComments && typeof clientData.clientComments === 'object') {
    for (const [qId, commList] of Object.entries(clientData.clientComments)) {
      if (!Array.isArray(commList)) continue;
      const existingList = Array.isArray(mergedComments[qId]) ? mergedComments[qId] : [];
      const cMap = new Map();
      existingList.forEach(c => { if (c && c.id && !deletedSet.has(c.id)) cMap.set(c.id, c); });
      commList.forEach(c => { if (c && c.id && !deletedSet.has(c.id)) cMap.set(c.id, c); });
      mergedComments[qId] = Array.from(cMap.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    }
  }

  if (deletedSet.size > 0) {
    for (const qId of Object.keys(mergedComments)) {
      mergedComments[qId] = mergedComments[qId].filter(c => !deletedSet.has(c.id));
      if (mergedComments[qId].length === 0) {
        delete mergedComments[qId];
      }
    }
  }

  // 3. Custom Edits & Logs
  const mergedEdits = { ...(serverData.customEdits || {}) };
  if (clientData.clientEdits && typeof clientData.clientEdits === 'object') {
    for (const [qId, editObj] of Object.entries(clientData.clientEdits)) {
      if (!editObj) continue;
      const sEdit = mergedEdits[qId];
      if (!sEdit || (editObj.timestamp || 0) >= (sEdit.timestamp || 0)) {
        mergedEdits[qId] = editObj;
      }
    }
  }

  const logMap = new Map();
  (serverData.editLogs || []).forEach(l => { if (l) logMap.set(l.id || `${l.timestamp}_${l.questionId}`, l); });
  (clientData.clientEditLogs || []).forEach(l => { if (l) logMap.set(l.id || `${l.timestamp}_${l.questionId}`, l); });
  const mergedEditLogs = Array.from(logMap.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  // 4. Profiles merge
  const profileMap = new Map();
  (serverData.profiles || []).forEach(p => { if (p && (p.id || p.name)) profileMap.set(p.id || p.name, p); });

  (clientData.clientProfiles || []).forEach(cp => {
    if (!cp || (!cp.id && !cp.name)) return;
    const key = cp.id || cp.name;
    const sp = profileMap.get(key);
    if (!sp) {
      profileMap.set(key, cp);
    } else {
      const mergedAnswers = { ...(sp.userAnswers || {}), ...(cp.userAnswers || {}) };
      const mergedBookmarks = Array.from(new Set([
        ...(Array.isArray(sp.bookmarks) ? sp.bookmarks : []),
        ...(Array.isArray(cp.bookmarks) ? cp.bookmarks : [])
      ]));
      const mergedSubjectMap = { ...(sp.lastSubjectMap || {}), ...(cp.lastSubjectMap || {}) };
      const newerTime = Math.max(Number(sp.updatedAt || 0), Number(cp.updatedAt || 0), Date.now());
      const useCpForPosition = Number(cp.updatedAt || 0) >= Number(sp.updatedAt || 0);

      profileMap.set(key, {
        id: sp.id || cp.id,
        name: cp.name || sp.name,
        avatar: cp.avatar || sp.avatar || '🩺',
        userAnswers: mergedAnswers,
        bookmarks: mergedBookmarks,
        lastQuestionId: useCpForPosition ? (cp.lastQuestionId || sp.lastQuestionId) : (sp.lastQuestionId || cp.lastQuestionId),
        lastSubjectMap: mergedSubjectMap,
        filters: useCpForPosition ? (cp.filters || sp.filters) : (sp.filters || cp.filters),
        shuffleOptions: cp.shuffleOptions !== undefined ? cp.shuffleOptions : sp.shuffleOptions,
        createdAt: sp.createdAt || cp.createdAt || Date.now(),
        updatedAt: newerTime
      });
    }
  });

  return {
    reports: mergedReports,
    comments: mergedComments,
    customEdits: mergedEdits,
    editLogs: mergedEditLogs,
    profiles: Array.from(profileMap.values()),
    syncedAt: new Date().toISOString()
  };
}

async function fetchCurrentGlobalData() {
  try {
    const meta = await head(BLOB_PATH);
    if (meta && meta.url) {
      const resp = await fetch(meta.url, { cache: 'no-store' });
      if (resp.ok) {
        return await resp.json();
      }
    }
  } catch (err) {
    // Blob may not exist yet on first launch
  }
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const current = await fetchCurrentGlobalData();
      return res.status(200).json({ success: true, ...current });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const current = await fetchCurrentGlobalData();
      const merged = mergeData(current, body);

      // Save merged state back to Vercel Blob
      await put(BLOB_PATH, JSON.stringify(merged), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json'
      });

      return res.status(200).json({ success: true, ...merged });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Error in /api/sync:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}
