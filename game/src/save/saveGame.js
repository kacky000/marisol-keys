// Progress kept in localStorage: money, story chapter, weapons, properties, stats and settings.

const KEY = 'marisol-keys-save-v1';
const SETTINGS_KEY = 'marisol-keys-settings-v1';

export function newGameState() {
  return {
    money: 350,
    story: 0,
    hour: 17.6,
    properties: [],
    weapons: { owned: ['fists', 'pistol'], ammo: { pistol: 60, smg: 0, shotgun: 0 } },
    position: { x: 3 * 64 - 9.5, z: 13 * 64 + 28, heading: 0 },
    stats: { missions: 0, fares: 0, deliveries: 0, races: 0, bestRace: null, kills: 0, stars: 0 },
    savedAt: null,
  };
}

export function saveGame(state, player) {
  state.weapons = { owned: [...player.owned], ammo: { ...player.ammo } };
  state.position = { x: player.pos.x, z: player.pos.z, heading: player.heading };
  state.savedAt = new Date().toISOString();
  try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch { return false; }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return { ...newGameState(), ...JSON.parse(raw) };
  } catch { return null; }
}

export const hasSave = () => { try { return !!localStorage.getItem(KEY); } catch { return false; } };

export const DEFAULT_SETTINGS = { volume: 70, radio: 50, sens: 100, draw: 900, shadows: true, invert: false };

export function loadSettings() {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; } catch { return { ...DEFAULT_SETTINGS }; }
}

export function saveSettings(s) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* private mode */ }
}
