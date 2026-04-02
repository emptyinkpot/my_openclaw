export function resolveContentCraftModel(): string {
  return (
    process.env.CONTENT_CRAFT_MODEL ||
    process.env.OPENCLAW_LOCAL_MODEL ||
    'qwen2.5:7b'
  );
}
