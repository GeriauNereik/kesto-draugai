// Rąstelis: šiltai rudas cilindras su metinėmis rievėmis (pastelinis stilius).
let uid = 0;
export function logSvg() {
  const id = `lg${uid++}`;
  return `<svg viewBox="0 0 120 64" aria-hidden="true">
  <defs>
    <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#C9946B"/>
      <stop offset=".55" stop-color="#B07D57"/>
      <stop offset="1" stop-color="#94664A"/>
    </linearGradient>
  </defs>
  <path d="M22 8h78a22 24 0 0 1 0 48H22z" fill="url(#${id})" stroke="#6B4A3A" stroke-width="3" stroke-linejoin="round"/>
  <path d="M40 20c14 3 30-2 44 1M36 42c16-3 28 2 46-1" fill="none" stroke="#7E5640" stroke-width="2.4" stroke-linecap="round" opacity=".55"/>
  <ellipse cx="22" cy="32" rx="18" ry="24" fill="#F1D3A6" stroke="#6B4A3A" stroke-width="3"/>
  <ellipse cx="22" cy="32" rx="12" ry="16.5" fill="none" stroke="#D2A877" stroke-width="2.2"/>
  <ellipse cx="22" cy="32" rx="6.5" ry="9" fill="none" stroke="#D2A877" stroke-width="2.2"/>
  <ellipse cx="22" cy="32" rx="2" ry="2.8" fill="#C08D5E"/>
</svg>`;
}
