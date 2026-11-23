// Map icons: objective, contacts (lettered), police, enemies, vehicles, shops, jobs, properties.

export const BLIP_STYLE = {
  objective: { color: '#ffd23f', shape: 'diamond' },
  contact: { color: '#ffd23f', shape: 'letter' },
  enemy: { color: '#ff3b3b', shape: 'dot' },
  police: { color: '#3f7bff', shape: 'dot' },
  vehicle: { color: '#19c3b4', shape: 'car' },
  shop: { color: '#ffffff', shape: 'letter' },
  job: { color: '#7bd389', shape: 'letter' },
  property: { color: '#ff8fb1', shape: 'house' },
  heli: { color: '#3f7bff', shape: 'heli' },
};

export function drawBlip(g, b, x, y, size, time = 0) {
  const st = BLIP_STYLE[b.kind] || BLIP_STYLE.objective;
  let color = b.color || st.color;
  if (b.kind === 'police') color = Math.floor(time * 4) % 2 ? '#ff3b3b' : '#3f7bff';
  g.save();
  g.translate(x, y);
  g.lineWidth = Math.max(1.5, size * 0.18);
  g.strokeStyle = 'rgba(0,0,0,0.75)';
  g.fillStyle = color;
  switch (st.shape) {
    case 'diamond':
      g.beginPath(); g.moveTo(0, -size); g.lineTo(size * 0.8, 0); g.lineTo(0, size); g.lineTo(-size * 0.8, 0); g.closePath(); g.fill(); g.stroke();
      break;
    case 'dot':
      g.beginPath(); g.arc(0, 0, size * 0.55, 0, Math.PI * 2); g.fill(); g.stroke();
      break;
    case 'car':
      g.beginPath(); g.roundRect(-size * 0.7, -size * 0.45, size * 1.4, size * 0.9, size * 0.25); g.fill(); g.stroke();
      break;
    case 'house':
      g.beginPath(); g.moveTo(-size * 0.7, 0); g.lineTo(0, -size * 0.8); g.lineTo(size * 0.7, 0); g.lineTo(size * 0.55, 0); g.lineTo(size * 0.55, size * 0.7); g.lineTo(-size * 0.55, size * 0.7); g.lineTo(-size * 0.55, 0); g.closePath(); g.fill(); g.stroke();
      break;
    case 'heli':
      g.beginPath(); g.arc(0, 0, size * 0.5, 0, Math.PI * 2); g.fill(); g.stroke();
      g.strokeStyle = color; g.beginPath(); g.moveTo(-size, -size * 0.6); g.lineTo(size, size * 0.6); g.moveTo(-size, size * 0.6); g.lineTo(size, -size * 0.6); g.stroke();
      break;
    default:
      g.beginPath(); g.arc(0, 0, size * 0.85, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = b.kind === 'shop' ? '#0b2233' : '#1b1b1b';
      g.font = `900 ${Math.round(size * 1.1)}px Arial`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(b.letter || '?', 0, size * 0.06);
  }
  g.restore();
}
