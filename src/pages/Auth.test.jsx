/**
 * Tests for Auth page — signup form validation, signin flow, UI rendering.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Auth from './Auth';

// Mock auth context
const mockSignup = vi.fn();
const mockSignin = vi.fn();
const mockSignInWithGoogle = vi.fn();
const mockSignInWithMagicLink = vi.fn();
const mockResetPassword = vi.fn();

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    signup: mockSignup,
    signin: mockSignin,
    signInWithGoogle: mockSignInWithGoogle,
    signInWithMagicLink: mockSignInWithMagicLink,
    resetPassword: mockResetPassword,
  }),
}));

function renderAuth(mode = 'signup') {
  return render(
    <MemoryRouter>
      <Auth mode={mode} />
    </MemoryRouter>
  );
}

// Helper: accept terms checkbox so form validation can proceed
async function acceptTerms(user) {
  const checkbox = screen.getByRole('checkbox');
  await user.click(checkbox);
}

describe('Auth page — signup mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders signup form with name, email, password fields', () => {
    renderAuth('signup');

    expect(screen.getByPlaceholderText('Full name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
  });

  it('shows "Create your account" heading', () => {
    renderAuth('signup');
    expect(screen.getByText('Create your account')).toBeInTheDocument();
  });

  it('Create Account button is disabled when terms not accepted', () => {
    renderAuth('signup');
    const btn = screen.getByText(/Create Account/).closest('button');
    expect(btn).toBeDisabled();
  });

  it('Create Account button is enabled when terms are accepted', async () => {
    renderAuth('signup');
    const user = userEvent.setup();
    await acceptTerms(user);
    const btn = screen.getByText(/Create Account/).closest('button');
    expect(btn).not.toBeDisabled();
  });

  it('shows error when name is empty (terms accepted)', async () => {
    renderAuth('signup');
    const user = userEvent.setup();

    await acceptTerms(user);
    await user.click(screen.getByText(/Create Account/));
    expect(screen.getByText('Name is required')).toBeInTheDocument();
  });

  it('shows error when email is empty (terms accepted)', async () => {
    renderAuth('signup');
    const user = userEvent.setup();

    await acceptTerms(user);
    await user.type(screen.getByPlaceholderText('Full name'), 'Test User');
    await user.click(screen.getByText(/Create Account/));
    expect(screen.getByText('Email is required')).toBeInTheDocument();
  });

  it('shows error when password is empty (terms accepted)', async () => {
    renderAuth('signup');
    const user = userEvent.setup();

    await acceptTerms(user);
    await user.type(screen.getByPlaceholderText('Full name'), 'Test User');
    await user.type(screen.getByPlaceholderText('Email address'), 'test@test.com');
    await user.click(screen.getByText(/Create Account/));
    expect(screen.getByText('Password is required')).toBeInTheDocument();
  });

  it('shows error when password is too short (terms accepted)', async () => {
    renderAuth('signup');
    const user = userEvent.setup();

    await acceptTerms(user);
    await user.type(screen.getByPlaceholderText('Full name'), 'Test User');
    await user.type(screen.getByPlaceholderText('Email address'), 'test@test.com');
    await user.type(screen.getByPlaceholderText('Password'), 'short');
    await user.click(screen.getByText(/Create Account/));
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
  });

  it('shows Terms and Privacy links', () => {
    renderAuth('signup');
    expect(screen.getByText('Terms of Service')).toBeInTheDocument();
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
  });

  it('has link to sign in', () => {
    renderAuth('signup');
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });
});

describe('Auth page — signin mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders signin form without name field', () => {
    renderAuth('signin');

    expect(screen.queryByPlaceholderText('Full name')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
  });

  it('shows "Welcome back" heading', () => {
    renderAuth('signin');
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
  });

  it('shows magic link and forgot password options', () => {
    renderAuth('signin');
    expect(screen.getByText(/Sign in with magic link/)).toBeInTheDocument();
    expect(screen.getByText('Forgot password?')).toBeInTheDocument();
  });

  it('shows error on invalid credentials', async () => {
    mockSignin.mockRejectedValue(new Error('Invalid login credentials'));
    renderAuth('signin');
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('Email address'), 'test@test.com');
    await user.type(screen.getByPlaceholderText('Password'), 'wrongpassword');
    await user.click(screen.getByText(/Sign In/));

    expect(await screen.findByText('Invalid login credentials')).toBeInTheDocument();
  });

  it('has link to sign up', () => {
    renderAuth('signin');
    expect(screen.getByText('Sign Up Free')).toBeInTheDocument();
  });

  it('renders Google SSO button', () => {
    renderAuth('signin');
    expect(screen.getByText('Google')).toBeInTheDocument();
  });
});
