(() => {
  const $ = (id) => document.getElementById(id);

  const host = $("svgHost");
  const q = $("q");
  const clearBtn = $("clearBtn");
  const pickBtn = $("pickBtn");
  const btnEn = $("btnEn");
  const btnZh = $("btnZh");
  const suggestEl = $("suggest");

  const statusEl = $("status");
  const matchListEl = $("matchList");
  const allListEl = $("allList");

  const selNameEl = $("selName");
  const selSideEl = $("selSide");

  const titleText = $("titleText");
  const loadingText = $("loadingText");
  const sourceText = $("sourceText");

  const panelSelTitle = $("panelSelTitle");
  const panelMatchTitle = $("panelMatchTitle");
  const panelAllTitle = $("panelAllTitle");
  const hintText = $("hintText");
  const allHintText = $("allHintText");
  const kName = $("kName");
  const kSide = $("kSide");

  function must(el, name) {
    if (!el) throw new Error(`Missing element #${name} (index.html not updated?)`);
    return el;
  }

  try {
    must(host, "svgHost");
    must(q, "q");
    must(clearBtn, "clearBtn");
    must(pickBtn, "pickBtn");
    must(btnEn, "btnEn");
    must(btnZh, "btnZh");
    must(suggestEl, "suggest");
    must(statusEl, "status");
    must(matchListEl, "matchList");
    must(allListEl, "allList");
    must(selNameEl, "selName");
    must(selSideEl, "selSide");
  } catch (e) {
    if (host) host.innerHTML = `<div class="loading">JS init failed: ${String(e.message || e)}</div>`;
    return;
  }

  let svgEl = null;
  const regions = new Map(); // key -> { paths:[], labelGroup, en, zh }
  let selectedKey = null;
  let lang = "en";

  const I18N = {
    heart: { zh: "心", en: "Heart" },
    "head-brain": { zh: "头/脑", en: "Head/Brain" },
    "teeth-sinuses": { zh: "牙/鼻窦", en: "Teeth/Sinuses" },
    eye: { zh: "眼", en: "Eye" },
    ear: { zh: "耳", en: "Ear" },
    trapezius: { zh: "斜方肌", en: "Trapezius" },
    armpit: { zh: "腋窝", en: "Armpit" },
    "lung-chest": { zh: "肺/胸", en: "Lung/Chest" },
    arm: { zh: "臂", en: "Arm" },
    shoulder: { zh: "肩", en: "Shoulder" },
    liver: { zh: "肝", en: "Liver" },
    "gall-bladder": { zh: "胆", en: "Gall Bladder" },
    spleen: { zh: "脾", en: "Spleen" },
    kidney: { zh: "肾", en: "Kidney" },
    elbow: { zh: "肘", en: "Elbow" },
    leg: { zh: "腿", en: "Leg" },
    "ascending-colon": { zh: "升结肠", en: "Ascending Colon" },
    "descending-colon": { zh: "降结肠", en: "Descending Colon" },
    appendix: { zh: "阑尾", en: "Appendix" },
    "small-intestine": { zh: "小肠", en: "Small Intestine" },
    "sciatic-nerve": { zh: "坐骨神经", en: "Sciatic Nerve" },
    "lower-back": { zh: "下背", en: "Lower Back" },
    rectum: { zh: "直肠", en: "Rectum" },
    bladder: { zh: "膀胱", en: "Bladder" },
    ureter: { zh: "输尿管", en: "Ureter" },
    duodenum: { zh: "十二指肠", en: "Duodenum" },
    pancreas: { zh: "胰", en: "Pancreas" },
    adrenals: { zh: "肾上腺", en: "Adrenals" },
    stomach: { zh: "胃", en: "Stomach" },
    diaphragm: { zh: "横膈膜", en: "Diaphragm" },
    "solar-plexus": { zh: "太阳神经丛", en: "Solar Plexus" },
    esophagus: { zh: "食道", en: "Esophagus" },
    thyroid: { zh: "甲状腺", en: "Thyroid" },
    neck: { zh: "颈", en: "Neck" },
    nose: { zh: "鼻", en: "Nose" },
    throat: { zh: "咽喉", en: "Throat" },
    pituitary: { zh: "垂体", en: "Pituitary" }
  };

  const TEXT_MAP = {
    "Sacrum": { zh: "骶骨", en: "Sacrum" },
    "Lumbar Spine": { zh: "腰椎", en: "Lumbar Spine" },
    "Cervical Spine": { zh: "颈椎", en: "Cervical Spine" },
    "Lower Back": { zh: "下背", en: "Lower Back" }
  };

  const UI = {
    zh: {
      title: "足底反射区",
      placeholder: "搜索：胃 / stomach / pancreas…",
      pick: "选择",
      clear: "清空",
      statusNone: "还没选区域",
      statusSelected: (name) => `已选择：${name}`,
      panelSel: "当前选择",
      panelMatch: "匹配结果",
      panelAll: "全部器官",
      hint: "输入几个字/字母会出现候选；也可以点匹配列表或直接点脚上区域。",
      allHint: "直接点列表项高亮。",
      kName: "名称：",
      kSide: "区域：",
      none: "（无）",
      noMatch: "没有匹配项",
      sideLeft: "左",
      sideRight: "右",
      sideBoth: "左右",
      sideNA: "—",
      loading: "正在加载图…",
      source: "Source: naturallivingideas.com"
    },
    en: {
      title: "Foot Reflexology",
      placeholder: "Search: stomach / pancreas / duodenum…",
      pick: "Pick",
      clear: "Clear",
      statusNone: "No selection",
      statusSelected: (name) => `Selected: ${name}`,
      panelSel: "Selection",
      panelMatch: "Matches",
      panelAll: "All Regions",
      hint: "Type for suggestions. Or click match list / foot region.",
      allHint: "Click any item to highlight.",
      kName: "Name: ",
      kSide: "Side: ",
      none: "(none)",
      noMatch: "No matches",
      sideLeft: "Left",
      sideRight: "Right",
      sideBoth: "Both",
      sideNA: "—",
      loading: "Loading…",
      source: "Source: naturallivingideas.com"
    }
  };

  const t = () => UI[lang];
  const norm = (s) => (s || "").toString().trim().toLowerCase();
  const isGarbageClass = (c) => c === "text-group" || /^cls-\d+$/i.test(c) || c === "red";
  const pickRegionKeyFromPath = (p) => Array.from(p.classList).find(c => !isGarbageClass(c)) || null;

  function getDisplayName(key, rec) {
    const dict = I18N[key];
    if (lang === "zh") return dict?.zh || rec.zh || dict?.en || rec.en || key;
    return dict?.en || rec.en || dict?.zh || rec.zh || key;
  }

  function computeSide(paths) {
    if (!svgEl || !paths?.length) return t().sideNA;
    const vb = svgEl.viewBox?.baseVal;
    if (!vb) return t().sideBoth;

    const mid = vb.x + vb.width / 2;
    let left = 0, right = 0;
    for (const p of paths) {
      try {
        const b = p.getBBox();
        const cx = b.x + b.width / 2;
        if (cx < mid) left++;
        else if (cx > mid) right++;
      } catch {}
    }
    if (left && right) return t().sideBoth;
    if (left) return t().sideLeft;
    if (right) return t().sideRight;
    return t().sideNA;
  }

  function clearAllHighlights() {
    if (!svgEl) return;
    svgEl.querySelectorAll("#Feet path.selected").forEach(p => p.classList.remove("selected"));
    svgEl.querySelectorAll("#Feet path.hovered").forEach(p => p.classList.remove("hovered"));
    svgEl.querySelectorAll("g.label-selected").forEach(g => g.classList.remove("label-selected"));
  }

  function setSelected(key) {
    selectedKey = key;
    clearAllHighlights();

    if (!key || !regions.has(key)) {
      statusEl.textContent = t().statusNone;
      selNameEl.textContent = t().none;
      selSideEl.textContent = t().sideNA;
      renderMatchList();
      renderAllList();
      return;
    }

    const rec = regions.get(key);
    rec.paths.forEach(p => p.classList.add("selected"));
    if (rec.labelGroup) rec.labelGroup.classList.add("label-selected");

    const name = getDisplayName(key, rec);
    statusEl.textContent = t().statusSelected(name);
    selNameEl.textContent = name;
    selSideEl.textContent = computeSide(rec.paths);

    renderMatchList();
    renderAllList();
  }

  function getMatches(query, limit = 200) {
    const qn = norm(query);
    if (!qn) return [];
    const out = [];
    for (const [key, rec] of regions.entries()) {
      const dn = norm(getDisplayName(key, rec));
      const en = norm(rec.en);
      const zh = norm(rec.zh);
      const kk = norm(key);

      let score = 999;
      if (dn.startsWith(qn)) score = 0;
      else if (en.startsWith(qn) || zh.startsWith(qn)) score = 1;
      else if (kk.startsWith(qn)) score = 2;
      else if (dn.includes(qn) || en.includes(qn) || zh.includes(qn) || kk.includes(qn)) score = 3;
      else continue;

      out.push({ key, rec, score });
    }
    out.sort((a, b) => a.score - b.score || getDisplayName(a.key, a.rec).localeCompare(getDisplayName(b.key, b.rec)));
    return out.slice(0, limit);
  }

  function hideSuggest() {
    suggestEl.hidden = true;
    suggestEl.innerHTML = "";
  }

  function showSuggest(items) {
    suggestEl.innerHTML = "";
    if (!items.length) return hideSuggest();

    for (const { key, rec } of items) {
      const row = document.createElement("div");
      row.className = "suggestItem";

      const a = document.createElement("div");
      a.textContent = getDisplayName(key, rec);

      const b = document.createElement("div");
      b.className = "b";
      const other = (lang === "zh")
        ? (I18N[key]?.en || rec.en || key)
        : (I18N[key]?.zh || rec.zh || key);
      b.textContent = other;

      row.appendChild(a);
      row.appendChild(b);

      row.addEventListener("mousedown", (e) => {
        e.preventDefault();
        setSelected(key);
        q.value = getDisplayName(key, rec);
        hideSuggest();
      });

      suggestEl.appendChild(row);
    }
    suggestEl.hidden = false;
  }

  function renderMatchList() {
    const items = getMatches(q.value, 200);
    matchListEl.innerHTML = "";

    if (!items.length) {
      const div = document.createElement("div");
      div.className = "hint";
      div.textContent = t().noMatch;
      matchListEl.appendChild(div);
      return;
    }

    for (const { key, rec } of items) {
      matchListEl.appendChild(makeRow(key, rec));
    }
  }

  function renderAllList() {
    const arr = Array.from(regions.entries())
      .map(([key, rec]) => ({ key, rec }))
      .sort((a, b) => getDisplayName(a.key, a.rec).localeCompare(getDisplayName(b.key, b.rec)));

    allListEl.innerHTML = "";
    for (const { key, rec } of arr) {
      allListEl.appendChild(makeRow(key, rec));
    }
  }

  function makeRow(key, rec) {
    const div = document.createElement("div");
    div.className = "item" + (key === selectedKey ? " active" : "");

    const left = document.createElement("div");
    left.className = "name";
    left.textContent = getDisplayName(key, rec);

    const right = document.createElement("div");
    right.className = "meta";
    right.textContent = computeSide(rec.paths);

    div.appendChild(left);
    div.appendChild(right);

    div.addEventListener("click", () => setSelected(key));
    return div;
  }

  function applyLangToSVGTexts() {
    if (!svgEl) return;
    const groups = Array.from(svgEl.querySelectorAll("g.text-group"));
    for (const g of groups) {
      let key = g.getAttribute("id") || "";
      if (!key) {
        const cls = Array.from(g.classList).find(c => c !== "text-group");
        key = cls || "";
      }
      const tx = g.querySelector("text");
      if (!key || !tx) continue;

      if (!tx.dataset.en) tx.dataset.en = tx.textContent.trim();
      const en0 = tx.dataset.en;

      const mapByText = TEXT_MAP[en0];
      if (mapByText) {
        tx.textContent = (lang === "zh") ? mapByText.zh : mapByText.en;
        continue;
      }

      const dict = I18N[key];
      if (!dict) {
        tx.textContent = en0;
      } else {
        tx.textContent = (lang === "zh") ? dict.zh : (dict.en || en0);
      }
    }
  }

  function applyLangToUI() {
    titleText.textContent = t().title;
    document.title = t().title;
    q.placeholder = t().placeholder;
    pickBtn.textContent = t().pick;
    clearBtn.textContent = t().clear;
    loadingText.textContent = t().loading;
    sourceText.textContent = t().source;

    panelSelTitle.textContent = t().panelSel;
    panelMatchTitle.textContent = t().panelMatch;
    panelAllTitle.textContent = t().panelAll;
    hintText.textContent = t().hint;
    allHintText.textContent = t().allHint;
    kName.textContent = t().kName;
    kSide.textContent = t().kSide;

    applyLangToSVGTexts();

    // 列表重新渲染（显示语言要变）
    renderMatchList();
    renderAllList();

    // 选中栏刷新
    if (!selectedKey) {
      statusEl.textContent = t().statusNone;
      selNameEl.textContent = t().none;
      selSideEl.textContent = t().sideNA;
    } else {
      const rec = regions.get(selectedKey);
      const name = rec ? getDisplayName(selectedKey, rec) : t().none;
      statusEl.textContent = t().statusSelected(name);
      selNameEl.textContent = name;
      selSideEl.textContent = rec ? computeSide(rec.paths) : t().sideNA;
    }

    showSuggest(getMatches(q.value, 8));
  }

  function getLabelGroupForKey(key) {
    return svgEl.querySelector(`g#${CSS.escape(key)}`) || svgEl.querySelector(`g.text-group.${CSS.escape(key)}`);
  }

  function getEnglishFromSVGLabel(labelGroup, fallbackKey) {
    const tx = labelGroup?.querySelector?.("text");
    return tx?.textContent?.trim() || fallbackKey;
  }

  function titleCaseFromKey(key) {
    return key.replace(/_/g, "-").split("-").filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }

  function wireSVG() {
    const paths = Array.from(svgEl.querySelectorAll("#Feet path")).filter(p => !p.classList.contains("cls-40"));

    for (const p of paths) {
      const key = pickRegionKeyFromPath(p);
      if (!key) continue;

      if (!regions.has(key)) regions.set(key, { paths: [], labelGroup: null, en: "", zh: "" });
      regions.get(key).paths.push(p);

      p.addEventListener("mouseenter", () => p.classList.add("hovered"));
      p.addEventListener("mouseleave", () => p.classList.remove("hovered"));
      p.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); setSelected(key); });
    }

    for (const [key, rec] of regions.entries()) {
      const lg = getLabelGroupForKey(key);
      rec.labelGroup = lg;
      rec.en = getEnglishFromSVGLabel(lg, titleCaseFromKey(key));
      rec.zh = I18N[key]?.zh || "";
    }

    svgEl.addEventListener("click", () => setSelected(null));
    svgEl.classList.add("feet");

    applyLangToUI();
    setSelected(null);

    // 初始右下全部列表就有
    renderAllList();
  }

  async function loadSVG() {
    try {
      const res = await fetch("./foot-reflex.svg", { cache: "no-store" });
      if (!res.ok) throw new Error(`SVG fetch failed: HTTP ${res.status}`);
      host.innerHTML = await res.text();
      svgEl = host.querySelector("svg");
      if (!svgEl) throw new Error("SVG element not found");
      wireSVG();
    } catch (err) {
      host.innerHTML = `<div class="loading">Load failed: ${String(err.message || err)}</div>`;
    }
  }

  // events
  q.addEventListener("input", () => {
    showSuggest(getMatches(q.value, 8));
    renderMatchList();
  });
  q.addEventListener("focus", () => showSuggest(getMatches(q.value, 8)));
  q.addEventListener("blur", () => setTimeout(hideSuggest, 120));
  q.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const items = getMatches(q.value, 1);
      if (items.length) {
        const { key, rec } = items[0];
        setSelected(key);
        q.value = getDisplayName(key, rec);
        hideSuggest();
      }
    }
    if (e.key === "Escape") hideSuggest();
  });

  pickBtn.addEventListener("click", () => {
    const items = getMatches(q.value, 1);
    if (items.length) {
      const { key, rec } = items[0];
      setSelected(key);
      q.value = getDisplayName(key, rec);
      hideSuggest();
    }
  });

  clearBtn.addEventListener("click", () => {
    q.value = "";
    setSelected(null);
    hideSuggest();
    renderMatchList();
  });

  btnEn.addEventListener("click", () => { lang = "en"; applyLangToUI(); });
  btnZh.addEventListener("click", () => { lang = "zh"; applyLangToUI(); });

  loadSVG();
})();


