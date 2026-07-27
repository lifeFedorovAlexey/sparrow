const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value).replace(/[&<>"']/gu, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
let opened = false;

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
    $("#schema").innerHTML = `<div class="field"><b>Повторяющийся блок</b><code>${escapeHtml(schema.containerSelector)}</code></div>${schema.fields.map((field) => `<div class="field"><b>${escapeHtml(field.name)}</b><code>${escapeHtml(field.selector)}</code></div>`).join("")}`;
  }
  $("#generate").disabled = !schema?.fields.length || !state.total;
}

$("#open").addEventListener("click", async () => {
  try {
    $("#status").textContent = "Запускаю браузер…";
    render(await request("/api/open", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: $("#url").value }) }));
    opened = true;
  } catch (error) { $("#status").textContent = `Ошибка: ${error.message}`; }
});

$("#generate").addEventListener("click", async () => {
  try {
    const result = await request("/api/generate", { method: "POST" });
    $("#project").textContent = `Проект создан: ${result.projectPath}`;
  } catch (error) { $("#project").textContent = `Ошибка: ${error.message}`; }
});

setInterval(async () => {
  if (!opened) return;
  try { render(await request("/api/session")); } catch {}
}, 700);
