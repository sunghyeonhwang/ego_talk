const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(str: string): boolean {
  return UUID_REGEX.test(str);
}

export function validateRequired(
  body: Record<string, unknown>,
  fields: string[]
): string | null {
  const missing = fields.filter(
    (field) =>
      body[field] === undefined ||
      body[field] === null ||
      body[field] === ""
  );
  if (missing.length > 0) {
    return `Missing required fields: ${missing.join(", ")}`;
  }
  return null;
}
