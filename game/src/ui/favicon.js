// The browser-tab icon, painted at start-up: a striped sunset over a turquoise sea.

export function paintFavicon() {
  const link = document.getElementById('favicon');
  if (!link) return;
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = '#241230';
  g.beginPath(); g.roundRect(0, 0, 32, 32, 7); g.fill();
  const sun = g.createLinearGradient(0, 6, 0, 24);
  sun.addColorStop(0, '#fff3a8'); sun.addColorStop(1, '#ff4f6d');
  g.fillStyle = sun;
  g.beginPath(); g.arc(16, 15, 9, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#241230';
  g.fillRect(5, 16, 22, 2);
  g.fillRect(5, 20, 22, 2);
  g.fillStyle = '#19c3b4';
  g.fillRect(3, 24, 26, 5);
  link.href = c.toDataURL('image/png');
}
