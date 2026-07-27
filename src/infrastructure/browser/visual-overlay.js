export function installVisualOverlay() {
  if (document.readyState === "loading") return void window.addEventListener("DOMContentLoaded", installVisualOverlay, { once: true });
  if (window.__hermesOverlayInstalled) return;
  window.__hermesOverlayInstalled = true;
  let mode = null;
  let containerSelector = null;
  let hovered = null;
  const fieldNames = [];
  const esc = (value) => CSS.escape(value);
  const classPart = (name) => {
    const moduleClass = name.match(/^(.+-module)__[^_]+__(.+)$/u);
    return moduleClass
      ? `[class*="${esc(moduleClass[1])}__"][class*="__${esc(moduleClass[2])}"]`
      : `.${esc(name)}`;
  };
  const selectorFor = (element) => {
    const stableAttribute = ["data-testid", "data-test", "itemprop"].find((name) => element.hasAttribute(name));
    if (stableAttribute) return `${element.tagName.toLowerCase()}[${stableAttribute}="${esc(element.getAttribute(stableAttribute))}"]`;
    const classes = [...element.classList].filter((name) => name.length < 100);
    if (classes.length) return `${element.tagName.toLowerCase()}${classes.map(classPart).join("")}`;
    return element.id ? `#${esc(element.id)}` : element.tagName.toLowerCase();
  };
  const inferContainer = (element) => {
    const candidates = [];
    for (let current = element; current && current !== document.body; current = current.parentElement) {
      const selector = selectorFor(current);
      const count = document.querySelectorAll(selector).length;
      if (count > 1 && current.children.length > 1) candidates.push({ selector, count, score: current.children.length });
    }
    return candidates.sort((left, right) => right.score - left.score)[0] ?? null;
  };
  const relativeSelection = (element, container) => {
    if (element === container) return { selector: ":scope", matchIndex: 0 };
    const selector = selectorFor(element);
    const matches = [...container.querySelectorAll(selector)];
    if (matches.includes(element)) return { selector, matchIndex: matches.indexOf(element) };
    return { selector, matchIndex: 0 };
  };

  const panel = document.createElement("section");
  panel.id = "hermes-visual-toolbar";
  panel.innerHTML = `<b style="font-size:16px">Hermes — визуальная разметка</b><div data-role="instruction">Шаг 1. Выберите повторяющиеся строки или карточки.</div><div style="display:flex;gap:8px"><button data-mode="container">Выбрать строки</button><button data-mode="field" disabled>Добавить поле</button></div><div data-role="fields"></div><div data-role="result" hidden><b>Результат на странице</b><span data-role="count"></span><pre data-role="preview"></pre><button data-confirm disabled>Да, это то, что мне нужно</button></div>`;
  Object.assign(panel.style, { position: "fixed", zIndex: 2147483647, top: "16px", left: "16px", width: "470px", maxHeight: "calc(100vh - 32px)", overflow: "auto", padding: "16px", borderRadius: "14px", background: "#111827", color: "white", display: "grid", gap: "12px", font: "14px system-ui", boxShadow: "0 10px 40px #000a" });
  panel.querySelectorAll("button").forEach((button) => Object.assign(button.style, { border: 0, borderRadius: "8px", padding: "10px 12px", cursor: "pointer", fontWeight: 700 }));
  document.documentElement.append(panel);
  const instruction = panel.querySelector("[data-role=instruction]");
  const fieldButton = panel.querySelector("[data-mode=field]");
  const fieldsView = panel.querySelector("[data-role=fields]");
  const resultView = panel.querySelector("[data-role=result]");
  const previewView = panel.querySelector("[data-role=preview]");
  const countView = panel.querySelector("[data-role=count]");
  const confirmButton = panel.querySelector("[data-confirm]");
  Object.assign(previewView.style, { maxHeight: "260px", overflow: "auto", padding: "10px", borderRadius: "8px", background: "#020617", color: "#a7f3d0", fontSize: "12px", whiteSpace: "pre-wrap" });

  const renderResult = (snapshot) => {
    resultView.hidden = false;
    countView.textContent = ` — ${snapshot.total} записей`;
    previewView.textContent = JSON.stringify(snapshot.preview.slice(0, 5), null, 2);
    confirmButton.disabled = !snapshot.total || !snapshot.schema?.fields.length;
  };
  const askFieldName = () => new Promise((resolve) => {
    const dialog = document.createElement("div");
    dialog.innerHTML = `<label style="display:grid;gap:6px">Название поля<input placeholder="Например: цена, винрейт" style="padding:10px;border-radius:7px;border:1px solid #64748b"></label><div style="display:flex;gap:8px;margin-top:10px"><button data-save>Сохранить поле</button><button data-cancel>Отмена</button></div>`;
    panel.append(dialog);
    const input = dialog.querySelector("input"); input.focus();
    dialog.querySelector("[data-save]").onclick = () => { const value = input.value.trim(); if (value) { dialog.remove(); resolve(value); } };
    dialog.querySelector("[data-cancel]").onclick = () => { dialog.remove(); resolve(null); };
  });

  panel.addEventListener("click", async (event) => {
    if (event.target.dataset?.confirm !== undefined) {
      confirmButton.disabled = true;
      instruction.textContent = "Сохраняю конфигурацию и возвращаю в основной интерфейс…";
      await window.hermesConfirm();
      return;
    }
    const nextMode = event.target.dataset?.mode;
    if (!nextMode) return;
    mode = nextMode;
    instruction.textContent = mode === "container" ? "Кликните по любой ячейке нужной строки — Hermes выделит строки целиком." : "Кликните по конкретному значению внутри зелёной строки.";
  });
  document.addEventListener("mousemove", (event) => {
    if (!mode || panel.contains(event.target)) return;
    if (hovered) hovered.style.outline = hovered.dataset.hermesOutline ?? "";
    hovered = event.target; hovered.dataset.hermesOutline = hovered.style.outline; hovered.style.outline = "3px solid #8b5cf6";
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
      instruction.textContent = `Найдено строк: ${match.count}. Теперь добавьте поля.`;
    } else {
      const container = element.closest(containerSelector);
      if (!container) return void (instruction.textContent = "Выберите значение внутри зелёной строки.");
      const name = await askFieldName();
      if (!name) return;
      const attribute = element.tagName === "IMG" ? "src" : element.tagName === "A" ? "href" : "text";
      const selection = relativeSelection(element, container);
      const snapshot = await window.hermesSelect({ type: "field", name, ...selection, attribute });
      document.querySelectorAll(containerSelector).forEach((row) => row.querySelectorAll(selection.selector)[selection.matchIndex]?.style.setProperty("outline", "2px solid #22d3ee"));
      fieldNames.push(name); fieldsView.textContent = `Поля: ${fieldNames.join(", ")}`;
      instruction.textContent = "Проверьте JSON ниже. Добавьте поля или подтвердите результат.";
      renderResult(snapshot);
    }
    mode = null;
  }, true);
}
