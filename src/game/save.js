// Progress persistence. Every access is wrapped in try/catch: storage may be
// unavailable (private mode, blocked cookies) and the game must still work.
const KEY = 'stem-is-for-you-save-v1';
const PREFS = 'stem-is-for-you-prefs-v1';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeSave(data) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function loadPrefs() {
  try {
    return JSON.parse(window.localStorage.getItem(PREFS)) || {};
  } catch {
    return {};
  }
}

export function writePrefs(p) {
  try {
    window.localStorage.setItem(PREFS, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}
