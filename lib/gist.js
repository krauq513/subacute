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

export async function fetchGistData() {
  const { token, gistId } = getGistConfig();
  if (!gistId) {
    return createEmptyGlobalData();
  }

  try {
    const headers = {
      'User-Agent': 'Subacute-Sync-Engine',
      'Accept': 'application/vnd.github.v3+json'
    };
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    const resp = await fetch(`https://api.github.com/gists/${gistId}?t=${Date.now()}`, {
      headers,
      cache: 'no-store'
    });
    if (resp.ok) {
      const gist = await resp.json();
      const fileObj = gist.files && gist.files[GIST_FILENAME];
      if (fileObj && fileObj.content) {
        const parsed = JSON.parse(fileObj.content);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } else {
      console.warn('GitHub Gist fetch responded with status:', resp.status);
    }
  } catch (err) {
    console.warn('GitHub Gist fetch error:', err.message);
  }

  return createEmptyGlobalData();
}

export async function saveGistData(data) {
  const { token, gistId } = getGistConfig();
  if (!token || !gistId) {
    console.warn('GitHub Gist credentials missing; skipping save');
    return false;
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
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Gist save error:', err.message);
    return false;
  }
}
