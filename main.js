(() => {
  // -----------------------------
  // Small helpers
  // -----------------------------
  const $ = (id) => document.getElementById(id);

  // Try to find common elements even if ids differ a bit
  const host =
    $("svgHost") ||
    $("content") ||
    document.querySelector(".content-container") ||
    document.body;

  const q = $("q") || document.querySelector('input[type="search"]');
  const pickBtn = $("pickBtn") || document.querySelector('[data-action="pick"]');
  const clearBtn = $("clearBtn") || document.querySelector('[data-action="clear"]');
  const btnEn = $("btnEn") || document.querySelector('[data-lang="en"]');
  const btnZh = $("btnZh") || document.querySelector('[data-lang="zh"]');

  const statusEl = $("status") || document.querySelector(".status");
  const selNameEl = $("selName") || document.querySelector(".selName");
  const selSideEl = $("selSide") || document.querySelector(".selSide");

  const matchListEl = $("matchList") || $("list") || document.querySelector(".matchList");
  const allListEl = $("allList") || document.querySelector(".allList");

  const auditEl = $("audit") || document.querySelector(".audit");

  function die(msg) {
    if (host) host.innerHTML = `<div style="padding:12px;font-family:system-ui;color:#b00020">JS init failed: ${msg}</div>`;
    throw new Error(msg);
  }

  if (!q) die("Missing search input (#q)");
  if (!pickBtn) die("Missing Pick button (#pickBtn)");
  if (!clearBtn) die("Missing Clear button (#clearBtn)");
  if (!btnEn || !btnZh) die("Missing language buttons (#btnEn/#btnZh)");
  if (!statusEl || !selNameEl || !selSideEl) die("Missing selection UI (#status/#selName/#selSide)");
  if (!matchListEl) die("Missing match list (#matchList or #list)");
  if (!allListEl) die("Missing all list (#allList)");

  // -----------------------------
  // i18n
  // -----------------------------
  let lang = "en"; // default EN as requested
  let svgEl = null;

  const UI = {
    en: {
      none: "(none)",
      sideNA: "—",
      left: "Left",
      right: "Right",
      both: "Both",
      statusNone: "No selection",
      statusSelected: (name) => `Selected: ${name}`,
      noMatches: "No matches",
      auditTitle: "SVG Audit",
    },
    zh: {
      none: "（无）",
      sideNA: "—",
      left: "左",
      right: "右",
      both: "左右",
      statusNone: "还没选区域",
      statusSelected: (name) => `已选择：${name}`,
      noMatches: "没有匹配项",
      auditTitle: "SVG审计",
    },
  };
  const t = () => UI[lang];

  // Your bilingual dictionary (you can expand anytime)
  // key = region key (derived from path class)
  const I18N = {
    heart: { en: "Heart", zh: "心" },
    "head-brain": { en: "Head/Brain", zh: "头/脑" },
    "teeth-sinuses": { en: "Teeth/Sinuses", zh: "牙/鼻窦" },
    eye: { en: "Eye", zh: "眼" },
    ear: { en: "Ear", zh: "耳" },
    trapezius: { en: "Trapezius", zh: "斜方肌" },
    armpit: { en: "Armpit", zh: "腋窝" },
    "lung-chest": { en: "Lung/Chest", zh: "肺/胸" },
    arm: { en: "Arm", zh: "臂" },
    shoulder: { en: "Shoulder", zh: "肩" },
    liver: { en: "Liver", zh: "肝" },
    "gall-bladder": { en: "Gall Bladder", zh: "胆" },
    spleen: { en: "Spleen", zh: "脾" },
    kidney: { en: "Kidney", zh: "肾" },
    elbow: { en: "Elbow", zh: "肘" },
    leg: { en: "Leg", zh: "腿" },
    "ascending-colon": { en: "Ascending Colon", zh: "升结肠" },
    "descending-colon": { en: "Descending Colon", zh: "降结肠" },
    appendix: { en: "Appendix", zh: "阑尾" },
    "small-intestine": { en: "Small Intestine", zh: "小肠" },
    "sciatic-nerve": { en: "Sciatic Nerve", zh: "坐骨神经" },
    "lower-back": { en: "Lower Back", zh: "下背" },
    rectum: { en: "Rectum", zh: "直肠" },
    bladder: { en: "Bladder", zh: "膀胱" },
    ureter: { en: "Ureter", zh: "输尿管" },
    duodenum: { en: "Duodenum", zh: "十二指肠" },
    pancreas: { en: "Pancreas", zh: "胰" },
    adrenals: { en: "Adrenals", zh: "肾上腺" },
    stomach: { en: "Stomach", zh: "胃" },
    diaphragm: { en: "Diaphragm", zh: "横膈膜" },
    "solar-plexus": { en: "Solar Plexus", zh: "太阳神经丛" },
    esophagus: { en: "Esophagus", zh: "食道" },
    thyroid: { en: "Thyroid", zh: "甲状腺" },
    neck: { en: "Neck", zh: "颈" },
    nose: { en: "Nose", zh: "鼻" },
    throat: { en: "Throat", zh: "咽喉" },
    pituitary: { en: "Pituitary", zh: "垂体" },
    "cervical-spine": { en: "Cervical Spine", zh: "颈椎" },
    // chart sometimes calls these:
    sacrum: { en: "Sacrum", zh: "骶骨" },
    "lumbar-spine": { en: "Lumbar Spine", zh: "腰椎" },
  };

  function norm(s) {
    return (s || "").toString().trim().toLowerCase();
  }

  function displayName(key) {
    const d = I18N[key];
    if (!d) return key;
    return lang === "zh" ? (d.zh || d.en || key) : (d.en || d.zh || key);
  }

  // -----------------------------
  // SVG parsing helpers (robust)
  // -----------------------------
  const isGarbageClass = (c) =>
    !c ||
    c === "text-group" ||
    c === "feet" ||
    c === "red" ||
    /^cls-\d+$/i.test(c);

  // Extract region key from a path's classList:
  // choose the first "meaningful" class that isn't cls-* / text-group etc.
  function getRegionKeyFromPath(path) {
    const classes = (path.getAttribute("class") || "").split(/\s+/).filter(Boolean);
    for (const c of classes) {
      if (!isGarbageClass(c)) return c;
    }
    return null;
  }

  function getTranslateX(el) {
    const tr = el.getAttribute("transform") || "";
    const m = tr.match(/translate\(\s*([-\d.]+)(?:[\s,]+([-\d.]+))?\s*\)/i);
    if (!m) return 0;
    const tx = parseFloat(m[1]);
    return Number.isFinite(tx) ? tx : 0;
  }

  // stable X: first "M x" from path d + translateX
  function getStartXFromD(path) {
    const d = path.getAttribute("d") || "";
    const m = d.match(/[Mm]\s*([-\d.]+)/);
    if (!m) return null;
    const x = parseFloat(m[1]);
    if (!Number.isFinite(x)) return null;
    return x + getTranslateX(path);
  }

  function regionSide(paths) {
    if (!svgEl || !paths?.length) return t().sideNA;
    const vb = svgEl.viewBox?.baseVal;
    if (!vb) return t().both;
    const mid = vb.x + vb.width / 2;

    let L = 0, R = 0;
    for (const p of paths) {
      const x = getStartXFromD(p);
      if (x == null) continue;
      if (x < mid) L++;
      else R++;
    }
    if (L && R) return t().both;
    if (L) return t().left;
    if (R) return t().right;
    return t().sideNA;
  }

  // -----------------------------
  // App state
  // -----------------------------
  const regions = new Map(); // key -> { paths:[], labelGroup:null }
  let selectedKey = null;

  function clearHighlights() {
    if (!svgEl) return;
    svgEl.querySelectorAll("path.selected").forEach((p) => p.classList.remove("selected"));
    svgEl.querySelectorAll("g.label-selected").forEach((g) => g.classList.remove("label-selected"));
  }

  function setSelected(key) {
    selectedKey = key;
    clearHighlights();

    if (!key || !regions.has(key)) {
      statusEl.textContent = t().statusNone;
      selNameEl.textContent = t().none;
      selSideEl.textContent = t().sideNA;
      renderMatchList();
      renderAllList();
      return;
    }

    const rec = regions.get(key);
    rec.paths.forEach((p) => p.classList.add("selected"));
    if (rec.labelGroup) rec.labelGroup.classList.add("label-selected");

    const name = displayName(key);
    statusEl.textContent = t().statusSelected(name);
    selNameEl.textContent = name;
    selSideEl.textContent = regionSide(rec.paths);

    renderMatchList();
    renderAllList();
  }

  function makeRow(key, rec) {
    const div = document.createElement("div");
    div.className = "item" + (key === selectedKey ? " active" : "");

    const left = document.createElement("div");
    left.className = "name";
    left.textContent = displayName(key);

    const right = document.createElement("div");
    right.className = "meta";
    right.textContent = regionSide(rec.paths);

    div.appendChild(left);
    div.appendChild(right);

    div.addEventListener("click", () => setSelected(key));
    return div;
  }

  function getMatches(query) {
    const qq = norm(query);
    if (!qq) return [];

    const arr = [];
    for (const [key, rec] of regions.entries()) {
      const en = norm(I18N[key]?.en || key);
      const zh = norm(I18N[key]?.zh || "");
      const dn = norm(displayName(key));

      // prefix first, then includes
      let score = 999;
      if (dn.startsWith(qq)) score = 0;
      else if (en.startsWith(qq) || zh.startsWith(qq)) score = 1;
      else if (dn.includes(qq) || en.includes(qq) || zh.includes(qq)) score = 2;
      else continue;

      arr.push({ key, rec, score });
    }
    arr.sort((a, b) => a.score - b.score || displayName(a.key).localeCompare(displayName(b.key)));
    return arr;
  }

  function renderMatchList() {
    const items = getMatches(q.value);
    matchListEl.innerHTML = "";

    if (!items.length) {
      const hint = document.createElement("div");
      hint.className = "hint";
      hint.textContent = t().noMatches;
      matchListEl.appendChild(hint);
      return;
    }

    for (const it of items.slice(0, 200)) {
      matchListEl.appendChild(makeRow(it.key, it.rec));
    }
  }

  function renderAllList() {
    const arr = Array.from(regions.entries())
      .map(([key, rec]) => ({ key, rec }))
      .sort((a, b) => displayName(a.key).localeCompare(displayName(b.key)));

    allListEl.innerHTML = "";
    for (const it of arr) allListEl.appendChild(makeRow(it.key, it.rec));
  }

  // -----------------------------
  // SVG audit (tells you what's wrong in SVG)
  // -----------------------------
  function runAudit() {
    if (!svgEl) return;

    const vb = svgEl.viewBox?.baseVal;
    const mid = vb ? vb.x + vb.width / 2 : null;

    const report = [];
    // For each region, list how many paths are on L/R by d+translate
    for (const [key, rec] of regions.entries()) {
      let L = 0, R = 0, U = 0;
      for (const p of rec.paths) {
        const x = getStartXFromD(p);
        if (x == null || mid == null) {
          U++;
          continue;
        }
        if (x < mid) L++;
        else R++;
      }
      report.push({ key, L, R, U, count: rec.paths.length });
    }

    // Highlight suspicious ones:
    // - expected to be both (many organ areas) but only on one side
    // We don't "force both" because that would lie; we show it so you can fix SVG classes.
    const suspicious = report
      .filter((r) => (r.L > 0 && r.R === 0) || (r.R > 0 && r.L === 0))
      .sort((a, b) => (b.count - a.count) || a.key.localeCompare(b.key));

    // Render (optional)
    if (auditEl) {
      auditEl.innerHTML = "";
      const title = document.createElement("div");
      title.style.fontWeight = "600";
      title.style.marginBottom = "6px";
      title.textContent = `${t().auditTitle}: suspicious single-side regions = ${suspicious.length}`;
      auditEl.appendChild(title);

      const pre = document.createElement("pre");
      pre.style.whiteSpace = "pre-wrap";
      pre.style.fontSize = "12px";
      pre.style.margin = "0";
      pre.textContent = suspicious
        .slice(0, 50)
        .map((r) => `${r.key.padEnd(18)}  L=${r.L} R=${r.R}  total=${r.count}`)
        .join("\n");
      auditEl.appendChild(pre);
    }

    // Also dump to console so you can see it even if no audit panel exists
    console.log("[SVG AUDIT] suspicious single-side regions:", suspicious);
  }

  // -----------------------------
  // Find label groups (optional)
  // -----------------------------
  function findLabelGroupForKey(key) {
    // Many SVGs use g id="eye" etc
    return svgEl.querySelector(`g#${CSS.escape(key)}`) || svgEl.querySelector(`g.text-group.${CSS.escape(key)}`);
  }

  // -----------------------------
  // Wire SVG interactions
  // -----------------------------
  function wireSVG() {
    if (!svgEl) return;

    // Collect paths (we only want actual regions; ignore big outline cls-40)
    const paths = Array.from(svgEl.querySelectorAll("#Feet path, path"))
      .filter((p) => p.tagName.toLowerCase() === "path")
      .filter((p) => !/\bcls-40\b/i.test(p.getAttribute("class") || ""));

    // Build regions map
    regions.clear();
    for (const p of paths) {
      const key = getRegionKeyFromPath(p);
      if (!key) continue;

      if (!regions.has(key)) regions.set(key, { paths: [], labelGroup: null });
      regions.get(key).paths.push(p);

      // click to select
      p.style.cursor = "pointer";
      p.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        setSelected(key);
      });
    }

    // attach label groups
    for (const [key, rec] of regions.entries()) {
      rec.labelGroup = findLabelGroupForKey(key);
    }

    // click empty space clears
    svgEl.addEventListener("click", () => setSelected(null));

    // initial render
    renderAllList();
    renderMatchList();
    setSelected(null);

    // audit
    runAudit();
  }

  // -----------------------------
  // Load SVG
  // -----------------------------
  async function loadSVG() {
    try {
      const res = await fetch("./foot-reflex.svg", { cache: "no-store" });
      if (!res.ok) throw new Error(`SVG fetch failed: HTTP ${res.status}`);

      host.innerHTML = await res.text();
      svgEl = host.querySelector("svg");
      if (!svgEl) throw new Error("SVG element not found in fetched file");

      // Ensure our highlight class works even if SVG paths had fills etc.
      // (Fill removal should be handled in CSS; we only do selection class here.)
      svgEl.classList.add("feet");

      wireSVG();
    } catch (err) {
      host.innerHTML = `<div style="padding:12px;font-family:system-ui;color:#b00020">Load failed: ${String(err.message || err)}</div>`;
    }
  }

  // -----------------------------
  // UI events
  // -----------------------------
  q.addEventListener("input", () => renderMatchList());

  pickBtn.addEventListener("click", () => {
    const matches = getMatches(q.value);
    if (!matches.length) return;
    setSelected(matches[0].key);
    q.value = displayName(matches[0].key);
    renderMatchList();
  });

  clearBtn.addEventListener("click", () => {
    q.value = "";
    setSelected(null);
    renderMatchList();
  });

  btnEn.addEventListener("click", () => {
    lang = "en";
    renderAllList();
    renderMatchList();
    setSelected(selectedKey);
    runAudit();
  });

  btnZh.addEventListener("click", () => {
    lang = "zh";
    renderAllList();
    renderMatchList();
    setSelected(selectedKey);
    runAudit();
  });

  // -----------------------------
  // Inject minimal CSS for highlight (淡绿色)
  // (If you already set in style.css, this won't hurt)
  // -----------------------------
  const style = document.createElement("style");
  style.textContent = `
    /* selected region: light green */
    svg.feet path.selected {
      fill: rgba(120, 200, 120, 0.35) !important;
      stroke: rgba(80, 160, 80, 0.9) !important;
      stroke-width: 1.5 !important;
    }
    /* make sure non-selected remains visible even if SVG has black fills */
    svg.feet path {
      transition: fill 120ms ease, stroke 120ms ease;
    }
    /* list items */
    .item { display:flex; justify-content:space-between; gap:10px; padding:6px 8px; border-radius:8px; cursor:pointer; }
    .item:hover { background: rgba(0,0,0,0.05); }
    .item.active { outline: 2px solid rgba(120,200,120,0.55); }
    .name { flex:1; }
    .meta { opacity:0.75; font-size:12px; white-space:nowrap; }
    .hint { opacity:0.7; padding:8px; font-size:12px; }
  `;
  document.head.appendChild(style);

  // Go
  loadSVG();
})();



