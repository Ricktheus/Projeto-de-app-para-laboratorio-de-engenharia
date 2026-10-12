// Regenerates src/components/icons/icon-data.ts (the Phosphor subset).
// Usage (from apps/web): add the icon name below, then
//   pnpm dlx --package @phosphor-icons/react@2 node scripts/gen-icons.mjs \
//     src/components/icons/icon-data.ts
// or install @phosphor-icons/react temporarily and run `node scripts/gen-icons.mjs <out>`.
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const PKG = pathToFileURL(require.resolve('@phosphor-icons/react/package.json'));
const names = [
  'ArrowRight',
  'ArrowsClockwise',
  'Briefcase',
  'Buildings',
  'CalendarBlank',
  'CalendarCheck',
  'ChartBar',
  'ChartLineUp',
  'CheckCircle',
  'ClipboardText',
  'Clock',
  'Cylinder',
  'DeviceMobile',
  'DownloadSimple',
  'FilePdf',
  'FileText',
  'Flask',
  'Gauge',
  'Hammer',
  'Info',
  'List',
  'MagnifyingGlass',
  'MicrosoftExcelLogo',
  'PenNib',
  'PencilSimple',
  'Plus',
  'QrCode',
  'Scales',
  'SealCheck',
  'SignOut',
  'Stack',
  'Timer',
  'Truck',
  'UsersThree',
  'WarningCircle',
  'X',
  'XCircle',
];
const WEIGHTS = ['regular', 'bold', 'fill'];
const out = {};
function walk(el, acc) {
  if (el == null || typeof el !== 'object') return;
  if (Array.isArray(el)) {
    el.forEach((e) => walk(e, acc));
    return;
  }
  const { type, props } = el;
  if (typeof type === 'string') {
    const attrs = {};
    for (const [k, v] of Object.entries(props)) if (k !== 'children') attrs[k] = v;
    acc.push([type, attrs]);
  }
  walk(props?.children, acc);
}
for (const n of names) {
  const mod = await import(new URL(`dist/defs/${n}.es.js`, PKG).href);
  const map = Object.values(mod).find((v) => v instanceof Map);
  out[n] = {};
  for (const w of WEIGHTS) {
    const acc = [];
    walk(map.get(w), acc);
    out[n][w] = acc;
  }
}
const header = `/**
 * Generated subset of Phosphor Icons (MIT) — only the icons and the three
 * weights (regular, bold, fill) this app uses, instead of shipping all six
 * weights per icon (~108 kB → a few kB). Regenerate when adding an icon.
 */
`;
writeFileSync(
  process.argv[2],
  header + 'export const ICON_DATA = ' + JSON.stringify(out) + ' as const;\n',
);
console.log('ok', Object.keys(out).length);
