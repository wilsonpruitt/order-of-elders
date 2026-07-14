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

/** Each order's signature mark on the landing hero. */
const SIGNATURES = {
  elders: `
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
  `,
  deacons: `
    <defs>
      <linearGradient id="stole" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${RED_DEEP}" />
        <stop offset="35%" stop-color="${RED}" />
      </linearGradient>
    </defs>
    <g transform="rotate(20 60 -40)">
      <rect x="-40" y="-40" width="26" height="560" fill="url(#stole)" />
      ${goldFringe(-40, 520, 26)}
    </g>
  `,
  "local-pastors": `
    <rect x="120" y="70" width="960" height="430" fill="none" stroke="${RED}" stroke-width="4" />
    <rect x="586" y="490" width="28" height="16" fill="${PAPER}" />
    <text x="600" y="504" text-anchor="middle" font-family="${SERIF}" font-size="20" fill="${GOLD}">&#10011;</text>
  `,
};

/** Each order's masthead signature — the stole seen edge-on. */
const MAST_RULES = {
  elders: `
    <rect x="0" y="60" width="${W}" height="3" fill="${RED}" />
    <rect x="0" y="70" width="${W}" height="3" fill="${RED}" />
  `,
  deacons: `
    <rect x="0" y="65" width="${W}" height="4" fill="${RED}" />
  `,
  "local-pastors": `
    <rect x="120" y="65" width="${W - 240}" height="4" fill="${RED}" />
  `,
};

const SITE_NAMES = {
  elders: "The Order of Elders",
  deacons: "The Order of Deacons",
  "local-pastors": "The Fellowship of Local Pastors",
};

const FOURFOLDS = {
  elders: "Word &#183; Sacrament &#183; Order &#183; Service",
  deacons: "Word &#183; Service &#183; Compassion &#183; Justice",
  "local-pastors": "Word &#183; Sacrament &#183; Order &#183; Service",
};

const DOMAINS = {
  elders: "orderofelders.org",
  deacons: "orderofdeacons.org",
  "local-pastors": "fellowshipoflocalpastors.org",
};

function landingSvg(order) {
  return `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="${PAPER}" />

  ${SIGNATURES[order]}

  <text x="600" y="215" text-anchor="middle" font-family="${SANS}" font-weight="700"
        font-size="22" letter-spacing="4" fill="${SMOKE}">THE UNITED METHODIST CHURCH</text>

  <text x="600" y="325" text-anchor="middle" font-family="${SERIF}" font-weight="500"
        font-size="${order === "local-pastors" ? 66 : 92}" fill="${INK}">${SITE_NAMES[order]}</text>

  <text x="600" y="385" text-anchor="middle" font-family="${SERIF}" font-style="italic"
        font-size="26" fill="${RED_DEEP}">${FOURFOLDS[order]}</text>

  <text x="600" y="580" text-anchor="middle" font-family="${SANS}" font-weight="700"
        font-size="16" letter-spacing="3" fill="${SMOKE}">${DOMAINS[order].toUpperCase()}</text>
</svg>
`;
}

function riotexasSvg(order) {
  return `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="${PAPER}" />

  ${MAST_RULES[order]}

  <text x="600" y="180" text-anchor="middle" font-family="${SANS}" font-weight="700"
        font-size="22" letter-spacing="4" fill="${SMOKE}">R&#205;O TEXAS CONFERENCE</text>

  <text x="600" y="300" text-anchor="middle" font-family="${SERIF}" font-weight="600"
        font-size="${order === "local-pastors" ? 66 : 92}" fill="${INK}">${SITE_NAMES[order]}</text>

  <text x="600" y="380" text-anchor="middle" font-family="${SANS}" font-weight="700"
        font-size="20" letter-spacing="3" fill="${GOLD}">PRAYER WALL &#183; CALENDAR${order === "elders" ? " &#183; LETTERS" : ""}</text>

  <rect x="0" y="567" width="${W}" height="3" fill="${RED}" />
  <text x="600" y="600" text-anchor="middle" font-family="${SANS}" font-weight="700"
        font-size="16" letter-spacing="3" fill="${SMOKE}">RIOTEXAS.${DOMAINS[order].toUpperCase()}</text>
</svg>
`;
}

const ORDERS = ["elders", "deacons", "local-pastors"];

for (const order of ORDERS) {
  mkdirSync(`public/${order}/riotexas`, { recursive: true });
  await sharp(Buffer.from(landingSvg(order))).png().toFile(`public/${order}/og-landing.png`);
  await sharp(Buffer.from(riotexasSvg(order))).png().toFile(`public/${order}/riotexas/og-riotexas.png`);
  console.log(`Generated public/${order}/og-landing.png and public/${order}/riotexas/og-riotexas.png`);
}
