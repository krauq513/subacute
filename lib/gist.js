// Shared GitHub Gist persistence helper for Vercel Serverless Functions
// Replaces Vercel Blob completely so Blob Simple/Advanced Operations remain 0.

const GIST_FILENAME = 'global_sync_v1.json';
const DEFAULT_GIST_ID = '88f570fe24ad4ac41f02b0e7592a547c';

export function createEmptyGlobalData() {
  return {
    reports: [],
    comments: {},
    customEdits: {},
    editLogs: [],
    profiles: [],
    syncedAt: new Date().toISOString()
  };
}

function getGistConfig() {
  return {
    token: process.env.GITHUB_SYNC_TOKEN || '',
    gistId: process.env.GITHUB_GIST_ID || DEFAULT_GIST_ID
  };
}

export async function fetchGistDataWithMeta({ throwOnError = false, ifNoneMatch = '' } = {}) {
  const { token, gistId } = getGistConfig();
  if (!gistId) {
    if (throwOnError) {
      throw new Error('GitHub Gist ID missing');
    }
    return { data: createEmptyGlobalData(), etag: '', notModified: false };
  }

  try {
    const headers = {
      'User-Agent': 'Subacute-Sync-Engine',
      'Accept': 'application/vnd.github.v3+json'
    };
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }
    if (ifNoneMatch) {
      headers['If-None-Match'] = ifNoneMatch;
    }

    const resp = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers,
      cache: 'no-store'
    });
    if (resp.status === 304) {
      return { data: null, etag: ifNoneMatch, notModified: true };
    }
    if (!resp.ok) {
      throw new Error(`GitHub Gist fetch responded with status ${resp.status}`);
    }

    const etag = resp.headers.get('etag') || '';
    const gist = await resp.json();
    const fileObj = gist.files && gist.files[GIST_FILENAME];
    if (!fileObj) {
      throw new Error(`Gist file ${GIST_FILENAME} not found`);
    }

    let rawText = fileObj.content || '';
    if ((fileObj.truncated || !rawText) && fileObj.raw_url) {
      const rawResp = await fetch(`${fileObj.raw_url}?t=${Date.now()}`, {
        headers: {
          'User-Agent': 'Subacute-Sync-Engine',
          ...(token ? { 'Authorization': `token ${token}` } : {})
        },
        cache: 'no-store'
      });
      if (!rawResp.ok) {
        throw new Error(`GitHub Gist raw fetch responded with status ${rawResp.status}`);
      }
      rawText = await rawResp.text();
    }

    if (!rawText) {
      throw new Error(`Empty content in ${GIST_FILENAME}`);
    }

    const parsed = JSON.parse(rawText);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error(`Invalid JSON structure in ${GIST_FILENAME}`);
    }
    return { data: parsed, etag, notModified: false };
  } catch (err) {
    console.warn('GitHub Gist fetch error:', err.message);
    if (throwOnError) {
      throw err;
    }
  }

  return { data: createEmptyGlobalData(), etag: '', notModified: false };
}

export async function fetchGistData({ throwOnError = false } = {}) {
  const res = await fetchGistDataWithMeta({ throwOnError });
  return res.data;
}

export async function saveGistDataWithMeta(data) {
  const { token, gistId } = getGistConfig();
  if (!token || !gistId) {
    console.warn('GitHub Gist credentials missing; skipping save');
    return { ok: false, etag: '' };
  }

  try {
    const payload = {
      files: {
        [GIST_FILENAME]: {
          content: JSON.stringify(data)
        }
      }
    };
    const resp = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'Subacute-Sync-Engine',
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) {
      console.warn('Gist save responded with status:', resp.status);
      return { ok: false, etag: '' };
    }
    return { ok: true, etag: resp.headers.get('etag') || '' };
  } catch (err) {
    console.warn('Gist save error:', err.message);
    return { ok: false, etag: '' };
  }
}

export async function saveGistData(data) {
  const res = await saveGistDataWithMeta(data);
  return res.ok;
}
