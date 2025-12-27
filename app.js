// Foot Reflexology App (SVG injected)
// - Click on path zones (based on class names) to select
// - Shift+Click for multi-select
// - Search + Left/Right/All filter
// Note: This is an interactive teaching/demo app. For commercial use, confirm SVG licensing.

const META = {
  "head-brain": { zh: "头/大脑", en: "Head / Brain", desc: "常见足底反射区示意：脚趾区域与头面/大脑相关。" },
  "teeth-sinuses": { zh: "牙/鼻窦", en: "Teeth / Sinuses", desc: "示意：趾端/趾根附近常标注牙、鼻窦相关区。" },
  "eye": { zh: "眼", en: "Eye", desc: "示意：趾部附近常标注眼区。" },
  "ear": { zh: "耳", en: "Ear", desc: "示意：趾部外侧附近常标注耳区。" },
  "nose": { zh: "鼻", en: "Nose", desc: "示意：趾部/前掌上方常标注鼻区。" },
  "throat": { zh: "咽喉", en: "Throat", desc: "示意：趾根附近常标注咽喉相关区。" },
  "neck": { zh: "颈", en: "Neck", desc: "示意：趾根到跖球上缘常标注颈区。" },
  "pituitary": { zh: "垂体", en: "Pituitary", desc: "示意：大脚趾/趾端附近常标注垂体区。" },

  "trapezius": { zh: "斜方肌", en: "Trapezius", desc: "示意：前掌上缘附近可见相关标注。" },
  "armpit": { zh: "腋窝", en: "Armpit", desc: "示意：跖球侧缘附近常见腋窝标注。" },
  "lung-chest": { zh: "肺/胸", en: "Lung / Chest", desc: "示意：跖球（前掌）区域常对应胸腔、肺相关。" },
  "arm": { zh: "上肢", en: "Arm", desc: "示意：前掌侧缘可见上肢相关标注。" },
  "shoulder": { zh: "肩", en: "Shoulder", desc: "示意：前掌外侧上缘常标肩区。" },
  "heart": { zh: "心", en: "Heart", desc: "示意：部分图将心区偏向左脚前掌/跖球附近。" },
  "diaphragm": { zh: "膈", en: "Diaphragm", desc: "示意：胸腹分界常用膈线标注。" },
  "solar-plexus": { zh: "太阳神经丛", en: "Solar Plexus", desc: "示意：膈线附近常见太阳神经丛标注。" },

  "stomach": { zh: "胃", en: "Stomach", desc: "示意：足弓上部常标注胃区。" },
  "liver": { zh: "肝", en: "Liver", desc: "示意：右脚足弓上部常标注肝区（图中也可能双侧都有标注）。" },
  "gall-bladder": { zh: "胆囊", en: "Gall Bladder", desc: "示意：肝区附近常标胆囊区。" },
  "spleen": { zh: "脾", en: "Spleen", desc: "示意：左脚足弓上部常标脾区。" },
  "pancreas": { zh: "胰", en: "Pancreas", desc: "示意：胃区附近可见胰相关标注。" },
  "duodenum": { zh: "十二指肠", en: "Duodenum", desc: "示意：胃/胰附近可见十二指肠标注。" },
  "adrenals": { zh: "肾上腺", en: "Adrenals", desc: "示意：肾区上方常标肾上腺区。" },
  "kidney": { zh: "肾", en: "Kidney", desc: "示意：足弓中部偏内侧常标注肾区。" },
  "ureter": { zh: "输尿管", en: "Ureter", desc: "示意：从肾区向下走向膀胱区常标输尿管。" },
  "bladder": { zh: "膀胱", en: "Bladder", desc: "示意：足跟或足跟上缘常标膀胱相关区。" },

  "small-intestine": { zh: "小肠", en: "Small Intestine", desc: "示意：足弓下半部常见肠道回路标注（本图简化/分区）。" },
  "ascending-colon": { zh: "升结肠", en: "Ascending Colon", desc: "示意：足弓外侧常见升结肠走向标注。" },
  "descending-colon": { zh: "降结肠", en: "Descending Colon", desc: "示意：足弓外侧常见降结肠走向标注。" },
  "appendix": { zh: "阑尾", en: "Appendix", desc: "示意：右脚足弓下部外侧常标阑尾区。" },
  "rectum": { zh: "直肠", en: "Rectum", desc: "示意：足跟附近可见直肠标注。" },

  "lower-back": { zh: "下背", en: "Lower Back", desc: "示意：足跟/足弓下缘附近可见下背标注。" },
  "sciatic-nerve": { zh: "坐骨神经", en: "Sciatic Nerve", desc: "示意：足跟外侧附近可见坐骨神经标注。" },
  "cervical-spine": { zh: "颈椎（脊柱线）", en: "Cervical Spine", desc: "示意：内侧脊柱线常分段标注颈/胸/腰/骶等。" },

  "elbow": { zh: "肘", en: "Elbow", desc: "示意：侧缘可见肘区标注。" },
  "leg": { zh: "下肢", en: "Leg", desc: "示意：足跟后部/下缘可见下肢标注。" },
};

