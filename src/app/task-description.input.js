export async function resolveTaskDescription({ args, ask }) {
  const commandLineDescription = args.join(" ").trim();
  if (commandLineDescription) return commandLineDescription;

  const interactiveDescription = String(await ask("Опишите задачу парсинга: ")).trim();
  if (!interactiveDescription) {
    throw new Error("Описание задачи не может быть пустым");
  }
  return interactiveDescription;
}
