// fix-svg.js
// Usage:
//   node fix-svg.js foot-reflex.svg foot-reflex.fixed.svg
//
// What it does:
// - Finds the two foot groups under <g id="Feet"> (left + right)
// - Aligns their <path> lists by index (excluding the big outline cls-40)
// - If right path has missing/cls-* junk class, copy a "meaningful" class from left path