const state = {
  filter: "all",         // all | L | R (based on x position heuristic)
  query: "",
  selectedKeys: new Set(), // zone keys like "kidney"
  svgReady: false,
};

const els = {
  svgWrap: document.getElementById("svgWrap"),
  loading: document.getElementById("loading"),
  tooltip: document.getElementById("tooltip"),
  detail: document.getElementById("detail"),
  list: document.getElementById("list"),
  matchCount: document.getElementById("matchCount"),
  searchInput: document.getElementById("searchInput"),
  clearBtn: document.getElementById("clearBtn"),
  resetSelBtn: document.getElementById("resetSelBtn"),
  segBtns: Array.from(document.querySelectorAll(".seg-btn")),
};

function normalize(s){
  return (s || "").toLowerCase().replace(/\s+/g,"").trim();
}

function guessSideByBBox(svgEl, element){
  // Heuristic: compute bbox center x against svg viewBox
  try{
    const vb = svgEl.viewBox.baseVal;
    const bbox = element.getBBox();
    const cx = bbox.x + bbox.width / 2;
    const mid = vb.x + vb.width / 2;
    return cx < mid ? "L" : "R";
  } catch {
    return "all";
  }
}

function getZoneKeyFromPath(pathEl){
  // We treat organ key as the first class in META that exists in classList
  for (const cls of pathEl.classList){
    if (META[cls]) return cls;
  }
  return null;
}

function getAllZonePaths(svgEl){
  // pick only paths that map to META keys
  const paths = Array.from(svgEl.querySelectorAll("path"));
  return paths
    .map(p => ({ p, key: getZoneKeyFromPath(p) }))
    .filter(x => !!x.key);
}

function matchesFilter(item){
  if (state.filter === "all") return true;
  return item.side === state.filter;
}

function matchesQuery(key){
  const q = normalize(state.query);
  if (!q) return true;
  const m = META[key] || { zh:key, en:key, desc:"" };
  const hay = normalize(`${m.zh} ${m.en} ${m.desc} ${key}`);
  return hay.includes(q);
}

function getVisibleKeys(zoneIndex){
  // zoneIndex: Map<key, {key, sideSet:Set, nodes:[], meta}>
  const keys = Array.from(zoneIndex.keys());
  return keys.filter(k=>{
    if (!matchesQuery(k)) return false;
    if (state.filter === "all") return true;
    const rec = zoneIndex.get(k);
    return rec.sideSet.has(state.filter);
  }).sort((a,b)=>{
    const az = META[a]?.zh || a;
    const bz = META[b]?.zh || b;
    return az.localeCompare(bz, "zh");
  });
}

function showTooltip(text, x, y){
  els.tooltip.hidden = false;
  els.tooltip.textContent = text;
  const rect = els.tooltip.getBoundingClientRect();
  let left = x + 12;
  let top = y + 12;
  const pad = 14;
  if (left + rect.width + pad > window.innerWidth) left = x - rect.width - 12;
  if (top + rect.height + pad > window.innerHeight) top = y - rect.height - 12;
  els.tooltip.style.left = `${left}px`;
  els.tooltip.style.top = `${top}px`;
}

function hideTooltip(){
  els.tooltip.hidden = true;
}

function renderSelection(svgEl, zoneIndex){
  const visibleKeys = new Set(getVisibleKeys(zoneIndex));

  // for each zone path, apply classes
  for (const [key, rec] of zoneIndex){
    const isVisible = visibleKeys.has(key);
    const isSelected = state.selectedKeys.has(key);

    rec.nodes.forEach(node=>{
      node.classList.add("ref-zone");
      node.classList.toggle("dim", !isVisible);
      node.classList.toggle("hit", isVisible);
      node.classList.toggle("selected", isSelected);
    });
  }
}

function renderDetail(zoneIndex){
  const keys = Array.from(state.selectedKeys);
  if (keys.length === 0){
    els.detail.classList.add("empty");
    els.detail.innerHTML = `
      <div class="empty-title">还没选区域</div>
      <div class="empty-text">点任意反射区，这里会显示名称与说明。</div>
    `;
    return;
  }
  els.detail.classList.remove("empty");

  const primary = keys[keys.length - 1];
  const meta = META[primary] || { zh: primary, en: primary, desc: "" };
  const rec = zoneIndex.get(primary);

  let sideText = "双侧";
  if (rec?.sideSet?.size === 1){
    sideText = rec.sideSet.has("L") ? "左脚" : "右脚";
  } else if (rec?.sideSet?.has("L") && rec?.sideSet?.has("R")){
    sideText = "左右脚";
  }

  els.detail.innerHTML = `
    <div class="name">
      <h3>${meta.zh}</h3>
      <span class="badge">${sideText}</span>
    </div>
    <div class="en">${meta.en}</div>
    <div class="desc">${meta.desc || "—"}</div>
    <div class="note">提示：Shift 多选；搜索框可筛选；左/右脚过滤按图形位置自动判断。</div>
  `;
}

