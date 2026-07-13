import sharp from "sharp";
import { mkdirSync } from "node:fs";

const PAPER = "#F4F2EB";
const INK = "#23201B";
const RED = "#8A1F2D";
const RED_DEEP = "#5E1520";
const GOLD = "#A5823B";
const SMOKE = "#6E675C";

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "Helvetica, Arial, sans-serif";

const W = 1200;
const H = 630;

function goldFringe(x, y, width) {
  const teeth = [];
  const toothW = 4;
  const gap = 6;
  let cx = x;
  while (cx < x + width) {
    teeth.push(`<rect x="${cx}" y="${y}" width="${toothW}" height="14" fill="${GOLD}" />`);
    cx += toothW + gap;
  }
  return teeth.join("\n");
}

const landingSvg = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="${PAPER}" />

  <defs>
    <linearGradient id="stole" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${RED_DEEP}" />
      <stop offset="35%" stop-color="${RED}" />
    </linearGradient>
  </defs>

  <rect x="70" y="0" width="26" height="430" fill="url(#stole)" />
  <rect x="1104" y="0" width="26" height="430" fill="url(#stole)" />
  ${goldFringe(70, 430, 26)}
  ${goldFringe(1104, 430, 26)}

  <text x="600" y="215" text-anchor="middle" font-family="${SANS}" font-weight="700"
        font-size="22" letter-spacing="4" fill="${SMOKE}">THE UNITED METHODIST CHURCH</text>

  <text x="600" y="325" text-anchor="middle" font-family="${SERIF}" font-weight="500"
        font-size="92" fill="${INK}">The Order of Elders</text>

  <text x="600" y="385" text-anchor="middle" font-family="${SERIF}" font-style="italic"
        font-size="26" fill="${RED_DEEP}">Word &#183; Sacrament &#183; Order &#183; Service</text>

  <text x="600" y="580" text-anchor="middle" font-family="${SANS}" font-weight="700"
        font-size="16" letter-spacing="3" fill="${SMOKE}">ORDEROFELDERS.ORG</text>
</svg>
`;

const riotexasSvg = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="${PAPER}" />

  <rect x="0" y="60" width="${W}" height="3" fill="${RED}" />
  <rect x="0" y="70" width="${W}" height="3" fill="${RED}" />

  <text x="600" y="180" text-anchor="middle" font-family="${SANS}" font-weight="700"
        font-size="22" letter-spacing="4" fill="${SMOKE}">R&#205;O TEXAS CONFERENCE</text>

  <text x="600" y="300" text-anchor="middle" font-family="${SERIF}" font-weight="600"
        font-size="92" fill="${INK}">The Order of Elders</text>

  <text x="600" y="380" text-anchor="middle" font-family="${SANS}" font-weight="700"
        font-size="20" letter-spacing="3" fill="${GOLD}">LETTERS &#183; PRAYER WALL &#183; CALENDAR</text>

  <rect x="0" y="567" width="${W}" height="3" fill="${RED}" />
  <text x="600" y="600" text-anchor="middle" font-family="${SANS}" font-weight="700"
        font-size="16" letter-spacing="3" fill="${SMOKE}">RIOTEXAS.ORDEROFELDERS.ORG</text>
</svg>
`;

mkdirSync("public/riotexas", { recursive: true });

await sharp(Buffer.from(landingSvg)).png().toFile("public/og-landing.png");
await sharp(Buffer.from(riotexasSvg)).png().toFile("public/riotexas/og-riotexas.png");

console.log("Generated public/og-landing.png and public/riotexas/og-riotexas.png");
