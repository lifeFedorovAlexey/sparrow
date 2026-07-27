const group = (tier, category, names) => names.map((name) => Object.freeze({ name, tier, category }));

export const benchmarkSites = Object.freeze([
  ...group("S", "reference", ["Avito", "Wildberries", "Ozon", "Яндекс Маркет", "ЦИАН", "Auto.ru", "Drom", "2GIS", "HeadHunter", "VK", "Telegram Web", "GitHub"]),
  ...group("A", "ecommerce", ["DNS", "Ситилинк", "ВсеИнструменты", "Лемана ПРО", "Петрович", "МВидео", "Эльдорадо", "Hoff", "Спортмастер", "Lamoda", "Золотое Яблоко", "Лэтуаль", "Детский Мир", "Ашан", "Перекресток", "ВкусВилл", "Самокат"]),
  ...group("A", "realty", ["Домклик", "Яндекс Недвижимость", "Move", "Realty", "N1", "Restate"]),
  ...group("A", "automotive", ["Exist", "Emex", "Drive2"]),
  ...group("A", "catalogs", ["Google Maps", "Яндекс Карты", "Flamp"]),
  ...group("A", "jobs", ["SuperJob", "Работа России", "Habr Career"]),
  ...group("A", "reviews", ["Otzovik", "IRecommend", "Google Reviews"]),
  ...group("A", "global-marketplaces", ["Amazon", "Ebay", "Alibaba", "AliExpress", "Temu", "Taobao", "JD", "Etsy"]),
]);
