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

  // Automatically mark resolved reported errors
  const resolvedReportIds = new Set(['rep_1793464903407_4eczg', 'rep_1793465487079_7leo0']);
  for (const [rid, rep] of reportMap.entries()) {
    if (resolvedReportIds.has(rid) || rep.questionId === '내과_26Y_Q18' || rep.questionId === '내과_26Y_Q22') {
      rep.status = 'resolved';
      rep.resolvedAt = rep.resolvedAt || new Date().toISOString();
      rep.resolutionNote = '발문 오분류 선지 제거 및 정답/오답 해설 1:1 정렬 수정 완료';
    }
  }

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
  (serverData.profiles || []).forEach(p => {
    if (p && p.id) {
      profileMap.set(p.id, p);
    } else if (p && p.name) {
      profileMap.set(p.name, p);
    }
  });

  // Handle explicitly deleted profiles from client
  const deletedProfileSet = new Set(clientData.deletedProfileIds || []);
  if (deletedProfileSet.size > 0) {
    for (const [k, p] of Array.from(profileMap.entries())) {
      if (deletedProfileSet.has(p.id) || deletedProfileSet.has(k)) {
        profileMap.delete(k);
      }
    }
  }

  // Helper to find matching profile in map by ID or case-insensitive trimmed name
  function findExistingProfile(map, cp) {
    if (cp.id && map.has(cp.id)) return { key: cp.id, profile: map.get(cp.id) };
    if (cp.name) {
      const norm = cp.name.trim().toLowerCase();
      for (const [k, p] of map.entries()) {
        if (p && p.name && p.name.trim().toLowerCase() === norm) {
          return { key: k, profile: p };
        }
      }
    }
    return null;
  }

  (clientData.clientProfiles || []).forEach(cp => {
    if (!cp || (!cp.id && !cp.name)) return;
    if (deletedProfileSet.has(cp.id)) return;

    const match = findExistingProfile(profileMap, cp);
    if (!match) {
      profileMap.set(cp.id || cp.name, cp);
    } else {
      const { key, profile: sp } = match;
      const useCpForPosition = Number(cp.updatedAt || 0) >= Number(sp.updatedAt || 0);

      // Handle profile reset or answer-level timestamp merge
      let mergedAnswers = {};
      if (cp.resetAt && Number(cp.resetAt) > Number(sp.resetAt || 0)) {
        mergedAnswers = { ...(cp.userAnswers || {}) };
      } else {
        mergedAnswers = { ...(sp.userAnswers || {}) };
        if (cp.userAnswers && typeof cp.userAnswers === 'object') {
          for (const [qId, cAns] of Object.entries(cp.userAnswers)) {
            const sAns = mergedAnswers[qId];
            if (!sAns || Number(cAns.timestamp || 0) >= Number(sAns.timestamp || 0)) {
              mergedAnswers[qId] = cAns;
            }
          }
        }
      }

      const mergedBookmarks = useCpForPosition
        ? (Array.isArray(cp.bookmarks) ? cp.bookmarks : [])
        : (Array.isArray(sp.bookmarks) ? sp.bookmarks : []);

      const mergedSubjectMap = { ...(sp.lastSubjectMap || {}), ...(cp.lastSubjectMap || {}) };
      const newerTime = Math.max(Number(sp.updatedAt || 0), Number(cp.updatedAt || 0), Date.now());

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
        resetAt: Math.max(Number(sp.resetAt || 0), Number(cp.resetAt || 0)),
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
