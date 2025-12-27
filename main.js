(() => {
  const host = document.getElementById("svgHost");
  const q = document.getElementById("q");
  const clearBtn = document.getElementById("clearBtn");
  const statusEl = document.getElementById("status");
  const listEl = document.getElementById("list");
  const selNameEl = document.getElementById("selName");
  const selSideEl = document.getElementById("selSide");

  let svgEl = null;

  // regionKey -> { paths: [..], labelGroup: <g> , labelText: "Stomach" }
  const regions = new Map();
  let selectedKey = null;

  function titleize(raw) {
    return raw
      .replace(/_/g, "-")
      .split("-")
      .filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  function isGarbageClass(c) {
    return c === "text-group" || /^cls-\d+$/i.test(c) || c === "red";
  }

  function pickRegionKeyFromPath(p) {
    // 你这张图：器官区域用 class 命名（stomach/kidney/...）
    const cls = Array.from(p.classList).find(c => !isGarbageClass(c));
    return cls || null;
  }

  function getLabelGroupForKey(key) {
    // 标签组通常是 <g class="text-group stomach" id="stomach">
    const byId = svgEl.querySelector(`g#${CSS.escape(key)}`);
    if (byId && byId.tagName.toLowerCase() === "g") return byId;

    const byClass = svgEl.querySelector(`g.text-group.${CSS.escape(key)}`);
    return byClass || null;
  }

  function getLabelText(labelGroup, fallbackKey) {
    if (!labelGroup) return titleize(fallbackKey);
    const t = labelGroup.querySelector("text");
    const s = t?.textContent?.trim();
    return s || titleize(fallbackKey);
  }

  function computeSide(paths) {
    // 粗略用 path 的中心 x 与 viewBox 中线比较（左右脚）
    if (!svgEl || !paths?.length) return "—";
    const vb = svgEl.viewBox && svgEl.viewBox.baseVal ? svgEl.viewBox.baseVal : null;
    if (!vb) return "左右";

    const mid = vb.x + vb.width / 2;

    let leftCount = 0;
    let rightCount = 0;

    for (const p of paths) {
      try {
        const b = p.getBBox();
        const cx = b.x + b.width / 2;
        if (cx < mid) leftCount++;
        else if (cx > mid) rightCount++;
      } catch {
        // ignore
      }
    }

    if (leftCount && rightCount) return "左右";
    if (leftCount) return "左";
    if (rightCount) return "右";
    return "—";
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
      statusEl.textContent = "还没选区域";
      selNameEl.textContent = "（无）";
      selSideEl.textContent = "—";
      renderList();
      return;
    }

    const rec = regions.get(key);

    rec.paths.forEach(p => p.classList.add("selected"));
    if (rec.labelGroup) rec.labelGroup.classList.add("label-selected");

    const name = rec.labelText || titleize(key);
    const side = computeSide(rec.paths);

    statusEl.textContent = `已选择：${name}`;
    selNameEl.textContent = name;
    selSideEl.textContent = side;

    renderList();
  }

  function renderList() {
    const query = (q.value || "").trim().toLowerCase();

    const items = Array.from(regions.entries())
      .map(([key, rec]) => {
        const name = (rec.labelText || titleize(key)).toLowerCase();
        const kk = key.toLowerCase();
        const ok = !query || name.includes(query) || kk.includes(query);
        return { key, rec, ok };
      })
      .filter(x => x.ok)
      .sort((a, b) => (a.rec.labelText || a.key).localeCompare(b.rec.labelText || b.key));

    listEl.innerHTML = "";

    if (!items.length) {
      const div = document.createElement("div");
      div.className = "hint";
      div.textContent = "没有匹配项";
      listEl.appendChild(div);
      return;
    }

    for (const { key, rec } of items) {
      const div = document.createElement("div");
      div.className = "item" + (key === selectedKey ? " active" : "");
      div.dataset.key = key;

      const left = document.createElement("div");
      left.className = "name";
      left.textContent = rec.labelText || titleize(key);

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

  function wireSVG() {
    // 收集可点击区域：Feet 里的 path，排除外轮廓 cls-40
    const paths = Array.from(svgEl.querySelectorAll("#Feet path"))
      .filter(p => !p.classList.contains("cls-40"));

    for (const p of paths) {
      const key = pickRegionKeyFromPath(p);
      if (!key) continue;

      if (!regions.has(key)) regions.set(key, { paths: [], labelGroup: null, labelText: "" });
      regions.get(key).paths.push(p);

      // hover
      p.addEventListener("mouseenter", () => p.classList.add("hovered"));
      p.addEventListener("mouseleave", () => p.classList.remove("hovered"));

      // click
      p.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        setSelected(key);
      });
    }

    // 绑定标签组（文字也会随选择变化）
    for (const [key, rec] of regions.entries()) {
      const lg = getLabelGroupForKey(key);
      rec.labelGroup = lg;
      rec.labelText = getLabelText(lg, key);
    }

    // 点 SVG 空白取消选中
    svgEl.addEventListener("click", () => setSelected(null));

    renderList();
    setSelected(null);
  }

  async function loadSVG() {
    try {
      // ✅ 绝对路径：你的站点是 /foot-reflex-app/
      const res = await fetch("/foot-reflex-app/foot-reflex.svg", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const text = await res.text();
      host.innerHTML = text;

      svgEl = host.querySelector("svg");
      if (!svgEl) throw new Error("SVG not found");

      // 给它一个 class，便于套样式
      svgEl.classList.add("feet");

      wireSVG();
    } catch (err) {
      host.innerHTML = `<div class="loading">加载 SVG 失败：${String(err)}</div>`;
    }
  }

  q.addEventListener("input", renderList);
  clearBtn.addEventListener("click", () => {
    q.value = "";
    setSelected(null);
    renderList();
  });

  loadSVG();
})();

