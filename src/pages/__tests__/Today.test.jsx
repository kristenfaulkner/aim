/**
 * Tests for the Today page — mode detection, rendering, and interactions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock hooks and dependencies
const mockProfile = { full_name: 'Kristen Faulkner', ftp_watts: 280 };
const mockDailyMetrics = { recovery_score: 82, hrv_ms: 121, total_sleep_seconds: 25920 };
const mockActivity = { id: 'act-001', name: 'Morning Ride', duration_seconds: 5100, started_at: new Date().toISOString() };

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-001' },
    profile: mockProfile,
    signout: vi.fn(),
  }),
}));

vi.mock('../../hooks/useResponsive', () => ({
  useResponsive: () => ({ isMobile: false, isTablet: false, isDesktop: true }),
}));

let mockDashData = {
  dailyMetrics: mockDailyMetrics,
  activity: mockActivity,
  checkinStatus: null,
  setCheckinStatus: vi.fn(),
  connectedIntegrations: ['strava'],
  loading: false,
  error: null,
  refetch: vi.fn(),
};

vi.mock('../../hooks/useDashboardData', () => ({
  useDashboardData: () => mockDashData,
}));

let mockIntelligence = {
  data: null,
  loading: false,
  error: null,
  refetch: vi.fn(),
};

vi.mock('../../hooks/useTodayIntelligence', () => ({
  useTodayIntelligence: () => mockIntelligence,
}));

// Mock sub-components to isolate page logic
vi.mock('../../components/today/AIBriefing', () => ({
  default: ({ briefing }) => <div data-testid="ai-briefing">{briefing}</div>,
}));

vi.mock('../../components/today/InsightCard', () => ({
  default: ({ insight }) => <div data-testid="insight-card">{insight.headline}</div>,
}));

vi.mock('../../components/today/WorkoutCard', () => ({
  default: ({ workout }) => <div data-testid="workout-card">{workout.name}</div>,
}));

vi.mock('../../components/today/CollapsedMorning', () => ({
  default: ({ text }) => <div data-testid="collapsed-morning">{text}</div>,
}));

vi.mock('../../components/today/AskClaude', () => ({
  default: ({ mode }) => <div data-testid="ask-claude">{mode}</div>,
}));

vi.mock('../../components/today/DataGaps', () => ({
  default: ({ dataGaps }) => <div data-testid="data-gaps">{dataGaps.length} gaps</div>,
}));

vi.mock('../../components/dashboard/CheckInModal', () => ({
  default: () => null,
  CheckInSummaryCard: () => null,
}));

vi.mock('../../components/dashboard/NutritionLogger', () => ({
  default: () => null,
}));

vi.mock('../../components/TrialBanner', () => ({
  default: () => null,
}));

import Today from '../Today';

function renderToday() {
  return render(
    <MemoryRouter>
      <Today />
    </MemoryRouter>
  );
}

describe('Today Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDashData = {
      dailyMetrics: mockDailyMetrics,
      activity: mockActivity,
      checkinStatus: null,
      setCheckinStatus: vi.fn(),
      connectedIntegrations: ['strava'],
      loading: false,
      error: null,
      refetch: vi.fn(),
    };
    mockIntelligence = {
      data: null,
      loading: false,
      error: null,
      refetch: vi.fn(),
    };
  });

  it('renders greeting with athlete name', () => {
    renderToday();
    expect(screen.getByText(/Kristen/)).toBeInTheDocument();
  });

  it('renders "Today" nav item as active', () => {
    renderToday();
    const todayBtn = screen.getByRole('button', { name: 'Today' });
    expect(todayBtn).toBeInTheDocument();
  });

  it('renders readiness ring when recovery score exists', () => {
    renderToday();
    expect(screen.getByText('82')).toBeInTheDocument();
    expect(screen.getByText('Green')).toBeInTheDocument();
  });

  it('shows empty state when no integrations connected', () => {
    mockDashData = { ...mockDashData, activity: null, connectedIntegrations: [] };
    renderToday();
    expect(screen.getByText('Connect your apps to get started')).toBeInTheDocument();
  });

  it('renders AI briefing when intelligence data is available', () => {
    mockIntelligence = {
      data: {
        mode: 'POST_RIDE',
        intelligence: {
          briefing: 'Strong session today.',
          insights: [{ type: 'positive', icon: '🟢', headline: 'EF 1.70', takeaway: 'Great work' }],
          contextCards: [],
          collapsedMorning: 'Morning readiness was 82.',
          dataGaps: [],
        },
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderToday();
    expect(screen.getByTestId('ai-briefing')).toBeInTheDocument();
    expect(screen.getByText('Strong session today.')).toBeInTheDocument();
  });

  it('renders insight cards from intelligence data', () => {
    mockIntelligence = {
      data: {
        mode: 'MORNING_RECOVERY',
        intelligence: {
          briefing: 'Rest day guidance.',
          insights: [
            { type: 'positive', icon: '🟢', headline: 'HRV 121ms', takeaway: 'Good recovery' },
            { type: 'warning', icon: '⚠️', headline: 'Sleep debt 3.2h', takeaway: 'Prioritize sleep' },
          ],
          contextCards: [],
          dataGaps: [],
        },
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderToday();
    const cards = screen.getAllByTestId('insight-card');
    expect(cards).toHaveLength(2);
    expect(screen.getByText('HRV 121ms')).toBeInTheDocument();
    expect(screen.getByText('Sleep debt 3.2h')).toBeInTheDocument();
  });

  it('renders workout card in MORNING_WITH_PLAN mode', () => {
    mockIntelligence = {
      data: {
        mode: 'MORNING_WITH_PLAN',
        intelligence: {
          briefing: 'Ready for sweet spot.',
          insights: [],
          contextCards: [],
          workout: { name: 'Sweet Spot 3x20', structure: '3x20min', duration_min: 85, target_power: '265W', est_tss: 142 },
          dataGaps: [],
        },
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderToday();
    expect(screen.getByTestId('workout-card')).toBeInTheDocument();
    expect(screen.getByText('Sweet Spot 3x20')).toBeInTheDocument();
  });

  it('renders collapsed morning in POST_RIDE mode', () => {
    mockIntelligence = {
      data: {
        mode: 'POST_RIDE',
        intelligence: {
          briefing: 'Post-ride analysis.',
          insights: [],
          contextCards: [],
          collapsedMorning: 'This morning: readiness 82.',
          dataGaps: [],
        },
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderToday();
    expect(screen.getByTestId('collapsed-morning')).toBeInTheDocument();
    expect(screen.getByText('This morning: readiness 82.')).toBeInTheDocument();
  });

  it('renders data gaps when present', () => {
    mockIntelligence = {
      data: {
        mode: 'MORNING_RECOVERY',
        intelligence: {
          briefing: 'Rest day.',
          insights: [],
          contextCards: [],
          dataGaps: [
            { source: 'Blood Panel', lastUpdated: '9 months ago', prompt: 'Upload new panel.' },
          ],
        },
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderToday();
    expect(screen.getByTestId('data-gaps')).toBeInTheDocument();
    expect(screen.getByText('1 gaps')).toBeInTheDocument();
  });

  it('shows loading skeletons while intelligence is loading', () => {
    mockIntelligence = { data: null, loading: true, error: null, refetch: vi.fn() };
    renderToday();
    // Should not show briefing but should show skeleton
    expect(screen.queryByTestId('ai-briefing')).not.toBeInTheDocument();
  });

  it('shows error state with retry button', () => {
    const refetchFn = vi.fn();
    mockIntelligence = { data: null, loading: false, error: 'API timeout', refetch: refetchFn };
    renderToday();
    expect(screen.getByText('Intelligence unavailable')).toBeInTheDocument();
    expect(screen.getByText('API timeout')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Retry'));
    expect(refetchFn).toHaveBeenCalledTimes(1);
  });

  it('renders Ask Claude with correct mode', () => {
    mockIntelligence = {
      data: {
        mode: 'POST_RIDE',
        intelligence: { briefing: 'Done.', insights: [], contextCards: [], dataGaps: [] },
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderToday();
    expect(screen.getByTestId('ask-claude')).toBeInTheDocument();
    expect(screen.getByText('POST_RIDE')).toBeInTheDocument();
  });

  it('does not show workout card in POST_RIDE mode', () => {
    mockIntelligence = {
      data: {
        mode: 'POST_RIDE',
        intelligence: {
          briefing: 'Post ride.',
          insights: [],
          contextCards: [],
          workout: { name: 'Ignored Workout' },
          dataGaps: [],
        },
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderToday();
    expect(screen.queryByTestId('workout-card')).not.toBeInTheDocument();
  });

  it('does not show collapsed morning in morning modes', () => {
    mockIntelligence = {
      data: {
        mode: 'MORNING_RECOVERY',
        intelligence: {
          briefing: 'Morning.',
          insights: [],
          contextCards: [],
          collapsedMorning: 'Should not show.',
          dataGaps: [],
        },
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderToday();
    expect(screen.queryByTestId('collapsed-morning')).not.toBeInTheDocument();
  });
});
