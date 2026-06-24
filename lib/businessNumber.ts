// Korean business registration number (사업자등록번호) validation.
// Format + checksum only — NO external/NTS lookup (manual review at launch).

/** Strip non-digits. */
export function normalizeBusinessNumber(value: string): string {
  return value.replace(/\D/g, '');
}

/** "123-45-67890" display format. */
export function formatBusinessNumber(value: string): string {
  const d = normalizeBusinessNumber(value).slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

/**
 * Validate the 10-digit 사업자등록번호 checksum.
 * Weights [1,3,7,1,3,7,1,3,5] over the first 9 digits, plus floor(d9*5/10);
 * check digit = (10 - (sum % 10)) % 10 must equal the 10th digit.
 */
export function isValidBusinessNumber(value: string): boolean {
  const d = normalizeBusinessNumber(value);
  if (d.length !== 10) return false;
  const n = d.split('').map(Number);
  const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += n[i] * weights[i];
  sum += Math.floor((n[8] * 5) / 10);
  const check = (10 - (sum % 10)) % 10;
  return check === n[9];
}
