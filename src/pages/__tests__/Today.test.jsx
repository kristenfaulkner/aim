/**
 * Tests for the Today page — mode detection, rendering, and interactions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock data
const mockProfile = { full_name: 'Kristen Faulkner', ftp_watts: 280 };
const mockDailyMetrics = { recovery_score: 82, hrv_ms: 121, total_sleep_seconds: 25920, deep_sleep_seconds: 5400, resting_hr_bpm: 47.5 };
const mockActivity = { id: 'act-001', name: 'Morning Ride', duration_seconds: 5100, started_at: new Date().toISOString(), tss: 120 };

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-001' },
    profile: mockProfile,
    signout: vi.fn(),
  }),
}));

vi.mock('../../context/PreferencesContext', () => ({
  usePreferences: () => ({ units: 'metric', temperatureUnit: 'celsius' }),
}));

vi.mock('../../hooks/useResponsive', () => ({
  useResponsive: () => ({ isMobile: false, isTablet: false, isDesktop: true }),
}));

let mockDashData = {
  dailyMetrics: mockDailyMetrics,
  activity: mockActivity,
  recentActivities: [],
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

vi.mock('../../hooks/usePrescription', () => ({
  usePrescription: () => ({ prescription: null, loading: false, refetch: vi.fn() }),
}));

// Mock sub-components
vi.mock('../../components/today/AIBriefing', () => ({
  default: ({ briefing }) => briefing ? <div data-testid="ai-briefing">{briefing}</div> : null,
}));

vi.mock('../../components/today/ReadinessHero', () => ({
  default: ({ score, contextCards }) => <div data-testid="readiness-hero">{score}</div>,
  ReadinessRing: ({ score }) => <div>{score}</div>,
}));

vi.mock('../../components/today/TodayCard', () => ({
  default: ({ mode, prepRecs, recoveryRecs, workout }) => (
    <div data-testid="today-card" data-mode={mode}>
      {workout && <span data-testid="workout-name">{workout.name}</span>}
      {(prepRecs || []).map((r, i) => <span key={i} data-testid="prep-rec">{r.title}</span>)}
      {(recoveryRecs || []).map((r, i) => <span key={i} data-testid="recovery-rec">{r.title}</span>)}
    </div>
  ),
}));

vi.mock('../../components/today/VitalsStrip', () => ({
  default: ({ vitals }) => vitals ? <div data-testid="vitals-strip">vitals</div> : null,
  computeVitals: (m) => m ? { hrv: { value: "121", unit: "ms" } } : null,
}));

vi.mock('../../components/today/ThisWeek', () => ({
  default: ({ data }) => data ? <div data-testid="this-week">week</div> : null,
  computeThisWeek: () => ({ days: [], total: 0, lastWeek: null }),
}));

vi.mock('../../components/today/CollapsedMorning', () => ({
  default: ({ text }) => text ? <div data-testid="collapsed-morning">{text}</div> : null,
}));

vi.mock('../../components/today/RideSummary', () => ({
  default: ({ activity }) => activity ? <div data-testid="ride-summary">{activity.name}</div> : null,
}));

vi.mock('../../components/today/AskClaude', () => ({
  default: ({ mode }) => <div data-testid="ask-claude">{mode}</div>,
}));

vi.mock('../../components/today/DataGaps', () => ({
  default: ({ dataGaps }) => <div data-testid="data-gaps">{dataGaps.length} gaps</div>,
}));

vi.mock('../../components/dashboard/CheckInModal', () => ({
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
      recentActivities: [],
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
          prepRecs: [],
          recoveryRecs: [{ icon: '🍎', title: 'Refuel now' }],
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

  it('renders prepRecs in morning mode', () => {
    mockDashData = { ...mockDashData, activity: null };
    mockIntelligence = {
      data: {
        mode: 'MORNING_NO_PLAN',
        intelligence: {
          briefing: 'Rest day guidance.',
          prepRecs: [
            { icon: '💧', title: 'Extra 500ml with sodium' },
            { icon: '🛏️', title: 'Lights out by 9:30' },
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
    const recs = screen.getAllByTestId('prep-rec');
    expect(recs).toHaveLength(2);
  });

  it('renders workout in MORNING_WITH_PLAN mode', () => {
    mockDashData = { ...mockDashData, activity: null };
    mockIntelligence = {
      data: {
        mode: 'MORNING_WITH_PLAN',
        intelligence: {
          briefing: 'Ready for sweet spot.',
          prepRecs: [],
          contextCards: [],
          workout: { name: 'Sweet Spot 3x20', structure: '3x20min', duration: '1h 25m', targetPower: '265W', tss: 142, hasPlannedWorkout: true },
          dataGaps: [],
        },
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderToday();
    expect(screen.getByTestId('workout-name')).toBeInTheDocument();
    expect(screen.getByText('Sweet Spot 3x20')).toBeInTheDocument();
  });

  it('renders collapsed morning in POST_RIDE mode', () => {
    mockIntelligence = {
      data: {
        mode: 'POST_RIDE',
        intelligence: {
          briefing: 'Post-ride analysis.',
          prepRecs: [],
          recoveryRecs: [],
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

  it('renders ride summary in POST_RIDE mode', () => {
    mockIntelligence = {
      data: {
        mode: 'POST_RIDE',
        intelligence: {
          briefing: 'Good ride.',
          prepRecs: [],
          recoveryRecs: [],
          contextCards: [],
          dataGaps: [],
        },
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderToday();
    expect(screen.getByTestId('ride-summary')).toBeInTheDocument();
  });

  it('renders data gaps when present', () => {
    mockDashData = { ...mockDashData, activity: null };
    mockIntelligence = {
      data: {
        mode: 'MORNING_NO_PLAN',
        intelligence: {
          briefing: 'Rest day.',
          prepRecs: [],
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
        intelligence: { briefing: 'Done.', prepRecs: [], recoveryRecs: [], contextCards: [], dataGaps: [] },
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderToday();
    expect(screen.getByTestId('ask-claude')).toBeInTheDocument();
    expect(screen.getByText('POST_RIDE')).toBeInTheDocument();
  });

  it('does not show collapsed morning in morning modes', () => {
    mockDashData = { ...mockDashData, activity: null };
    mockIntelligence = {
      data: {
        mode: 'MORNING_NO_PLAN',
        intelligence: {
          briefing: 'Morning.',
          prepRecs: [],
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

  it('renders readiness hero in morning mode', () => {
    mockDashData = { ...mockDashData, activity: null };
    mockIntelligence = {
      data: {
        mode: 'MORNING_NO_PLAN',
        intelligence: { briefing: 'Morning.', prepRecs: [], contextCards: [], dataGaps: [] },
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderToday();
    expect(screen.getByTestId('readiness-hero')).toBeInTheDocument();
  });

  it('renders vitals strip in morning mode', () => {
    mockDashData = { ...mockDashData, activity: null };
    mockIntelligence = {
      data: {
        mode: 'MORNING_NO_PLAN',
        intelligence: { briefing: 'Morning.', prepRecs: [], contextCards: [], dataGaps: [] },
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderToday();
    expect(screen.getByTestId('vitals-strip')).toBeInTheDocument();
  });

  it('renders this week in both modes', () => {
    mockIntelligence = {
      data: {
        mode: 'POST_RIDE',
        intelligence: { briefing: 'Ride done.', prepRecs: [], recoveryRecs: [], contextCards: [], dataGaps: [] },
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderToday();
    expect(screen.getByTestId('this-week')).toBeInTheDocument();
  });
});
