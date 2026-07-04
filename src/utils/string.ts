export function truncate(str: string, max: number): string {
  if (!str) return "";
  return str.length > max ? str.substring(0, max) + "..." : str;
}
