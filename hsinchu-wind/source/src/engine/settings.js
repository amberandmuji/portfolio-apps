// Per-player settings and progress, remembered in this browser when storage is available.
const KEY = 'hsinchu-wind.settings.v2';

const defaults = {
  sensitivity: 1.0,    // 0.3 – 2.0
  quality: 'high',     // 'high' | 'low'
  volume: 0.8,         // 0 – 1
  music: 0.6,          // 0 – 1
  reached: 0,          // furthest chapter index reached
  keepsakes: [],       // keepsake ids found
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults };
  } catch {
    return { ...defaults };
  }
}

export const settings = load();

const listeners = new Set();
export function onSettingsChange(fn) { listeners.add(fn); }

export function setSetting(key, value) {
  settings[key] = value;
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* storage blocked */ }
  listeners.forEach((fn) => fn(key, value));
}

export function addKeepsake(id) {
  if (!settings.keepsakes.includes(id)) setSetting('keepsakes', [...settings.keepsakes, id]);
}
