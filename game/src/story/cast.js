// The people of the story and their painted portraits for dialogue boxes and the phone.

export const CAST = {
  tessa: { name: 'Tessa Vane', role: 'YOU · EX-FERRY PILOT', bg: ['#19c3b4', '#0b5c66'], skin: '#d9a07a', hair: '#2b1b12', hairStyle: 'ponytail', shirt: '#19c3b4', shades: true },
  ozzie: { name: 'Ozzie Calderón', role: 'BAIT SHOP · OLD SMUGGLER', bg: ['#ffb347', '#a8501f'], skin: '#b97a55', hair: '#d8d8d8', hairStyle: 'bald', beard: '#e6e6e6', shirt: '#f4a259', hat: 'bucket' },
  priya: { name: 'Priya Lund', role: 'STATIC 88 FM · HACKER', bg: ['#7a5cff', '#22124a'], skin: '#8d5a3b', hair: '#111111', hairStyle: 'bob', shirt: '#2b2d42', glasses: true, headphones: true },
  lulu: { name: 'Lulu Marchetti', role: 'THE CORAL ROOM · RACER', bg: ['#ff5d8f', '#7a1238'], skin: '#f1c7a5', hair: '#e8cf8f', hairStyle: 'long', shirt: '#ffffff', earrings: true },
  gull: { name: 'Gideon "Gull" Moreau', role: 'CRANE YARD 7 BOSS', bg: ['#9aa5ad', '#2b3238'], skin: '#f1c7a5', hair: '#4a2c1a', hairStyle: 'slick', beard: '#4a2c1a', shirt: '#d62828', scar: true },
  hale: { name: 'Capt. Rourke Hale', role: 'MKPD HARBOR DIVISION', bg: ['#2a6bff', '#0b1f45'], skin: '#d9a07a', hair: '#7a7a7a', hairStyle: 'short', shirt: '#1f3d66', hat: 'police', mustache: '#6a6a6a' },
  dispatch: { name: 'MKPD Dispatch', role: 'POLICE RADIO', bg: ['#132a4a', '#000814'], radio: true },
};

