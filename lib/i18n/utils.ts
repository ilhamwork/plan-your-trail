export function getTranslation(
  messages: Record<string, unknown>,
  path: string,
  params?: Record<string, string | number>
): string {
  if (!messages || !path) return path

  const keys = path.split(".")
  let current: unknown = messages

  for (const key of keys) {
    if (
      current !== null &&
      typeof current === "object" &&
      key in (current as Record<string, unknown>)
    ) {
      current = (current as Record<string, unknown>)[key]
    } else {
      return path
    }
  }

  if (typeof current !== "string") {
    return path
  }

  if (!params) {
    return current
  }

  let result = current
  for (const [paramKey, paramValue] of Object.entries(params)) {
    result = result.replaceAll(`{${paramKey}}`, String(paramValue))
  }

  return result
}

