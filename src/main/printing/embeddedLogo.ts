// Simple embedded logo generator
export function getEmbeddedLogo(): string {
  // Simple company logo as SVG - works 100% in PDF
  const logoSvg = `
<svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
  <rect width="60" height="60" rx="8" fill="#1976d2"/>
  <circle cx="30" cy="25" r="8" fill="white"/>
  <rect x="22" y="35" width="16" height="3" rx="1.5" fill="white"/>
  <rect x="20" y="40" width="20" height="3" rx="1.5" fill="white"/>
  <rect x="24" y="45" width="12" height="3" rx="1.5" fill="white"/>
</svg>`;

  // Convert to base64 data URL
  const base64Logo = Buffer.from(logoSvg).toString('base64');
  return `data:image/svg+xml;base64,${base64Logo}`;
}

module.exports = { getEmbeddedLogo };
