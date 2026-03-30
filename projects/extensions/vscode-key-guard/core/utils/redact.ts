export function redactValue(value: string | undefined | null): string | undefined {
  if (!value) {
    return undefined;
  }

  return "[REDACTED]";
}
