export function toCents(value) { const normalized = String(value ?? 0).replace(/[^0-9.-]/g, ''); if (!normalized || normalized === '-' || normalized === '.') return 0; return Math.round(Number(normalized) * 100); }
export function fromCents(cents) { return Number(cents || 0) / 100; }
