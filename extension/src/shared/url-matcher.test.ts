import { describe, it, expect } from 'vitest';
import { matchUrl, matchBody } from './url-matcher';

describe('matchUrl', () => {
  describe('exact', () => {
    it('matches identical URLs', () => {
      expect(matchUrl('https://api.example.com/users', 'https://api.example.com/users', 'exact')).toBe(true);
    });

    it('rejects different URLs', () => {
      expect(matchUrl('https://api.example.com/users', 'https://api.example.com/posts', 'exact')).toBe(false);
    });

    it('ignores hash fragments', () => {
      expect(matchUrl('https://api.example.com/users#section', 'https://api.example.com/users', 'exact')).toBe(true);
    });
  });

  describe('wildcard', () => {
    it('matches ** for any path segments', () => {
      expect(matchUrl('https://api.example.com/v1/users/123', '**/users/**', 'wildcard')).toBe(true);
    });

    it('matches * for single path segment', () => {
      expect(matchUrl('https://api.example.com/users/123', 'https://api.example.com/users/*', 'wildcard')).toBe(true);
    });

    it('* does not match slashes', () => {
      expect(matchUrl('https://api.example.com/users/123/posts', 'https://api.example.com/users/*', 'wildcard')).toBe(false);
    });

    it('** matches multiple segments', () => {
      expect(matchUrl('https://example.com/api/v1/users/123/posts', '**/api/**/posts', 'wildcard')).toBe(true);
    });

    it('matches full URL with wildcard origin', () => {
      expect(matchUrl('https://api.example.com/users', '**/users', 'wildcard')).toBe(true);
    });

    it('rejects non-matching', () => {
      expect(matchUrl('https://api.example.com/posts', '**/users', 'wildcard')).toBe(false);
    });
  });

  describe('regex', () => {
    it('matches regex pattern', () => {
      expect(matchUrl('https://api.example.com/users/123', '/users/\\d+', 'regex')).toBe(true);
    });

    it('rejects non-matching regex', () => {
      expect(matchUrl('https://api.example.com/users/abc', '/users/\\d+$', 'regex')).toBe(false);
    });

    it('handles invalid regex gracefully', () => {
      expect(matchUrl('https://test.com', '[invalid', 'regex')).toBe(false);
    });
  });

  it('returns false for empty pattern', () => {
    expect(matchUrl('https://test.com', '', 'exact')).toBe(false);
  });
});

describe('matchBody', () => {
  it('returns true when no pattern specified', () => {
    expect(matchBody('{"foo":"bar"}', undefined)).toBe(true);
  });

  it('returns false when pattern specified but no body', () => {
    expect(matchBody(null, '{"foo":"bar"}')).toBe(false);
  });

  it('matches partial JSON object', () => {
    expect(matchBody('{"email":"test@test.com","name":"John"}', '{"email":"test@test.com"}')).toBe(true);
  });

  it('matches with wildcard value', () => {
    expect(matchBody('{"email":"test@test.com"}', '{"email":"*"}')).toBe(true);
  });

  it('matches nested objects', () => {
    expect(matchBody('{"user":{"name":"John","age":30}}', '{"user":{"name":"John"}}')).toBe(true);
  });

  it('rejects non-matching body', () => {
    expect(matchBody('{"email":"test@test.com"}', '{"email":"other@test.com"}')).toBe(false);
  });

  it('matches array elements', () => {
    expect(matchBody('[{"id":1},{"id":2}]', '[{"id":1}]')).toBe(true);
  });

  it('falls back to string includes for non-JSON', () => {
    expect(matchBody('hello world', 'world')).toBe(true);
  });
});
