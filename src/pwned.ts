/**
 * Leaked-password check against Have I Been Pwned's Pwned Passwords API using
 * k-anonymity (https://haveibeenpwned.com/API/v3#SearchingPwnedPasswordsByRange):
 *
 *   1. SHA-1 the password locally with Web Crypto.
 *   2. Send ONLY the first 5 hex characters of the hash to the API.
 *   3. The API returns every suffix sharing that prefix (~800 rows, padded to
 *      800–1000 with `Add-Padding: true`, padded rows have count 0).
 *   4. Compare the remaining 35 characters locally.
 *
 * The password and its full hash never leave the browser.
 */

export const PWNED_RANGE_URL = 'https://api.pwnedpasswords.com/range/';
export const PREFIX_LENGTH = 5;

export type PwnedCheck = { status: 'safe' } | { status: 'leaked'; count: number };

type FetchLike = (input: string, init?: RequestInit) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

/** Hex-encoded, upper-case SHA-1 of a UTF-8 string, computed with Web Crypto. */
export async function sha1Hex(text: string, subtle: SubtleCrypto = globalThis.crypto.subtle): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await subtle.digest('SHA-1', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

/** Splits a full hash into the 5-char prefix that is sent and the 35-char suffix that stays local. */
export function splitHash(hash: string): { prefix: string; suffix: string } {
  const h = hash.toUpperCase();
  return { prefix: h.slice(0, PREFIX_LENGTH), suffix: h.slice(PREFIX_LENGTH) };
}

/**
 * Parses the `SUFFIX:COUNT` lines of a range response and returns the count for
 * the given suffix, or 0 when absent. Padding rows (count 0) are ignored.
 */
export function findSuffix(rangeBody: string, suffix: string): number {
  const wanted = suffix.toUpperCase();
  for (const raw of rangeBody.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const sep = line.indexOf(':');
    if (sep === -1) continue; // malformed line: ignore rather than fail the whole check
    const lineSuffix = line.slice(0, sep).toUpperCase();
    if (lineSuffix !== wanted) continue;
    const count = Number.parseInt(line.slice(sep + 1), 10);
    return Number.isFinite(count) ? count : 0;
  }
  return 0;
}

/** Full check. `fetchImpl` is injectable so tests never hit the network. */
export async function checkPassword(
  password: string,
  fetchImpl: FetchLike = fetch,
  subtle?: SubtleCrypto,
): Promise<PwnedCheck> {
  const hash = await sha1Hex(password, subtle);
  const { prefix, suffix } = splitHash(hash);
  const res = await fetchImpl(PWNED_RANGE_URL + prefix, {
    headers: { 'Add-Padding': 'true' },
  });
  if (!res.ok) throw new Error(`Pwned Passwords range request failed: HTTP ${res.status}`);
  const count = findSuffix(await res.text(), suffix);
  return count > 0 ? { status: 'leaked', count } : { status: 'safe' };
}
