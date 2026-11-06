// Vercel Serverless Function: api/sync.js
// Handles real-time cross-client synchronization for profiles, error reports, comments, and edits

import { put, head } from '@vercel/blob';

const BLOB_PATH = 'sync/global_sync_v1.json';
const BLOB_URL = 'https://mz2fhtrx42zn4hgx.public.blob.vercel-storage.com/sync/global_sync_v1.json';
const TOKEN = process.env.BLOB_READ_WRITE_TOKEN || 'vercel_blob_rw_mZ2FhTrX42ZN4HGX_mEOi9kpT0W8W9oeGrYlsJOIP8s2ZEw';

const GITHUB_TOKEN = process.env.GITHUB_SYNC_TOKEN;
const GIST_ID = process.env.GITHUB_GIST_ID || '88f570fe24ad4ac41f02b0e7592a547c';

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
  const resolvedReportIds = new Set([
    'rep_1793464903407_4eczg',
    'rep_1793465487079_7leo0',
    'rep_1793514583213_irbvt',
    'rep_1793514411231_i4heg',
    'rep_1793513521429_8y5q2',
    'rep_1793509070690_6uszt',
    'rep_1793490107805_c7lvw'
  ]);
  const resolvedQuestionIds = new Set([
    '내과_26Y_Q18',
    '내과_26Y_Q22',
    '내과_26Y_Q31',
    '내과_26Y_Q30',
    '내과_21Y_Q30',
    '내과_23Y_Q33',
    '내과_23Y_Q26',
    '내과_23Y_Q25',
    '내과_23Y_Q07',
    '내과_26Y_Q45',
    '소아청소년과_22Y_Q44',
    '소아청소년과_26Y_Q38',
    '소아청소년과_23Y_Q39',
    '소아청소년과_23Y_Q42',
    '소아청소년과_22Y_Q04',
    '소아청소년과_22Y_Q05',
    '소아청소년과_22Y_Q06',
    '소아청소년과_22Y_Q08',
    '소아청소년과_22Y_Q09',
    '소아청소년과_22Y_Q10',
    '소아청소년과_22Y_Q15',
    '소아청소년과_22Y_Q24',
    '소아청소년과_22Y_Q27',
    '소아청소년과_22Y_Q28',
    '소아청소년과_22Y_Q30',
    '소아청소년과_22Y_Q32',
    '소아청소년과_22Y_Q33',
    '소아청소년과_22Y_Q37',
    '소아청소년과_22Y_Q40',
    '소아청소년과_22Y_Q47',
    '소아청소년과_22Y_Q48',
    '소아청소년과_22Y_Q49',
    '영상의학과_26Y_Q07'
  ]);
  for (const [rid, rep] of reportMap.entries()) {
    if (resolvedReportIds.has(rid) || resolvedQuestionIds.has(rep.questionId)) {
      rep.status = 'resolved';
      rep.resolvedAt = rep.resolvedAt || new Date().toISOString();
      if (rep.questionId === '소아청소년과_22Y_Q44') {
        rep.resolutionNote = '22Y 44번 원본 5지선다 복원 및 정답 ③ PDA(대형 좌-우 단락에 의한 심첨부 확장기잡음 및 P2 항진) 교정 완료';
      } else if (rep.questionId === '소아청소년과_26Y_Q38') {
        rep.resolutionNote = '출제 답안(② 머리 비율)과 교과서적 복수정답(③ 체표면적 비율) 감별 가이드라인 해설 추가 완료';
      } else if (rep.questionId === '소아청소년과_23Y_Q39') {
        rep.resolutionNote = '정답 ⑤(검사없이 추적관찰) 수정 및 단순 조기 유방 발육증 진단기준 해설 정렬 완료';
      } else if (rep.questionId === '소아청소년과_23Y_Q42') {
        rep.resolutionNote = '정답 ①(성장호르몬 결핍증) 및 원본 발문(아버지는 중학교 때 키가 컸고 어머니 초경 연령은 13세였다. 진단은?) 복원 및 상세 해설 완료';
      } else if (rep.questionId === '영상의학과_26Y_Q07') {
        rep.resolutionNote = '활동성 폐결핵 X-ray에 대한 [옳지 않은 것] 부정형 문제 강조 및 ① 폐암 의심 정답 해설 보강 완료';
      } else if (rep.questionId === '내과_26Y_Q31') {
        rep.resolutionNote = '정답 ERCP 수정(선지 1칸 밀림 교정) 및 PTBD 2차 요법 감별 해설 정렬 완료';
      } else if (rep.questionId === '내과_21Y_Q30') {
        rep.resolutionNote = '발문/선지 오표기 문구 정리 및 EST & Basket 담석제거술 표준 해설 완료';
      } else if (rep.questionId === '내과_23Y_Q33') {
        rep.resolutionNote = '심전도 사진 상하 2분할 통합 및 만성신부전 고칼륨혈증 임상 해설·트리거 교정 완료';
      } else if (rep.questionId === '내과_23Y_Q26') {
        rep.resolutionNote = '정답 ③(IBS-C 변비형 식이섬유 권장) 수정 및 IBS-C 진단기준·식이요법 해설 전면 교정 완료';
      } else if (rep.questionId === '내과_23Y_Q25') {
        rep.resolutionNote = '정답 ③(임상적으로 국소 진행암) 수정 및 선지 감별 해설 정렬 완료';
      } else if (rep.questionId === '내과_23Y_Q07') {
        rep.resolutionNote = '심초음파 사진 상하 2분할 통합 및 단일 고화질 이미지 배치 완료';
      } else if (rep.questionId === '내과_26Y_Q45') {
        rep.resolutionNote = '해설 선지 번호 및 비타민D 표기(25(OH)D, 1,25(OH)2D) 누락 교정 완료';
      } else {
        rep.resolutionNote = '발문 오분류 선지 제거 및 정답/오답 해설 1:1 정렬 수정 완료';
      }
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
  // Purge permanently resolved questions from custom edits
  for (const qId of resolvedQuestionIds) {
    if (mergedEdits[qId]) delete mergedEdits[qId];
  }

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
      if (cp.resetAt && Number(cp.resetAt) > Number(sp.resetAt || 0) && Number(cp.resetAt) > Number(sp.updatedAt || 0)) {
        mergedAnswers = { ...(cp.userAnswers || {}) };
      } else {
        mergedAnswers = { ...(sp.userAnswers || {}) };
        if (cp.userAnswers && typeof cp.userAnswers === 'object') {
          for (const [qId, cAns] of Object.entries(cp.userAnswers)) {
            const sAns = mergedAnswers[qId];
            if (!sAns) {
              mergedAnswers[qId] = cAns;
            } else {
              const cTime = Number(cAns.timestamp || 0);
              const sTime = Number(sAns.timestamp || 0);
              if (cTime >= sTime) {
                mergedAnswers[qId] = cAns;
              }
            }
          }
        }
      }

      // Union merge of bookmarks across all devices
      const mergedBookmarks = Array.from(new Set([
        ...(Array.isArray(sp.bookmarks) ? sp.bookmarks : []),
        ...(Array.isArray(cp.bookmarks) ? cp.bookmarks : [])
      ]));

      // Merge subject map taking the latest position per subject
      const mergedSubjectMap = { ...(sp.lastSubjectMap || {}) };
      if (cp.lastSubjectMap && typeof cp.lastSubjectMap === 'object') {
        for (const [sub, cVal] of Object.entries(cp.lastSubjectMap)) {
          if (!mergedSubjectMap[sub] || useCpForPosition) {
            mergedSubjectMap[sub] = cVal;
          }
        }
      }

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

  // Clear stale answers for permanently corrected questions across all profiles
  for (const p of profileMap.values()) {
    if (p.userAnswers && p.userAnswers['소아청소년과_23Y_Q39']) {
      delete p.userAnswers['소아청소년과_23Y_Q39'];
    }
  }

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
  // 1. Primary: GitHub Gist Storage (unlimited, zero-cost, persistent)
  if (GITHUB_TOKEN && GIST_ID) {
    try {
      const resp = await fetch(`https://api.github.com/gists/${GIST_ID}?t=${Date.now()}`, {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'User-Agent': 'Subacute-Sync-Engine',
          'Accept': 'application/vnd.github.v3+json'
        },
        cache: 'no-store'
      });
      if (resp.ok) {
        const gist = await resp.json();
        const fileObj = gist.files && gist.files['global_sync_v1.json'];
        if (fileObj && fileObj.content) {
          const parsed = JSON.parse(fileObj.content);
          if (parsed && typeof parsed === 'object') {
            return parsed;
          }
        }
      }
    } catch (err) {
      console.warn('GitHub Gist fetch error, fallback to blob:', err.message);
    }
  }

  // 2. Secondary: Vercel Blob Storage
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

async function saveCurrentGlobalData(merged) {
  let saved = false;

  // 1. Primary: GitHub Gist Storage
  if (GITHUB_TOKEN && GIST_ID) {
    try {
      const payload = {
        files: {
          'global_sync_v1.json': {
            content: JSON.stringify(merged)
          }
        }
      };
      const resp = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'User-Agent': 'Subacute-Sync-Engine',
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify(payload)
      });
      if (resp.ok) {
        saved = true;
      } else {
        console.warn('Gist save responded with status:', resp.status);
      }
    } catch (err) {
      console.warn('Gist save error:', err.message);
    }
  }

  // 2. Secondary: Vercel Blob Storage (if available)
  try {
    await put(BLOB_PATH, JSON.stringify(merged), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
      token: TOKEN
    });
    saved = true;
  } catch (err) {
    // Gracefully handle suspended Blob store
  }

  return saved;
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

      // Save merged state reliably
      await saveCurrentGlobalData(merged);

      return res.status(200).json({ success: true, ...merged });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Error in /api/sync:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}
