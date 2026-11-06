import { describe, expect, it, vi } from 'vitest';
import { PREFIX_LENGTH, PWNED_RANGE_URL, checkPassword, findSuffix, sha1Hex, splitHash } from '../src/pwned';

// SHA-1("password") is a published test vector, so the hash routine is checked against a known value.
const PASSWORD_SHA1 = '5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8';

describe('sha1Hex', () => {
  it('matches the known SHA-1 of "password", upper-case hex', async () => {
    expect(await sha1Hex('password')).toBe(PASSWORD_SHA1);
  });

  it('hashes UTF-8 (accented) text without throwing and gives 40 hex chars', async () => {
    const h = await sha1Hex('coração123');
    expect(h).toMatch(/^[0-9A-F]{40}$/);
    expect(h).not.toBe(await sha1Hex('coracao123'));
  });
});

describe('splitHash', () => {
  it('keeps exactly 5 characters as the prefix and 35 as the suffix', () => {
    const { prefix, suffix } = splitHash(PASSWORD_SHA1);
    expect(prefix).toBe('5BAA6');
    expect(prefix).toHaveLength(PREFIX_LENGTH);
    expect(suffix).toBe('1E4C9B93F3F0682250B6CF8331B7EE68FD8');
    expect(suffix).toHaveLength(35);
  });
});

describe('findSuffix', () => {
  const body = [
    '0018A45C4D1DEF81644B54AB7F969B88D65:1',
    '1E4C9B93F3F0682250B6CF8331B7EE68FD8:3861493',
    'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF:0', // padding row
    'broken line without separator',
    '',
  ].join('\r\n');

  it('returns the count of a matching suffix', () => {
    expect(findSuffix(body, '1E4C9B93F3F0682250B6CF8331B7EE68FD8')).toBe(3861493);
  });

  it('is case-insensitive on the suffix', () => {
    expect(findSuffix(body, '1e4c9b93f3f0682250b6cf8331b7ee68fd8')).toBe(3861493);
  });

  it('returns 0 when the suffix is absent or only present as a padding row', () => {
    expect(findSuffix(body, 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')).toBe(0);
    expect(findSuffix(body, 'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF')).toBe(0);
  });
});

describe('checkPassword (k-anonymity)', () => {
  function fakeFetch(bodyText: string, ok = true, status = 200) {
    return vi.fn(async (_url: string, _init?: RequestInit) => ({ ok, status, text: async () => bodyText }));
  }

  it('sends only the 5-character prefix, with Add-Padding, never the password or full hash', async () => {
    const fetchImpl = fakeFetch('1E4C9B93F3F0682250B6CF8331B7EE68FD8:42');
    // The API host itself contains the word "password", so the secret is a distinctive string.
    const secret = 'minhaSenhaSecreta!';
    const hash = await sha1Hex(secret);
    await checkPassword(secret, fetchImpl);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(PWNED_RANGE_URL + hash.slice(0, 5));
    expect(url).not.toContain(secret);
    expect(url).not.toContain(hash);
    expect(url).not.toContain(hash.slice(5));
    expect(url.length - PWNED_RANGE_URL.length).toBe(PREFIX_LENGTH);
    expect((init?.headers as Record<string, string>)['Add-Padding']).toBe('true');
    expect(init?.body).toBeUndefined();
  });

  it('reports leaked with the count when the suffix is in the range', async () => {
    const result = await checkPassword('password', fakeFetch('1E4C9B93F3F0682250B6CF8331B7EE68FD8:42'));
    expect(result).toEqual({ status: 'leaked', count: 42 });
  });

  it('reports safe when the suffix is not in the range', async () => {
    const result = await checkPassword('password', fakeFetch('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:5'));
    expect(result).toEqual({ status: 'safe' });
  });

  it('throws on a non-OK HTTP response so the UI can show "could not check"', async () => {
    await expect(checkPassword('password', fakeFetch('', false, 503))).rejects.toThrow(/503/);
  });
});
