import type { UrlMatchType } from './types';

export function matchUrl(url: string, pattern: string, type: UrlMatchType): boolean {
  if (!pattern) return false;

  switch (type) {
    case 'exact':
      return stripHash(url) === stripHash(pattern);

    case 'wildcard':
      return matchWildcard(stripHash(url), pattern);

    case 'regex':
      return matchRegex(stripHash(url), pattern);

    default:
      return false;
  }
}

function stripHash(url: string): string {
  const idx = url.indexOf('#');
  return idx >= 0 ? url.substring(0, idx) : url;
}

function matchWildcard(url: string, pattern: string): boolean {
  // Convert wildcard pattern to regex:
  // ** matches any characters (including /)
  // * matches a single path segment (no /)

  // 1. Protect ** by replacing with placeholder
  let regex = pattern.replace(/\*\*/g, '§DOUBLESTAR§');
  // 2. Escape regex special chars (except *)
  regex = regex.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  // 3. Replace single * with non-slash match
  regex = regex.replace(/\*/g, '[^/]*');
  // 4. Replace ** placeholder with match-all
  regex = regex.replace(/§DOUBLESTAR§/g, '.*');

  try {
    return new RegExp(`^${regex}$`).test(url);
  } catch {
    return false;
  }
}

function matchRegex(url: string, pattern: string): boolean {
  try {
    return new RegExp(pattern).test(url);
  } catch {
    return false;
  }
}

export function matchBody(body: string | null | undefined, pattern: string | undefined): boolean {
  if (!pattern) return true; // No body pattern = match any
  if (!body) return false;

  try {
    const bodyObj = JSON.parse(body);
    const patternObj = JSON.parse(pattern);
    return deepPartialMatch(bodyObj, patternObj);
  } catch {
    // If not JSON, do string includes
    return body.includes(pattern);
  }
}

function deepPartialMatch(actual: unknown, pattern: unknown): boolean {
  if (pattern === '*') return true;

  if (typeof pattern === 'string' && pattern === '*') return true;

  if (Array.isArray(pattern)) {
    if (!Array.isArray(actual)) return false;
    return pattern.every((patternItem) =>
      actual.some((actualItem) => deepPartialMatch(actualItem, patternItem)),
    );
  }

  if (pattern !== null && typeof pattern === 'object') {
    if (actual === null || typeof actual !== 'object') return false;
    return Object.entries(pattern as Record<string, unknown>).every(([key, val]) =>
      deepPartialMatch((actual as Record<string, unknown>)[key], val),
    );
  }

  return actual === pattern;
}
