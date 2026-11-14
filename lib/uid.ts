export const isUid = (value: unknown): value is string =>
  typeof value === "string" && /^\d+$/.test(value);
