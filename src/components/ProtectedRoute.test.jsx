/**
 * Tests for ProtectedRoute component — auth gating, consent redirect, onboarding redirect.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

// Mock useAuth
const mockAuth = { user: null, profile: null, loading: false };
vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

function renderWithRouter(initialPath, children) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/signin" element={<div data-testid="signin-page">Sign In</div>} />
        <Route path="/accept-terms" element={
          <ProtectedRoute><div data-testid="accept-terms-page">Accept Terms</div></ProtectedRoute>
        } />
        <Route path="/onboarding" element={
          <ProtectedRoute><div data-testid="onboarding-page">Onboarding</div></ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute><div data-testid="dashboard-page">Dashboard</div></ProtectedRoute>
        } />
        {children}
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it('redirects to /signin when not authenticated', () => {
    mockAuth.user = null;
    mockAuth.profile = null;
    mockAuth.loading = false;

    renderWithRouter('/dashboard');

    expect(screen.getByTestId('signin-page')).toBeInTheDocument();
  });

  it('shows loading spinner while auth is loading', () => {
    mockAuth.user = null;
    mockAuth.profile = null;
    mockAuth.loading = true;

    const { container } = renderWithRouter('/dashboard');

    // Should show a spinner, not redirect to signin
    expect(screen.queryByTestId('signin-page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-page')).not.toBeInTheDocument();
  });

  it('redirects to /accept-terms when terms not accepted', () => {
    mockAuth.user = { id: 'user-1' };
    mockAuth.profile = { terms_accepted_at: null, onboarding_completed: true };
    mockAuth.loading = false;

    renderWithRouter('/dashboard');

    expect(screen.getByTestId('accept-terms-page')).toBeInTheDocument();
  });

  it('redirects to /onboarding when onboarding not completed', () => {
    mockAuth.user = { id: 'user-1' };
    mockAuth.profile = { terms_accepted_at: '2025-01-01T00:00:00Z', onboarding_completed: false };
    mockAuth.loading = false;

    renderWithRouter('/dashboard');

    expect(screen.getByTestId('onboarding-page')).toBeInTheDocument();
  });

  it('renders children when fully authenticated', () => {
    mockAuth.user = { id: 'user-1' };
    mockAuth.profile = { terms_accepted_at: '2025-01-01T00:00:00Z', onboarding_completed: true };
    mockAuth.loading = false;

    renderWithRouter('/dashboard');

    expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
  });

  it('does not redirect away from /accept-terms page itself', () => {
    mockAuth.user = { id: 'user-1' };
    mockAuth.profile = { terms_accepted_at: null, onboarding_completed: false };
    mockAuth.loading = false;

    renderWithRouter('/accept-terms');

    expect(screen.getByTestId('accept-terms-page')).toBeInTheDocument();
  });

  it('does not redirect away from /onboarding page itself', () => {
    mockAuth.user = { id: 'user-1' };
    mockAuth.profile = { terms_accepted_at: '2025-01-01T00:00:00Z', onboarding_completed: false };
    mockAuth.loading = false;

    renderWithRouter('/onboarding');

    expect(screen.getByTestId('onboarding-page')).toBeInTheDocument();
  });
});
