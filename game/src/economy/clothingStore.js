// Sunwake Threads on the Pastel Mile: Tessa's wardrobe. Buy an outfit once, wear it any time
// you walk in; the choice is saved with the game.

import { TESSA_OUTFIT } from '../player/player.js';

export const STORE = { x: 11 * 64 - 9.5, z: 6 * 64 + 34, name: 'Sunwake Threads' };

export const OUTFITS = [
  { id: 'teal', name: 'Ferry Teal', price: 0, look: {} },
  { id: 'coral', name: 'Coral Sundress', price: 350, look: { shirt: '#ff6b5a', dress: '#ff6b5a', shoes: '#f5f5f5', hat: 'sunhat' } },
  { id: 'racer', name: 'Night Racer', price: 600, look: { shirt: '#1b1b22', pants: '#1b1b22', longSleeves: true, shoes: '#ff3f8e', shades: true } },
  { id: 'beach', name: 'Boardwalk Casual', price: 250, look: { shirt: '#ffd23f', shorts: true, pants: '#3d5a80', hat: 'cap', hatColor: '#19c3b4' } },
  { id: 'harbor', name: 'Crane Yard Hi-Vis', price: 450, look: { shirt: '#3a3f4a', vest: '#ff8a00', hat: 'cap', hatColor: '#ffd23f', pants: '#2f3e46' } },
];

export const outfitLook = (id) => ({ ...TESSA_OUTFIT, ...(OUTFITS.find((o) => o.id === id) || OUTFITS[0]).look });

// Called by the shops each frame while Tessa is inside the store.
export function clothingStore(game, wasPressed) {
  const st = game.state;
  st.outfits ??= ['teal'];
  const current = OUTFITS.findIndex((o) => o.id === (st.outfit || 'teal'));
  const next = OUTFITS[(current + 1) % OUTFITS.length];
  const owned = st.outfits.includes(next.id);
  game.hud.prompt(`<kbd>E</kbd> ${owned ? 'Wear' : 'Buy'} ${next.name}${owned ? '' : ` — $${next.price}`} · wearing ${OUTFITS[current].name}`);
  if (!wasPressed('KeyE')) return;
  if (!owned) {
    if (st.money < next.price) { game.hud.toast('Not enough money'); return; }
    st.money -= next.price;
    st.outfits.push(next.id);
  }
  st.outfit = next.id;
  game.player.applyOutfit(outfitLook(next.id));
  game.hud.toast(`Now wearing <b>${next.name}</b>`);
}
