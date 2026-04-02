export function fingerprintSecret(value: string | undefined | null): string | undefined {
  if (!value) {
    return undefined;
  }

  if (value.length <= 8) {
    return `${value.slice(0, 2)}...${value.slice(-2)}`;
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}