// Paints a stylised bust portrait into a canvas 2D context.
export function paintPortrait(g, who, size) {
  const c = CAST[who] || CAST.dispatch;
  const s = size / 168;
  g.save();
  g.scale(s, s);
  const grad = g.createLinearGradient(0, 0, 0, 168);
  grad.addColorStop(0, c.bg[0]); grad.addColorStop(1, c.bg[1]);
  g.fillStyle = grad;
  g.fillRect(0, 0, 168, 168);
  // sun rings
  g.strokeStyle = 'rgba(255,255,255,0.18)';
  g.lineWidth = 6;
  for (let r = 30; r < 160; r += 22) { g.beginPath(); g.arc(130, 40, r, 0, Math.PI * 2); g.stroke(); }
  if (c.radio) {
    g.fillStyle = '#e0e6ee';
    g.fillRect(54, 50, 60, 90);
    g.fillStyle = '#1b1b1b';
    g.fillRect(62, 60, 44, 30);
    g.fillRect(80, 18, 6, 34);
    for (let k = 0; k < 4; k++) g.fillRect(62, 98 + k * 9, 44, 4);
    g.restore();
    return;
  }
  // shoulders / shirt
  g.fillStyle = c.shirt;
  g.beginPath(); g.ellipse(84, 172, 66, 46, 0, 0, Math.PI * 2); g.fill();
  // neck
  g.fillStyle = shade(c.skin, -18);
  g.fillRect(70, 104, 28, 26);
  // hair behind
  if (c.hairStyle === 'long') { g.fillStyle = c.hair; g.beginPath(); g.ellipse(84, 96, 44, 58, 0, 0, Math.PI * 2); g.fill(); }
  if (c.hairStyle === 'bob') { g.fillStyle = c.hair; g.beginPath(); g.ellipse(84, 80, 42, 44, 0, 0, Math.PI * 2); g.fill(); }
  if (c.hairStyle === 'ponytail') { g.fillStyle = c.hair; g.beginPath(); g.ellipse(124, 84, 12, 30, 0.4, 0, Math.PI * 2); g.fill(); }
  // face
  g.fillStyle = c.skin;
  g.beginPath(); g.ellipse(84, 78, 32, 40, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = shade(c.skin, -25);
  g.beginPath(); g.ellipse(84, 112, 18, 4, 0, 0, Math.PI); g.fill();
  // hair top
  g.fillStyle = c.hair;
  if (c.hairStyle === 'bald') { g.fillStyle = shade(c.skin, 10); g.beginPath(); g.ellipse(84, 48, 26, 12, 0, Math.PI, 0); g.fill(); }
  else if (c.hairStyle === 'short' || c.hairStyle === 'slick') { g.beginPath(); g.ellipse(84, 46, 33, 17, 0, Math.PI, 0); g.fill(); g.fillRect(52, 44, 64, 8); }
  else { g.beginPath(); g.ellipse(84, 48, 35, 20, 0, Math.PI, 0); g.fill(); g.beginPath(); g.ellipse(60, 58, 10, 22, 0.3, 0, Math.PI * 2); g.fill(); }
  // eyes / shades
  if (c.shades) {
    g.fillStyle = '#121212';
    g.beginPath(); g.roundRect(56, 68, 24, 13, 5); g.fill();
    g.beginPath(); g.roundRect(88, 68, 24, 13, 5); g.fill();
    g.fillRect(78, 71, 12, 3);
    g.fillStyle = 'rgba(120,220,255,0.5)';
    g.fillRect(60, 70, 8, 3); g.fillRect(92, 70, 8, 3);
  } else {
    g.fillStyle = '#fff';
    g.beginPath(); g.ellipse(70, 74, 7, 5, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(98, 74, 7, 5, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2b1b12';
    g.beginPath(); g.arc(71, 74, 3.2, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(99, 74, 3.2, 0, Math.PI * 2); g.fill();
    g.strokeStyle = shade(c.hair, -10); g.lineWidth = 3;
    g.beginPath(); g.moveTo(62, 64); g.lineTo(78, 62); g.stroke();
    g.beginPath(); g.moveTo(90, 62); g.lineTo(106, 64); g.stroke();
  }
  if (c.glasses) { g.strokeStyle = '#ffd23f'; g.lineWidth = 3; g.strokeRect(59, 66, 22, 16); g.strokeRect(87, 66, 22, 16); }
  // nose & mouth
  g.strokeStyle = shade(c.skin, -35); g.lineWidth = 2.5;
  g.beginPath(); g.moveTo(84, 78); g.lineTo(80, 92); g.lineTo(86, 93); g.stroke();
  g.strokeStyle = '#8a3a3a'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(74, 102); g.quadraticCurveTo(84, 106, 94, 101); g.stroke();
  if (c.mustache) { g.fillStyle = c.mustache; g.beginPath(); g.ellipse(84, 97, 14, 4, 0, 0, Math.PI * 2); g.fill(); }
  if (c.beard) { g.fillStyle = c.beard; g.globalAlpha = 0.85; g.beginPath(); g.ellipse(84, 108, 26, 14, 0, 0, Math.PI); g.fill(); g.globalAlpha = 1; }
  if (c.scar) { g.strokeStyle = '#a0524a'; g.lineWidth = 2; g.beginPath(); g.moveTo(100, 60); g.lineTo(108, 86); g.stroke(); }
  if (c.earrings) { g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(52, 92, 4, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(116, 92, 4, 0, Math.PI * 2); g.fill(); }
  if (c.headphones) { g.strokeStyle = '#ff3f8e'; g.lineWidth = 7; g.beginPath(); g.arc(84, 70, 42, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); g.fillStyle = '#ff3f8e'; g.fillRect(38, 66, 12, 24); g.fillRect(118, 66, 12, 24); }
  if (c.hat === 'bucket') { g.fillStyle = '#5b7c5a'; g.beginPath(); g.ellipse(84, 46, 46, 9, 0, 0, Math.PI * 2); g.fill(); g.fillRect(58, 22, 52, 24); }
  if (c.hat === 'police') { g.fillStyle = '#132a4a'; g.fillRect(50, 26, 68, 22); g.fillStyle = '#111'; g.beginPath(); g.ellipse(84, 48, 40, 7, 0, 0, Math.PI); g.fill(); g.fillStyle = '#ffd24a'; g.beginPath(); g.arc(84, 36, 6, 0, Math.PI * 2); g.fill(); }
  g.restore();
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt)), gg = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt)), b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${gg},${b})`;
}
