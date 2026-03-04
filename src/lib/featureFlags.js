/**
 * Feature flags controlled via environment variables.
 * VITE_ prefix required for Vite to expose to client code.
 */

// When false: no paywalls, no pricing page, no trial banners, no subscription UI.
// When true: full Stripe payment flow is active.
export const PAYMENTS_ENABLED = import.meta.env.VITE_PAYMENTS_ENABLED === 'true';
