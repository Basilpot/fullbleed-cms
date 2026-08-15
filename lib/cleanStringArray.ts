export const cleanStringArray = (input?: string, separator = ",") => {
  if (!input) return [];
  return input.split(separator).map(s => s.trim()).filter(Boolean);
};

export const toStringArray = (
  input?: string[] | string | null,
): string[] => {
  if (Array.isArray(input)) {
    return input
      .filter((s): s is string => typeof s === "string")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof input === "string") {
    return input.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
};

export const toNumberArray = (
  input?: number[] | string | null,
): number[] => {
  if (Array.isArray(input)) {
    return input.filter((n): n is number => typeof n === "number");
  }
  if (typeof input === "string") {
    return input
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n));
  }
  return [];
};
