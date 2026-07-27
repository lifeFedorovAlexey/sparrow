const FIELD_PATTERNS = [
  ["price", /цен(?:а|ы|у|ой)?|\bprice\b/iu],
  ["stock", /остат(?:ок|ки|ков)|наличи[ея]|\bstock\b/iu],
  ["title", /названи[ея]|\btitle\b/iu],
  ["article", /артикул(?:ы|ов)?|\bsku\b/iu],
  ["vin", /\bvin\b/iu],
  ["phone", /телефон(?:ы|ов)?|\bphone\b/iu],
  ["date", /дат(?:а|ы|у)|\bdate\b/iu],
  ["author", /автор(?:ы|ов)?|\bauthor\b/iu],
  ["description", /описани[ея]|\bdescription\b/iu],
  ["image", /картин(?:ка|ки|ок)|изображени[ея]|\bimage\b/iu],
  ["rating", /рейтинг|\brating\b/iu],
  ["reviews", /отзыв(?:ы|ов)?|\breviews?\b/iu],
];

export function parseUrl(description) {
  return description.match(/https?:\/\/[^\s"'<>]+/iu)?.[0]?.replace(/[.,;!?]+$/u, "") ?? null;
}

export function parseSchedule(description) {
  const minutes = description.match(/каждые?\s+(\d+)\s*минут/iu);
  if (minutes) return { kind: "interval", everyMinutes: Number(minutes[1]) };
  const hours = description.match(/каждые?\s+(\d+)\s*час/iu);
  if (hours) return { kind: "interval", everyMinutes: Number(hours[1]) * 60 };
  if (/каждый\s+час|ежечасно/iu.test(description)) return { kind: "interval", everyMinutes: 60 };
  if (/вручную|manual/iu.test(description)) return { kind: "manual" };
  return { kind: "once" };
}

export function parseFields(description) {
  return FIELD_PATTERNS.filter(([, pattern]) => pattern.test(description)).map(([field]) => field);
}

export function parseOutput(description) {
  const outputs = [
    ["telegram", /telegram|телеграм/iu],
    ["postgresql", /postgres(?:ql)?/iu],
    ["google-sheets", /google\s*sheets?|гугл\s*таблиц/iu],
    ["excel", /excel|xlsx/iu],
    ["csv", /csv/iu],
    ["webhook", /webhook/iu],
  ];
  return { kind: outputs.find(([, pattern]) => pattern.test(description))?.[0] ?? "json" };
}

export function parseConstraints(description) {
  return {
    authorization: /авторизац|логин|парол|auth/iu.test(description),
    proxy: /прокси|proxy/iu.test(description),
    javascript: /javascript|java\s*script|\bjs\b|браузер/iu.test(description),
    browserRequired: /браузер|playwright|puppeteer|selenium/iu.test(description),
  };
}
