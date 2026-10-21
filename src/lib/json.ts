function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const results = asRecord(value).results;
  return Array.isArray(results) ? results : [];
}

function asString(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function asBool(value: unknown) {
  return value === true || value === 1 || value === "true";
}

function readBody(raw: unknown) {
  return raw;
}

export { asBool, asList, asRecord, asString, readBody };
