export function required(value) { return String(value ?? '').trim().length > 0; }
