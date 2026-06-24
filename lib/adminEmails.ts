// Pure allowlist matcher shared by client + server. The caller passes the
// appropriate env var (server: ADMIN_EMAILS/ADMIN_EMAIL; client:
// NEXT_PUBLIC_ADMIN_EMAILS/NEXT_PUBLIC_ADMIN_EMAIL) since client code can only
// read NEXT_PUBLIC_* values. No env access here keeps it usable in both.
export function emailInAllowlist(
  email: string | null | undefined,
  allowlist: string | undefined
): boolean {
  const list = (allowlist ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!email || list.length === 0) return false;
  return list.includes(email.trim().toLowerCase());
}
