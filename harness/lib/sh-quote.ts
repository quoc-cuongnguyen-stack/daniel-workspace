export function shQuote(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
