export function installVisualOverlay() {
  if (document.readyState === "loading") return void window.addEventListener("DOMContentLoaded", installVisualOverlay, { once: true });
  if (window.__hermesOverlayInstalled) return;
  window.__hermesOverlayInstalled = true;
  let mode = null;
  let containerSelector = null;
  let hovered = null;
  const fieldNames = [];
  const esc = (value) => CSS.escape(value);
  const selectorFor = (element) => {
    const classes = [...element.classList].filter((name) => name.length < 100);
    if (classes.length) return `${element.tagName.toLowerCase()}${classes.map((name) => `.${esc(name)}`).join("")}`;
    return element.id ? `#${esc(element.id)}` : element.tagName.toLowerCase();
  };
  const inferContainer = (element) => {
    const candidates = [];
    for (let current = element; current && current !== document.body; current = current.parentElement) {
      const selector = selectorFor(current);
      const count = document.querySelectorAll(selector).length;
      if (count > 1 && current.children.length > 1) candidates.push({ element: current, selector, count, score: current.children.length });
    }
    return candidates.sort((left, right) => right.score - left.score)[0] ?? null;
  };
  const relativeSelector = (element, container) => {
    if (element === container) return ":scope";
    const identity = selectorFor(element);
    if (container.querySelectorAll(identity).length === 1) return identity;
    const parts = [];
    for (let current = element; current && current !== container; current = current.parentElement) {
      const siblings = [...current.parentElement.children].filter((node) => node.tagName === current.tagName);
      parts.unshift(`${current.tagName.toLowerCase()}:nth-of-type(${siblings.indexOf(current) + 1})`);
    }
    return parts.join(" > ");
  };

  const panel = document.createElement("section");
  panel.id = "hermes-visual-toolbar";
  panel.innerHTML = `<div style="font-weight:800;font-size:16px">Hermes — визуальная разметка</div><div data-role="instruction">Шаг 1 из 3. Нажмите «Выбрать строки», затем кликните по любой строке или карточке целиком.</div><div style="display:flex;gap:8px"><button data-mode="container">Выбрать строки</button><button data-mode="field" disabled>Добавить поле</button></div><div data-role="fields"></div>`;
  Object.assign(panel.style, { position: "fixed", zIndex: 2147483647, top: "16px", left: "16px", width: "430px", padding: "16px", borderRadius: "14px", background: "#111827", color: "white", display: "grid", gap: "12px", font: "14px system-ui", boxShadow: "0 10px 40px #000a" });
  panel.querySelectorAll("button").forEach((button) => Object.assign(button.style, { border: 0, borderRadius: "8px", padding: "10px 12px", cursor: "pointer", fontWeight: 700 }));
  document.documentElement.append(panel);
  const instruction = panel.querySelector("[data-role=instruction]");
  const fieldButton = panel.querySelector("[data-mode=field]");
  const fieldsView = panel.querySelector("[data-role=fields]");

  const askFieldName = () => new Promise((resolve) => {
    const dialog = document.createElement("div");
    dialog.innerHTML = `<label style="display:grid;gap:6px">Как назвать выбранное поле?<input placeholder="Например: цена, винрейт, артикул" style="padding:10px;border-radius:7px;border:1px solid #64748b"></label><div style="display:flex;gap:8px;margin-top:10px"><button data-save>Сохранить поле</button><button data-cancel>Отмена</button></div>`;
    panel.append(dialog);
    const input = dialog.querySelector("input");
    input.focus();
    dialog.querySelector("[data-save]").onclick = () => { const value = input.value.trim(); if (value) { dialog.remove(); resolve(value); } };
    dialog.querySelector("[data-cancel]").onclick = () => { dialog.remove(); resolve(null); };
  });

  panel.addEventListener("click", (event) => {
    const nextMode = event.target.dataset?.mode;
    if (!nextMode) return;
    mode = nextMode;
    instruction.textContent = mode === "container" ? "Кликните по любой ячейке нужной строки — Hermes найдёт всю повторяющуюся строку." : "Кликните по конкретному значению внутри строки. Затем задайте ему любое название.";
  });
  document.addEventListener("mousemove", (event) => {
    if (!mode || panel.contains(event.target)) return;
    if (hovered) hovered.style.outline = hovered.dataset.hermesOutline ?? "";
    hovered = event.target;
    hovered.dataset.hermesOutline = hovered.style.outline;
    hovered.style.outline = "3px solid #8b5cf6";
  }, true);
  document.addEventListener("click", async (event) => {
    if (!mode || panel.contains(event.target)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const element = event.target;
    if (mode === "container") {
      const match = inferContainer(element);
      if (!match) return void (instruction.textContent = "Не удалось найти повторяющиеся строки. Выберите другой элемент.");
      containerSelector = match.selector;
      document.querySelectorAll(containerSelector).forEach((item) => item.style.outline = "2px solid #22c55e");
      await window.hermesSelect({ type: "container", selector: containerSelector, count: match.count });
      fieldButton.disabled = false;
      instruction.textContent = `Шаг 2 из 3. Найдено строк: ${match.count}. Нажмите «Добавить поле» и выберите значение.`;
    } else {
      const container = element.closest(containerSelector);
      if (!container) return void (instruction.textContent = "Выберите значение внутри зелёной строки.");
      const name = await askFieldName();
      if (!name) return;
      const attribute = element.tagName === "IMG" ? "src" : element.tagName === "A" ? "href" : "text";
      await window.hermesSelect({ type: "field", name, selector: relativeSelector(element, container), attribute });
      fieldNames.push(name);
      fieldsView.textContent = `Выбраны поля: ${fieldNames.join(", ")}`;
      instruction.textContent = "Шаг 3 из 3. Добавьте ещё поля или вернитесь в Hermes и проверьте JSON.";
    }
    mode = null;
  }, true);
}
