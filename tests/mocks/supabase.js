/**
 * Mock Supabase client for testing.
 * Replaces the real Supabase client with a controllable mock.
 */
import { vi } from 'vitest';

// Chainable query builder mock
function createQueryBuilder(resolvedData = { data: null, error: null }) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolvedData),
    then: (resolve) => resolve(resolvedData),
  };
  return builder;
}

export function createMockSupabase(overrides = {}) {
  const mockAuth = {
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signInWithOAuth: vi.fn(),
    signInWithOtp: vi.fn(),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    ...overrides.auth,
  };

  const mockFrom = vi.fn().mockReturnValue(createQueryBuilder());

  return {
    auth: mockAuth,
    from: mockFrom,
    ...overrides,
  };
}
