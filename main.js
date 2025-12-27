(function () {
  const svg = document.querySelector("svg.feet");
  if (!svg) return;

  // 你想“能点的区域”只包括器官块，不包括文字线条
  // 这里先粗暴点：只抓 Feet 里的 path
  const clickable = Array.from(svg.querySelectorAll("#Feet path"));

  const selectedNameEl = document.getElementById("selectedName");

  function titleize(raw) {
    // 把 "small-intestine" 变成 "Small Intestine"
    return raw
      .replace(/_/g, "-")
      .split("-")
      .filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  function getNameFromPath(p) {
    // 优先：id
    if (p.id) return titleize(p.id);

    // 次优先：class 里找一个“不是 cls-xx / text-group” 的
    const cls = Array.from(p.classList).find(c =>
      !/^cls-\d+$/i.test(c) && c !== "text-group"
    );
    if (cls) return titleize(cls);

    // 兜底
    return "Unknown";
  }

  function clearSelected() {
    svg.querySelectorAll("path.selected").forEach(p => p.classList.remove("selected"));
  }

  // hover
  clickable.forEach(p => {
    p.addEventListener("mouseenter", () => p.classList.add("hovered"));
    p.addEventListener("mouseleave", () => p.classList.remove("hovered"));
  });

  // click -> 选中高亮
  clickable.forEach(p => {
    p.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      clearSelected();
      p.classList.add("selected");

      const name = getNameFromPath(p);
      if (selectedNameEl) selectedNameEl.textContent = name;
    });
  });

  // 点击空白处取消选中
  svg.addEventListener("click", () => {
    clearSelected();
    if (selectedNameEl) selectedNameEl.textContent = "None";
  });
})();
