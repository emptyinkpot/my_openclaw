export function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value !== 'string') {
    return value as T;
  }

  const text = value.trim();
  if (!text) {
    return fallback;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

export function parseStringList(value: unknown): string[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map(item => String(item).trim())
      .filter(Boolean);
  }

  if (typeof value !== 'string') {
    return [String(value).trim()].filter(Boolean);
  }

  const text = value.trim();
  if (!text) {
    return [];
  }

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed
        .map(item => String(item).trim())
        .filter(Boolean);
    }
    if (typeof parsed === 'string') {
      return parseDelimitedList(parsed);
    }
    return [];
  } catch {
    return parseDelimitedList(text);
  }
}

export function parseDelimitedList(text: string): string[] {
  return text
    .split(/[、,，|\/\n\r;；]+/g)
    .map(item => item.trim())
    .filter(Boolean);
}

