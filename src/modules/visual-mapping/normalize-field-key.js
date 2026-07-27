const transliteration = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh",
  щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

export function normalizeFieldKey(label) {
  const transliterated = [...String(label ?? "").trim().toLowerCase()]
    .map((character) => transliteration[character] ?? character)
    .join("");
  let key = transliterated
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/gu, "_")
    .replace(/^_+|_+$/gu, "")
    .replace(/_+/gu, "_");
  if (!key) throw new Error("Название поля не содержит допустимых символов");
  if (/^[0-9]/u.test(key)) key = `field_${key}`;
  return key;
}
