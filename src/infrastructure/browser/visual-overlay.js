export function installVisualOverlay() {
  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", installVisualOverlay, { once: true });
    return;
  }
  if (window.__hermesOverlayInstalled) return;
  window.__hermesOverlayInstalled = true;
  let mode = null;
  let containerSelector = null;
  let hovered = null;

  const esc = (value) => CSS.escape(value);
  const selectorFor = (element) => {
    const classes = [...element.classList].filter((name) => name.length < 100);
    if (classes.length) return `${element.tagName.toLowerCase()}${classes.map((name) => `.${esc(name)}`).join("")}`;
    const id = element.id ? `#${esc(element.id)}` : "";
    return id || element.tagName.toLowerCase();
  };
  const relativeSelector = (element, container) => {
    if (element === container) return ":scope";
    const withIdentity = selectorFor(element);
    if (container.querySelectorAll(withIdentity).length === 1) return withIdentity;
    const parts = [];
    let current = element;
    while (current && current !== container) {
      const siblings = [...current.parentElement.children].filter((node) => node.tagName === current.tagName);
      const index = siblings.indexOf(current) + 1;
      parts.unshift(`${current.tagName.toLowerCase()}:nth-of-type(${index})`);
      current = current.parentElement;
    }
    return parts.join(" > ");
  };

  const toolbar = document.createElement("div");
  toolbar.id = "hermes-visual-toolbar";
  toolbar.innerHTML = `<strong>Hermes Parser</strong><button data-mode="container">1. Выбрать повторяющийся блок</button><button data-mode="field">2. Добавить поле</button><span>Выберите блок</span>`;
  Object.assign(toolbar.style, { position: "fixed", zIndex: 2147483647, top: "16px", left: "50%", transform: "translateX(-50%)", padding: "10px", borderRadius: "10px", background: "#111827", color: "white", display: "flex", gap: "8px", alignItems: "center", font: "14px system-ui", boxShadow: "0 8px 30px #0008" });
  toolbar.querySelectorAll("button").forEach((button) => Object.assign(button.style, { border: 0, borderRadius: "7px", padding: "8px 10px", cursor: "pointer" }));
  document.documentElement.append(toolbar);
  const status = toolbar.querySelector("span");

  toolbar.addEventListener("click", (event) => {
    const nextMode = event.target.dataset?.mode;
    if (!nextMode) return;
    if (nextMode === "field" && !containerSelector) {
      status.textContent = "Сначала выберите повторяющийся блок";
      return;
    }
    mode = nextMode;
    status.textContent = mode === "container" ? "Кликните по одной строке/карточке" : "Кликните по полю внутри строки";
  });
  document.addEventListener("mousemove", (event) => {
    if (!mode || toolbar.contains(event.target)) return;
    if (hovered) hovered.style.outline = hovered.dataset.hermesOutline ?? "";
    hovered = event.target;
    hovered.dataset.hermesOutline = hovered.style.outline;
    hovered.style.outline = "3px solid #8b5cf6";
  }, true);
  document.addEventListener("click", async (event) => {
    if (!mode || toolbar.contains(event.target)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const element = event.target;
    if (mode === "container") {
      containerSelector = selectorFor(element);
      const count = document.querySelectorAll(containerSelector).length;
      await window.hermesSelect({ type: "container", selector: containerSelector, count });
      status.textContent = `Блок выбран: ${count} совпадений`;
    } else {
      const container = element.closest(containerSelector);
      if (!container) return void (status.textContent = "Поле должно быть внутри выбранного блока");
      const name = window.prompt("Название поля (любое):");
      if (!name?.trim()) return;
      const selector = relativeSelector(element, container);
      const attribute = element.tagName === "IMG" ? "src" : element.tagName === "A" ? "href" : "text";
      await window.hermesSelect({ type: "field", name: name.trim(), selector, attribute });
      status.textContent = `Поле добавлено: ${name.trim()}`;
    }
    mode = null;
  }, true);
}
