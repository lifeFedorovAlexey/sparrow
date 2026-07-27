const FIELD_ALIASES = {
  title: ["title", "name", "product-name", "название", "заголовок"],
  price: ["price", "cost", "amount", "цена", "стоимость"],
  stock: ["stock", "availability", "available", "остаток", "наличие"],
  article: ["article", "sku", "code", "артикул"],
  vin: ["vin"],
  phone: ["phone", "tel", "телефон"],
  date: ["date", "time", "дата"],
  author: ["author", "user", "автор"],
  description: ["description", "summary", "описание"],
  image: ["image", "img", "photo", "picture", "картинка"],
  rating: ["rating", "score", "stars", "рейтинг"],
  reviews: ["review", "reviews", "comment", "отзыв"],
};

function selectorScore(field, selector) {
  const normalized = selector.toLowerCase().replace(/[._#-]+/gu, " ");
  const aliases = FIELD_ALIASES[field] ?? [field];
  return aliases.reduce((score, alias) => {
    const normalizedAlias = alias.toLowerCase().replace(/[-_]+/gu, " ");
    return Math.max(score, normalized.includes(normalizedAlias) ? normalizedAlias.length : 0);
  }, 0);
}

export function findFieldCandidate(field, candidates) {
  return candidates
    .map((candidate) => ({ candidate, score: selectorScore(field, candidate.selector) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)[0]?.candidate ?? null;
}
