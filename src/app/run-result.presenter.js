export function presentRunResult(result) {
  const lines = [
    `✓ Задача разобрана: ${result.task.fields.join(", ")} → ${result.task.output.kind}`,
    `✓ Сайт проанализирован: ${result.site.application}, ${result.site.rendering}`,
    `✓ Стратегия: ${result.strategy.kind}`,
  ];
  if (result.dom) {
    lines.push(`✓ Найдено элементов: ${result.dom.primaryContainer.count} (${result.dom.primaryContainer.selector})`);
    lines.push(`✓ Поля сопоставлены: ${result.fields.mappings.map(({ field, selector }) => `${field}=${selector}`).join(", ")}`);
    lines.push(`✓ Проект создан: ${result.project.projectPath}`);
    lines.push(result.validation.valid
      ? `✓ Проверка пройдена: ${result.validation.itemCount} записей за ${result.validation.durationMs} мс`
      : `✗ Проверка не пройдена: ${result.validation.errors.join("; ")}`);
    lines.push(`  Результат: ${result.project.projectPath}\\output.json`);
  }
  return lines.join("\n");
}