function renderList(zoneIndex){
  const visibleKeys = getVisibleKeys(zoneIndex);
  els.matchCount.textContent = String(visibleKeys.length);

  els.list.innerHTML = visibleKeys.map(key=>{
    const meta = META[key] || { zh:key, en:key };
    const rec = zoneIndex.get(key);
    const side =
      rec.sideSet.has("L") && rec.sideSet.has("R") ? "左右" :
      rec.sideSet.has("L") ? "左" :
      rec.sideSet.has("R") ? "右" : "—";
    const active = state.selectedKeys.has(key) ? "active" : "";
    return `
      <div class="item ${active}" data-key="${key}">
        <div class="meta">
          <div class="zh">${meta.zh}</div>
          <div class="en">${meta.en}</div>
        </div>
        <div class="side">${side}</div>
      </div>
    `;
  }).join("");

  els.list.querySelectorAll(".item").forEach(it=>{
    it.addEventListener("click", ()=>{
      const key = it.dataset.key;
      state.selectedKeys.clear();
      state.selectedKeys.add(key);
      renderAll(window.__svgEl, window.__zoneIndex);
      // scroll into view a representative node
      const rec = window.__zoneIndex.get(key);
      if (rec?.nodes?.[0]){
        rec.nodes[0].scrollIntoView({ behavior:"smooth", block:"center", inline:"center" });
      }
    });
  });
}

function renderAll(svgEl, zoneIndex){
  renderSelection(svgEl, zoneIndex);
  renderDetail(zoneIndex);
  renderList(zoneIndex);
}

function setFilter(next){
  state.filter = next;
  els.segBtns.forEach(b=>{
    const active = b.dataset.filter === next;
    b.classList.toggle("active", active);
    b.setAttribute("aria-selected", active ? "true" : "false");
  });
  if (state.svgReady) renderAll(window.__svgEl, window.__zoneIndex);
}

function setQuery(q){
  state.query = q || "";
  if (state.svgReady) renderAll(window.__svgEl, window.__zoneIndex);
}

function clearSelection(){
  state.selectedKeys.clear();
  if (state.svgReady) renderAll(window.__svgEl, window.__zoneIndex);
}

function toggleSelectKey(key, multi){
  if (!multi) state.selectedKeys.clear();
  if (state.selectedKeys.has(key)) state.selectedKeys.delete(key);
  else state.selectedKeys.add(key);
  renderAll(window.__svgEl, window.__zoneIndex);
}

async function loadSVG(){
  const res = await fetch("./foot-reflex.svg", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load foot-reflex.svg");
  const text = await res.text();

  els.svgWrap.innerHTML = text;
  const svgEl = els.svgWrap.querySelector("svg");
  if (!svgEl) throw new Error("SVG not found in foot-reflex.svg");

  // Make sure it has class feet for styling
  svgEl.classList.add("feet");

  // Build index: key -> nodes, sideSet
  const paths = getAllZonePaths(svgEl);
  const zoneIndex = new Map();
  paths.forEach(({p, key})=>{
    const side = guessSideByBBox(svgEl, p);
    if (!zoneIndex.has(key)){
      zoneIndex.set(key, { key, nodes: [], sideSet: new Set(), meta: META[key] || null });
    }
    const rec = zoneIndex.get(key);
    rec.nodes.push(p);
    if (side === "L" || side === "R") rec.sideSet.add(side);

    // Improve hit area / pointer events
    p.style.pointerEvents = "all";
  });

  // Store globally for render
  window.__svgEl = svgEl;
  window.__zoneIndex = zoneIndex;
  state.svgReady = true;

  // Interactions
  svgEl.addEventListener("mousemove", (e)=>{
    const path = e.target.closest("path");
    if (!path) return;
    const key = getZoneKeyFromPath(path);
    if (!key) return;
    const meta = META[key] || { zh:key, en:key };
    showTooltip(`${meta.zh} / ${meta.en}`, e.clientX, e.clientY);
  });

  svgEl.addEventListener("mouseleave", hideTooltip);

  svgEl.addEventListener("click", (e)=>{
    const path = e.target.closest("path");
    if (!path) return;
    const key = getZoneKeyFromPath(path);
    if (!key) return;
    toggleSelectKey(key, e.shiftKey);
  });

  renderAll(svgEl, zoneIndex);
}

function init(){
  // Controls
  els.segBtns.forEach(btn=>{
    btn.addEventListener("click", ()=> setFilter(btn.dataset.filter));
  });

  els.searchInput.addEventListener("input", (e)=> setQuery(e.target.value));
  els.clearBtn.addEventListener("click", ()=>{
    els.searchInput.value = "";
    setQuery("");
    els.searchInput.focus();
  });

  els.resetSelBtn.addEventListener("click", clearSelection);

  loadSVG().catch(err=>{
    console.error(err);
    if (els.loading) els.loading.textContent = "SVG 加载失败：请检查 foot-reflex.svg 是否在同目录。";
  });
}

init();
