/**
 * Unit tests for the API fetch utility.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getToken, setToken, clearToken, apiFetch } from './api.js';

describe('token management', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('setToken stores and getToken retrieves', () => {
    setToken('test-token-abc');
    expect(getToken()).toBe('test-token-abc');
  });

  it('getToken returns null when no token', () => {
    expect(getToken()).toBeNull();
  });

  it('clearToken removes the token', () => {
    setToken('test-token-abc');
    clearToken();
    expect(getToken()).toBeNull();
  });
});

describe('apiFetch', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds Bearer token to Authorization header', async () => {
    setToken('my-token');
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: 'test' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await apiFetch('/activities/list');

    expect(mockFetch).toHaveBeenCalledWith('/api/activities/list', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer my-token',
      },
    });
  });

  it('does not add Authorization header when no token', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: 'test' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await apiFetch('/health/panels');

    const callHeaders = mockFetch.mock.calls[0][1].headers;
    expect(callHeaders.Authorization).toBeUndefined();
  });

  it('prepends /api to the path', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal('fetch', mockFetch);

    await apiFetch('/user/profile');

    expect(mockFetch.mock.calls[0][0]).toBe('/api/user/profile');
  });

  it('throws error with message from response on failure', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Unauthorized' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(apiFetch('/protected')).rejects.toThrow('Unauthorized');
  });

  it('attaches status code to error', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Not found' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    try {
      await apiFetch('/missing');
    } catch (err) {
      expect(err.status).toBe(404);
    }
  });

  it('passes through custom options', async () => {
    setToken('tok');
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await apiFetch('/activities/annotate', {
      method: 'POST',
      body: JSON.stringify({ notes: 'Great ride' }),
    });

    expect(mockFetch.mock.calls[0][1].method).toBe('POST');
    expect(mockFetch.mock.calls[0][1].body).toBe('{"notes":"Great ride"}');
  });
});
