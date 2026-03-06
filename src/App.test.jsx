/**
 * Tests for App component — route definitions and basic rendering.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

// Mock all page components to isolate route testing
vi.mock('./pages/Landing', () => ({ default: () => <div data-testid="landing">Landing</div> }));
vi.mock('./pages/Auth', () => ({ default: ({ mode }) => <div data-testid={`auth-${mode}`}>{mode}</div> }));
vi.mock('./pages/ResetPassword', () => ({ default: () => <div data-testid="reset-pw">Reset</div> }));
vi.mock('./pages/Contact', () => ({ default: () => <div data-testid="contact">Contact</div> }));
vi.mock('./pages/legal/PrivacyPolicy', () => ({ default: () => <div data-testid="privacy">Privacy</div> }));
vi.mock('./pages/legal/Terms', () => ({ default: () => <div data-testid="terms">Terms</div> }));
vi.mock('./pages/legal/CookiePolicy', () => ({ default: () => <div data-testid="cookies">Cookies</div> }));
vi.mock('./pages/legal/DataProcessing', () => ({ default: () => <div data-testid="data-processing">DP</div> }));
vi.mock('./pages/legal/GDPR', () => ({ default: () => <div data-testid="gdpr">GDPR</div> }));

// Mock protected route pages — ProtectedRoute will redirect if not authed
vi.mock('./pages/Today', () => ({ default: () => <div data-testid="today">Today</div> }));
vi.mock('./pages/DashboardLegacy', () => ({ default: () => <div data-testid="dashboard-legacy">DashboardLegacy</div> }));
vi.mock('./pages/ConnectApps', () => ({ default: () => <div data-testid="connect">Connect</div> }));
vi.mock('./pages/Boosters', () => ({ default: () => <div data-testid="boosters">Boosters</div> }));
vi.mock('./pages/HealthLab', () => ({ default: () => <div data-testid="healthlab">HealthLab</div> }));
vi.mock('./pages/Settings', () => ({ default: () => <div data-testid="settings">Settings</div> }));
vi.mock('./pages/Onboarding', () => ({ default: () => <div data-testid="onboarding">Onboarding</div> }));
vi.mock('./pages/AcceptTerms', () => ({ default: () => <div data-testid="accept-terms">AcceptTerms</div> }));
vi.mock('./pages/ActivityDetail', () => ({ default: () => <div data-testid="activity-detail">Activity</div> }));

// Mock ProtectedRoute to pass through for route testing
vi.mock('./components/ProtectedRoute', () => ({
  default: ({ children }) => <>{children}</>,
}));

function renderApp(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe('App routing', () => {
  // Public routes
  it('renders Landing at /', () => {
    renderApp('/');
    expect(screen.getByTestId('landing')).toBeInTheDocument();
  });

  it('renders signup at /signup', () => {
    renderApp('/signup');
    expect(screen.getByTestId('auth-signup')).toBeInTheDocument();
  });

  it('renders signin at /signin', () => {
    renderApp('/signin');
    expect(screen.getByTestId('auth-signin')).toBeInTheDocument();
  });

  it('renders reset password at /reset-password', () => {
    renderApp('/reset-password');
    expect(screen.getByTestId('reset-pw')).toBeInTheDocument();
  });

  it('renders contact at /contact', () => {
    renderApp('/contact');
    expect(screen.getByTestId('contact')).toBeInTheDocument();
  });

  // Legal routes
  it('renders privacy policy at /privacy', () => {
    renderApp('/privacy');
    expect(screen.getByTestId('privacy')).toBeInTheDocument();
  });

  it('renders terms at /terms', () => {
    renderApp('/terms');
    expect(screen.getByTestId('terms')).toBeInTheDocument();
  });

  it('renders cookie policy at /cookies', () => {
    renderApp('/cookies');
    expect(screen.getByTestId('cookies')).toBeInTheDocument();
  });

  it('renders data processing at /data-processing', () => {
    renderApp('/data-processing');
    expect(screen.getByTestId('data-processing')).toBeInTheDocument();
  });

  it('renders GDPR at /gdpr', () => {
    renderApp('/gdpr');
    expect(screen.getByTestId('gdpr')).toBeInTheDocument();
  });

  // Protected routes (ProtectedRoute mocked to pass through)
  it('renders today page at /dashboard', () => {
    renderApp('/dashboard');
    expect(screen.getByTestId('today')).toBeInTheDocument();
  });

  it('renders connect apps at /connect', () => {
    renderApp('/connect');
    expect(screen.getByTestId('connect')).toBeInTheDocument();
  });

  it('renders boosters at /boosters', () => {
    renderApp('/boosters');
    expect(screen.getByTestId('boosters')).toBeInTheDocument();
  });

  it('renders health lab at /health-lab', () => {
    renderApp('/health-lab');
    expect(screen.getByTestId('healthlab')).toBeInTheDocument();
  });

  it('renders settings at /settings', () => {
    renderApp('/settings');
    expect(screen.getByTestId('settings')).toBeInTheDocument();
  });

  it('renders onboarding at /onboarding', () => {
    renderApp('/onboarding');
    expect(screen.getByTestId('onboarding')).toBeInTheDocument();
  });

  it('renders accept-terms at /accept-terms', () => {
    renderApp('/accept-terms');
    expect(screen.getByTestId('accept-terms')).toBeInTheDocument();
  });

  it('renders activity detail at /activity/:id', () => {
    renderApp('/activity/act-uuid-001');
    expect(screen.getByTestId('activity-detail')).toBeInTheDocument();
  });
});
