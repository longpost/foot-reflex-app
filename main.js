(() => {
  const host = document.getElementById("svgHost");
  const q = document.getElementById("q");
  const clearBtn = document.getElementById("clearBtn");
  const pickBtn = document.getElementById("pickBtn");
  const langBtn = document.getElementById("langBtn");
  const suggestEl = document.getElementById("suggest");

  const statusEl = document.getElementById("status");
  const listEl = document.getElementById("list");
  const selNameEl = document.getElementById("selName");
  const selSideEl = document.getElementById("selSide");

  // UI text nodes
  const titleText = document.getElementById("titleText");
  const loadingText = document.getElementById("loadingText");
  const sourceText = document.getElementById("sourceText");
  const panelSelTitle = document.getElementById("panelSelTitle");
  const panelListTitle = document.getElementById("panelListTitle");
  const hintText = document.getElementById("hintText");
  const kName = document.getElementById("kName");
  const kSide = document.getElementById("kSide");

  let svgEl = null;

  // regionKey -> { paths: [..], labelGroup: <g>, en: "Stomach", zh: "胃" }
  const regions = new Map();
  let selectedKey = null;

  // 当前语言：'zh' 或 'en'
  let lang = "zh";

  // ✅ 中英切换用的字典：key = SVG 的 class/id（例如 stomach, duodenum）
  // 你要更多就继续往里加
  const I18N = {
    "head-brain": { zh: "头/脑", en: "Head/Brain" },
    "teeth-sinuses": { zh: "牙/鼻窦", en: "Teeth/Sinuses" },
    "eye": { zh: "眼", en: "Eye" },
    "ear": { zh: "耳", en: "Ear" },
    "trapezius": { zh: "斜方肌", en: "Trapezius" },
    "armpit": { zh: "腋窝", en: "Armpit" },
    "lung-chest": { zh: "肺/胸", en: "Lung/Chest" },
    "arm": { zh: "臂", en: "Arm" },
    "shoulder": { zh: "肩", en: "Shoulder" },
    "liver": { zh: "肝", en: "Liver" },
    "gall-bladder": { zh: "胆", en: "Gall Bladder" },
    "spleen": { zh: "脾", en: "Spleen" },
    "kidney": { zh: "肾", en: "Kidney" },
    "elbow": { zh: "肘", en: "Elbow" },
    "leg": { zh: "腿", en: "Leg" },
    "ascending-colon": { zh: "升结肠", en: "Ascending Colon" },
    "descending-colon": { zh: "降结肠", en: "Descending Colon" },
    "appendix": { zh: "阑尾", en: "Appendix" },
    "small-intestine": { zh: "小肠", en: "Small Intestine" },
    "sciatic-nerve": { zh: "坐骨神经", en: "Sciatic Nerve" },
    "lower-back": { zh: "下背", en: "Lower Back" },
    "cervical-spine": { zh: "脊柱/骶骨/腰椎（见标签）", en: "Spine (see labels)" }, // 你这张图里它被复用多次
    "rectum": { zh: "直肠", en: "Rectum" },
    "bladder": { zh: "膀胱", en: "Bladder" },
    "ureter": { zh: "输尿管", en: "Ureter" },
    "duodenum": { zh: "十二指肠", en: "Duodenum" },
    "pancreas": { zh: "胰", en: "Pancreas" },
    "adrenals": { zh: "肾上腺", en: "Adrenals" },
    "stomach": { zh: "胃", en: "Stomach" },
    "diaphragm": { zh: "横膈膜", en: "Diaphragm" },
    "solar-plexus": { zh: "太阳神经丛", en: "Solar Plexus" },
    "esophagus": { zh: "食道", en: "Esophagus" },
    "thyroid": { zh: "甲状腺", en: "Thyroid" },
    "neck": { zh: "颈", en: "Neck" },
    "nose": { zh: "鼻", en: "Nose" },
    "throat": { zh: "咽喉", en: "Throat" },
    "pituitary": { zh: "垂体", en: "Pituitary" },
    "heart": { zh: "心", en: "Heart" }
  };

  const UI = {
    zh: {
      langBtn: "中文",
      title: "足底反射区",
      placeholder: "搜索：胃 / stomach / pancreas…",
      pick: "选择",
      clear: "清空",
      statusNone: "还没选区域",
      statusSelected: (name) => `已选择：${name}`,
      panelSel: "当前选择",
      panelList: "匹配结果",
      hint: "输入几个字/字母会出现候选；也可以点下面列表或直接点脚上区域。",
      kName: "名称：",
      kSide: "区域：",
      none: "（无）",
      noMatch: "没有匹配项",
      sideLeft: "左",
      sideRight: "右",
      sideBoth: "左右",
      sideNA: "—"
    },
    en: {
      langBtn: "English",
      title: "Foot Reflexology",
      placeholder: "Search: stomach / pancreas / duodenum…",
      pick: "Pick",
      clear: "Clear",
      statusNone: "No selection",
      statusSelected: (name) => `Selected: ${name}`,
      panelSel: "Selection",
      panelList: "Matches",
      hint: "Type a few letters/characters for suggestions. Or click a region / list item.",
      kName: "Name: ",
      kSide: "Side: ",
      none: "(none)",
      noMatch: "No matches",
      sideLeft: "Left",
      sideRight: "Right",
      sideBoth: "Both",
      sideNA: "—"
    }
  };

  function t() { return UI[lang]; }

  function norm(s) {
    return (s || "").toString().trim().toLowerCase();
  }

  function isGarbageClass(c) {
    return c === "text-group" || /^cls-\d+$/i.test(c) || c === "red";
  }

  function pickRegionKeyFromPath(p) {
    const cls = Array.from(p.classList).find(c => !isGarbageClass(c));
    return cls || null;
  }

  function getLabelGroupForKey(key) {
    const byId = svgEl.querySelector(`g#${CSS.escape(key)}`);
    if (byId && byId.tagName.toLowerCase() === "g") return byId;

    const byClass = svgEl.querySelector(`g.text-group.${CSS.escape(key)}`);
    return byClass || null;
  }

  function getEnglishFromSVGLabel(labelGroup, fallbackKey) {
    if (!labelGroup) return fallbackKey;
    const tx = labelGroup.querySelector("text");
    const s = tx?.textContent?.trim();
    return s || fallbackKey;
  }

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
      renderList();
      return;
    }

    const rec = regions.get(key);

    rec.paths.forEach(p => p.classList.add("selected"));
    if (rec.labelGroup) rec.labelGroup.classList.add("label-selected");

    const name = getDisplayName(key, rec);
    const side = computeSide(rec.paths);

    statusEl.textContent = t().statusSelected(name);
    selNameEl.textContent = name;
    selSideEl.textContent = side;

    renderList();
  }

  function getMatchesPrefix(query, limit = 8) {
    const qn = norm(query);
    if (!qn) return [];

    // “开头匹配”：优先 displayName 开头，其次 key 开头，再其次包含
    const scored = [];

    for (const [key, rec] of regions.entries()) {
      const dn = norm(getDisplayName(key, rec));
      const en = norm(rec.en);
      const zh = norm(rec.zh);

      let score = 999;

      if (dn.startsWith(qn)) score = 0;
      else if (en.startsWith(qn) || zh.startsWith(qn)) score = 1;
      else if (norm(key).startsWith(qn)) score = 2;
      else if (dn.includes(qn) || en.includes(qn) || zh.includes(qn) || norm(key).includes(qn)) score = 3;
      else continue;

      scored.push({ key, rec, score });
    }

    scored.sort((a, b) => a.score - b.score || getDisplayName(a.key, a.rec).localeCompare(getDisplayName(b.key, b.rec)));
    return scored.slice(0, limit);
  }

  function hideSuggest() {
    suggestEl.hidden = true;
    suggestEl.innerHTML = "";
  }

  function showSuggest(items) {
    suggestEl.innerHTML = "";
    if (!items.length) {
      hideSuggest();
      return;
    }

    for (const { key, rec } of items) {
      const row = document.createElement("div");
      row.className = "suggestItem";
      row.dataset.key = key;

      const a = document.createElement("div");
      a.className = "a";
      a.textContent = getDisplayName(key, rec);

      const b = document.createElement("div");
      b.className = "b";
      // 另一语言做辅助显示（可读，不丑）
      const other = lang === "zh"
        ? (I18N[key]?.en || rec.en || "")
        : (I18N[key]?.zh || rec.zh || "");
      b.textContent = other ? other : key;

      row.appendChild(a);
      row.appendChild(b);

      row.addEventListener("mousedown", (e) => {
        // mousedown 防止 input blur 先触发导致列表消失点不到
        e.preventDefault();
        setSelected(key);
        q.value = getDisplayName(key, rec);
        hideSuggest();
      });

      suggestEl.appendChild(row);
    }

    suggestEl.hidden = false;
  }

  function renderList() {
    const query = q.value || "";
    const items = getMatchesPrefix(query, 200); // 列表给多点，用户滚动也行
    listEl.innerHTML = "";

    if (!items.length) {
      const div = document.createElement("div");
      div.className = "hint";
      div.textContent = t().noMatch;
      listEl.appendChild(div);
      return;
    }

    for (const { key, rec } of items) {
      const div = document.createElement("div");
      div.className = "item" + (key === selectedKey ? " active" : "");
      div.dataset.key = key;

      const left = document.createElement("div");
      left.className = "name";
      left.textContent = getDisplayName(key, rec);

      const right = document.createElement("div");
      right.className = "meta";
      right.textContent = computeSide(rec.paths);

      div.appendChild(left);
      div.appendChild(right);

      div.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        setSelected(key);
      });

      listEl.appendChild(div);
    }
  }

  function applyLangToUI() {
    // 顶部
    titleText.textContent = t().title;
    q.placeholder = t().placeholder;
    pickBtn.textContent = t().pick;
    clearBtn.textContent = t().clear;
    langBtn.textContent = t().langBtn;

    // 右侧
    panelSelTitle.textContent = t().panelSel;
    panelListTitle.textContent = t().panelList;
    hintText.textContent = t().hint;
    kName.textContent = t().kName;
    kSide.textContent = t().kSide;

    // 状态 / 选中
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

    // 列表重绘（显示语言要变）
    renderList();

    // 建议列表也刷新
    const sug = getMatchesPrefix(q.value, 8);
    showSuggest(sug);
  }

  function wireSVG() {
    // 可点击区域：Feet 里的 path，排除外轮廓 cls-40
    const paths = Array.from(svgEl.querySelectorAll("#Feet path"))
      .filter(p => !p.classList.contains("cls-40"));

    for (const p of paths) {
      const key = pickRegionKeyFromPath(p);
      if (!key) continue;

      if (!regions.has(key)) regions.set(key, { paths: [], labelGroup: null, en: "", zh: "" });
      regions.get(key).paths.push(p);

      p.addEventListener("mouseenter", () => p.classList.add("hovered"));
      p.addEventListener("mouseleave", () => p.classList.remove("hovered"));

      p.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        setSelected(key);
      });
    }

    // 绑定标签组 + EN/ZH 名字
    for (const [key, rec] of regions.entries()) {
      const lg = getLabelGroupForKey(key);
      rec.labelGroup = lg;

      // EN：从 SVG 标签里取（如果有）
      rec.en = getEnglishFromSVGLabel(lg, titleCaseFromKey(key));

      // ZH：从字典取
      rec.zh = I18N[key]?.zh || "";
    }

    // 点 SVG 空白取消选中
    svgEl.addEventListener("click", () => setSelected(null));

    applyLangToUI();
    setSelected(null);
  }

  function titleCaseFromKey(key) {
    return key
      .replace(/_/g, "-")
      .split("-")
      .filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  async function loadSVG() {
    try {
      const res = await fetch("/foot-reflex-app/foot-reflex.svg", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const text = await res.text();
      host.innerHTML = text;

      svgEl = host.querySelector("svg");
      if (!svgEl) throw new Error("SVG not found");

      svgEl.classList.add("feet");

      wireSVG();
    } catch (err) {
      host.innerHTML = `<div class="loading">加载 SVG 失败：${String(err)}</div>`;
    }
  }

  // ---------- 输入联想 ----------
  q.addEventListener("input", () => {
    const items = getMatchesPrefix(q.value, 8);
    showSuggest(items);
    renderList();
  });

  q.addEventListener("focus", () => {
    const items = getMatchesPrefix(q.value, 8);
    showSuggest(items);
  });

  q.addEventListener("blur", () => {
    // 延迟隐藏，给 mousedown 点击候选留时间
    setTimeout(hideSuggest, 120);
  });

  // Enter：直接选择第一个候选
  q.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const items = getMatchesPrefix(q.value, 1);
      if (items.length) {
        const { key, rec } = items[0];
        setSelected(key);
        q.value = getDisplayName(key, rec);
        hideSuggest();
      }
    }
    if (e.key === "Escape") hideSuggest();
  });

  // “选择”按钮：选第一个候选
  pickBtn.addEventListener("click", () => {
    const items = getMatchesPrefix(q.value, 1);
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
    renderList();
  });

  // 语言切换
  langBtn.addEventListener("click", () => {
    lang = (lang === "zh") ? "en" : "zh";
    applyLangToUI();
  });

  loadSVG();
})();


