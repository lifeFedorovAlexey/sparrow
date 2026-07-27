export function installInterferenceMitigator() {
  if (document.readyState === "loading") return void window.addEventListener("DOMContentLoaded", installInterferenceMitigator, { once: true });
  if (window.__hermesInterferenceInstalled) return;
  window.__hermesInterferenceInstalled = true;
  const closeLabels = /^(close|dismiss|reject|decline|not now|закрыть|отклонить|не сейчас|продолжить без принятия|отказаться)$/iu;
  let captchaReported = false;

  const visible = (element) => {
    const style = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    return style.visibility !== "hidden" && style.display !== "none" && box.width > 0 && box.height > 0;
  };
  const scan = () => {
    const captcha = document.querySelector('iframe[src*="captcha" i], iframe[src*="recaptcha" i], [class*="captcha" i], [id*="captcha" i]');
    if (captcha && visible(captcha) && !captchaReported) {
      captchaReported = true;
      window.hermesInterference?.({ type: "captcha", action: "manual-required" });
    }
    for (const dialog of document.querySelectorAll('[role="dialog"], dialog[open], [aria-modal="true"]')) {
      if (!visible(dialog) || /captcha/iu.test(dialog.textContent)) continue;
      const button = [...dialog.querySelectorAll("button, [role=button]")]
        .find((candidate) => closeLabels.test(candidate.textContent.trim()) || closeLabels.test(candidate.getAttribute("aria-label") ?? ""));
      if (button) {
        button.click();
        window.hermesInterference?.({ type: "popup", action: "dismissed" });
      }
    }
  };

  scan();
  new MutationObserver(() => queueMicrotask(scan)).observe(document.documentElement, { childList: true, subtree: true });
}
