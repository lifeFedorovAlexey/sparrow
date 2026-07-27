const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value).replace(/[&<>"']/gu, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
let opened = false;
let remote = false;
let frameSequence = 0;
let frameViewport = { width: 1440, height: 900 };

async function request(path, options) {
  const response = await fetch(path, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
}

function render(state) {
  if (!state) return;
  $("#status").textContent = state.message;
  $("#count").textContent = `${state.total} записей`;
  $("#preview").textContent = JSON.stringify(state.preview, null, 2);
  const schema = state.schema;
  if (!schema?.containerSelector) {
    $("#schema").innerHTML = '<div class="empty">Выберите повторяющийся блок в открытом браузере</div>';
  } else {
    $("#schema").innerHTML = `<div class="field"><b>Повторяющийся блок</b><code>${escapeHtml(schema.containerSelector)}</code></div>${schema.fields.map((field) => `<div class="field"><b>${escapeHtml(field.label ?? field.name)} → ${escapeHtml(field.name)}</b><code>${escapeHtml(field.selector)}</code></div>`).join("")}`;
  }
  $("#save").disabled = !schema?.fields.length || !state.total;
}

$("#open").addEventListener("click", async () => {
  try {
    $("#status").textContent = "Запускаю браузер…";
    const state = await request("/api/open", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: $("#url").value, delivery: "remote" }) });
    render(state);
    opened = true;
    remote = state.delivery === "remote";
    $("#remote-browser").hidden = !remote;
    if (remote) $("#remote-browser").focus();
  } catch (error) { $("#status").textContent = `Ошибка: ${error.message}`; }
});

$("#save").addEventListener("click", async () => {
  try {
    const result = await request("/api/save", { method: "POST" });
    $("#saved").textContent = `Конфигурация сохранена: ${result.id}. Её выполняет общий runtime.`;
  } catch (error) { $("#saved").textContent = `Ошибка: ${error.message}`; }
});

setInterval(async () => {
  if (!opened) return;
  try { render(await request("/api/session")); } catch {}
}, 700);

async function sendInput(event) {
  await request("/api/browser/input", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...event, viewportWidth: frameViewport.width, viewportHeight: frameViewport.height }) });
}

$("#browser-frame").addEventListener("click", (event) => {
  const box = event.currentTarget.getBoundingClientRect();
  void sendInput({ type: "click", x: (event.clientX - box.left) / box.width, y: (event.clientY - box.top) / box.height });
});

$("#browser-frame").addEventListener("wheel", (event) => {
  event.preventDefault();
  const box = event.currentTarget.getBoundingClientRect();
  void sendInput({ type: "scroll", x: (event.clientX - box.left) / box.width, y: (event.clientY - box.top) / box.height, deltaX: event.deltaX, deltaY: event.deltaY });
}, { passive: false });

$("#remote-browser").addEventListener("keydown", (event) => {
  event.preventDefault();
  if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) void sendInput({ type: "text", text: event.key });
  else void sendInput({ type: "key", key: event.key, code: event.code });
});

setInterval(async () => {
  if (!opened || !remote) return;
  try {
    const frame = await request(`/api/browser/frame?after=${frameSequence}`);
    if (!frame.data || frame.sequence === frameSequence) return;
    frameSequence = frame.sequence;
    frameViewport = { width: frame.metadata?.deviceWidth ?? 1440, height: frame.metadata?.deviceHeight ?? 900 };
    $("#browser-frame").src = `data:${frame.mime};base64,${frame.data}`;
    $("#remote-status").textContent = `Кадр ${frame.sequence}`;
  } catch (error) { $("#remote-status").textContent = `Поток недоступен: ${error.message}`; }
}, 150);
