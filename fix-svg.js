// fix-svg.js
// Usage:
//   node fix-svg.js foot-reflex.svg foot-reflex.fixed.svg
//
// What it does:
// - Finds the two foot groups under <g id="Feet"> (left + right)
// - Aligns their <path> lists by index (excluding the big outline cls-40)
// - If right path has missing/cls-* junk class, copy a "meaningful" class from left path

const fs = require("fs");

const inFile = process.argv[2] || "foot-reflex.svg";
const outFile = process.argv[3] || "foot-reflex.fixed.svg";

const svg = fs.readFileSync(inFile, "utf8");

function pickMeaningfulClass(classAttr) {
  const cls = (classAttr || "").trim();
  if (!cls) return null;
  const parts = cls.split(/\s+/).filter(Boolean);
  for (const c of parts) {
    if (c === "text-group") continue;
    if (c === "feet") continue;
    if (c === "red") continue;
    if (/^cls-\d+$/i.test(c)) continue;
    return c;
  }
  return null;
}

function isBadRightClass(classAttr) {
  const cls = (classAttr || "").trim();
  if (!cls) return true;
  // If it's only cls-* and/or red, treat as bad
  const parts = cls.split(/\s+/).filter(Boolean);
  const meaningful = parts.some(
    (c) => !(c === "text-group" || c === "feet" || c === "red" || /^cls-\d+$/i.test(c))
  );
  return !meaningful;
}

// Very lightweight split: locate <g id="Feet"> ... </g> then grab its first two direct <g> children blocks.
// This avoids needing extra libs.
function extractFeetGroupBlock(text) {
  const m = text.match(/<g[^>]*id=["']Feet["'][^>]*>[\s\S]*?<\/g>/i);
  if (!m) throw new Error('Cannot find <g id="Feet">...</g> block');
  return { block: m[0], start: m.index, end: m.index + m[0].length };
}

function extractDirectChildGs(feetBlock) {
  // We assume structure: <g id="Feet"><g>...left...</g><g>...right...</g>...</g>
  // We'll take the first two <g>...</g> that appear *inside* this block.
  const gs = [];
  const re = /<g\b[^>]*>[\s\S]*?<\/g>/gi;
  let match;
  while ((match = re.exec(feetBlock))) {
    gs.push({ text: match[0], idx: match.index });
    if (gs.length >= 2) break;
  }
  if (gs.length < 2) throw new Error("Cannot find two foot <g> groups inside Feet");
  return gs;
}

function listPaths(groupText) {
  // Capture each <path .../> (self-closing) and <path ...>...</path> (just in case)
  const paths = [];
  const re = /<path\b[\s\S]*?(?:\/>|<\/path>)/gi;
  let m;
  while ((m = re.exec(groupText))) {
    const tag = m[0];
    // Skip giant outline cls-40 if present
    const clsMatch = tag.match(/\bclass=["']([^"']*)["']/i);
    const cls = clsMatch ? clsMatch[1] : "";
    if (/\bcls-40\b/i.test(cls)) continue;
    paths.push({ tag, index: m.index });
  }
  return paths;
}

function getClassAttr(pathTag) {
  const m = pathTag.match(/\bclass=["']([^"']*)["']/i);
  return m ? m[1] : "";
}

function setClassAttr(pathTag, newClass) {
  if (/\bclass=["']/.test(pathTag)) {
    return pathTag.replace(/\bclass=["'][^"']*["']/i, `class="${newClass}"`);
  }
  // insert class before first space close
  return pathTag.replace(/^<path\b/i, `<path class="${newClass}"`);
}

const { block: feetBlock, start, end } = extractFeetGroupBlock(svg);
const [gLeft, gRight] = extractDirectChildGs(feetBlock);

const leftPaths = listPaths(gLeft.text);
const rightPaths = listPaths(gRight.text);

const n = Math.min(leftPaths.length, rightPaths.length);
let fixedRight = gRight.text;
let changed = 0;
let logs = [];

for (let i = 0; i < n; i++) {
  const lp = leftPaths[i].tag;
  const rp = rightPaths[i].tag;

  const leftKey = pickMeaningfulClass(getClassAttr(lp));
  if (!leftKey) continue;

  const rightClass = getClassAttr(rp);
  if (!isBadRightClass(rightClass)) continue;

  // Keep any existing non-meaningful classes (like cls-xx) if you want; but simplest: set to leftKey
  const newClass = leftKey;
  const rpFixed = setClassAttr(rp, newClass);

  // Replace only this exact rp occurrence in fixedRight (first occurrence after last replace)
  const pos = fixedRight.indexOf(rp);
  if (pos !== -1) {
    fixedRight = fixedRight.slice(0, pos) + rpFixed + fixedRight.slice(pos + rp.length);
    changed++;
    logs.push(`Index ${i}: right class "${rightClass || "(missing)"}" -> "${newClass}"`);
  }
}

const newFeetBlock = feetBlock.replace(gRight.text, fixedRight);
const outSvg = svg.slice(0, start) + newFeetBlock + svg.slice(end);

fs.writeFileSync(outFile, outSvg, "utf8");

console.log(`Done. right paths fixed: ${changed}`);
console.log(logs.slice(0, 30).join("\n"));
if (logs.length > 30) console.log(`... (${logs.length - 30} more)`);
