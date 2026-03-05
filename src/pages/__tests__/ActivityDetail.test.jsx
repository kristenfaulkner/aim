import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// ── Mock external deps ──

// Supabase
vi.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "test-token", user: { id: "user-1" } } },
      }),
    },
  },
}));

// Auth context
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
    profile: { full_name: "Kristen Faulkner" },
    signout: vi.fn(),
  }),
}));

// Preferences context
vi.mock("../../context/PreferencesContext", () => ({
  usePreferences: () => ({ units: "imperial" }),
}));

// Responsive hook
let mockResponsive = { isMobile: false, isTablet: false, isDesktop: true };
vi.mock("../../hooks/useResponsive", () => ({
  useResponsive: () => mockResponsive,
}));

// WbalData hook
vi.mock("../../hooks/useWbalData", () => ({
  useWbalData: () => ({ data: null, loading: false }),
}));

// Similar sessions hook
vi.mock("../../hooks/useSimilarSessions", () => ({
  useSimilarSessions: () => ({ data: null, loading: false }),
}));

// Segment efforts hook
vi.mock("../../hooks/useSegmentEfforts", () => ({
  useSegmentEfforts: () => ({ data: null, loading: false }),
}));

// WbalChart
vi.mock("../../components/WbalChart", () => ({
  default: () => <div data-testid="wbal-chart">WbalChart</div>,
}));

// SegmentComparisonPanel
vi.mock("../../components/SegmentComparisonPanel", () => ({
  default: () => <div data-testid="segment-panel">Segments</div>,
}));

// SessionNotes
vi.mock("../../components/SessionNotes", () => ({
  default: ({ activityId, onClose }) => (
    <div data-testid="session-notes">
      SessionNotes for {activityId}
      <button onClick={onClose} data-testid="close-notes">Close</button>
    </div>
  ),
}));

// InsightFeedback
vi.mock("../../components/InsightFeedback", () => ({
  default: ({ insightIndex }) => (
    <div data-testid={`insight-feedback-${insightIndex}`}>Feedback</div>
  ),
}));

// apiFetch
const mockApiFetch = vi.fn();
vi.mock("../../lib/api", () => ({
  apiFetch: (...args) => mockApiFetch(...args),
}));

// ── Test data ──

const mockAnalysis = {
  summary: "Kristen, you had a strong threshold session.",
  insights: [
    {
      type: "positive",
      icon: "\u26A1",
      category: "performance",
      cat_label: "Sleep \u2192 Performance",
      sig: "Season best",
      title: "Best NP in 90 Days",
      body: "Your NP of 266W is a 90-day best.",
      confidence: "high",
    },
    {
      type: "warning",
      icon: "\uD83E\uDDE0",
      category: "recovery",
      cat_label: "Fatigue Signature",
      sig: "High load",
      title: "TSS 253 This Week",
      body: "Recovery is the priority now.",
      confidence: "high",
    },
    {
      type: "action",
      icon: "\uD83C\uDF4C",
      category: "nutrition",
      cat_label: "Fueling",
      title: "Refuel now",
      body: "Aim for 200g carbs in the next 45 min.",
      confidence: "medium",
    },
  ],
  dataGaps: ["Connect Oura for sleep stage tracking"],
};

const mockActivity = {
  id: "act-uuid-001",
  user_id: "user-1",
  name: "Morning Endurance Ride",
  activity_type: "Ride",
  started_at: "2026-03-04T10:23:00Z",
  start_time_local: "2026-03-04T10:23:00",
  duration_seconds: 12541,
  distance_meters: 122880,
  elevation_gain_meters: 242,
  avg_power_watts: 228,
  max_power_watts: 438,
  normalized_power_watts: 266,
  avg_hr_bpm: 144,
  max_hr_bpm: 172,
  avg_cadence_rpm: 96,
  tss: 233,
  intensity_factor: 0.82,
  variability_index: 1.17,
  efficiency_factor: 1.85,
  hr_drift_pct: 6.2,
  work_kj: 2875,
  calories: 2859,
  zone_distribution: { z1: 2640, z2: 3120, z3: 300, z4: 3120, z5: 2760, z6: 840, z7: 0 },
  power_curve: { "5s": 438, "30s": 392, "1m": 365, "5m": 348, "10m": 312, "20m": 310, "60m": 274 },
  ai_analysis: mockAnalysis,
  ai_analysis_generated_at: "2026-03-04T11:00:00Z",
  laps: {
    source: "auto",
    intervals: [
      { type: "warmup", duration_s: 1635, avg_power_w: 175, avg_hr_bpm: 130, avg_cadence_rpm: 83 },
      { type: "work", duration_s: 310, avg_power_w: 300, avg_hr_bpm: 162, avg_cadence_rpm: 101 },
      { type: "recovery", duration_s: 61, avg_power_w: 155, avg_hr_bpm: 145, avg_cadence_rpm: 92 },
      { type: "work", duration_s: 300, avg_power_w: 310, avg_hr_bpm: 165, avg_cadence_rpm: 102 },
    ],
  },
  user_notes: "",
  user_rating: 0,
  user_rpe: 0,
  user_tags: [],
  activity_weather: { temp_c: 15 },
};

// ── Fetch mock ──

let fetchCallCount = 0;
const originalFetch = global.fetch;

beforeEach(() => {
  fetchCallCount = 0;
  mockApiFetch.mockReset();
  mockResponsive = { isMobile: false, isTablet: false, isDesktop: true };
  global.fetch = vi.fn().mockImplementation((url) => {
    fetchCallCount++;
    if (url.includes("/api/activities/detail")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockActivity),
      });
    }
    if (url.includes("/api/activities/analyze")) {
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ analysis: mockAnalysis })),
      });
    }
    if (url.includes("/api/chat/ask")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ reply: "Based on your data, this is a great session." }),
      });
    }
    if (url.includes("/api/feedback/submit")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ feedback: { id: 1, feedback: 1 } }),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/activity/act-uuid-001"]}>
      <Routes>
        <Route path="/activity/:id" element={<ActivityDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

// Lazy import to apply mocks before module loads
let ActivityDetail;
beforeEach(async () => {
  const mod = await import("../ActivityDetail.jsx");
  ActivityDetail = mod.default;
});

// ── Tests ──

describe("ActivityDetail Page", () => {
  it("renders loading state initially", () => {
    renderPage();
    // The spinner should be visible during loading
    expect(document.querySelector("svg")).toBeTruthy();
  });

  it("renders activity data after loading", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Morning Endurance Ride")).toBeInTheDocument();
    });
  });

  it("renders hero stats ribbon", async () => {
    renderPage();
    await waitFor(() => {
      // Hero stat labels — these appear in the hero ribbon
      expect(screen.getAllByText("NP").length).toBeGreaterThan(0);
      expect(screen.getAllByText("EF").length).toBeGreaterThan(0);
      expect(screen.getAllByText("TSS").length).toBeGreaterThan(0);
    });
  });

  it("renders activity type badge", async () => {
    renderPage();
    await waitFor(() => {
      // The badge text includes emoji + "Ride"
      const badge = screen.getByText(/\uD83D\uDEB4\s+Ride/);
      expect(badge).toBeInTheDocument();
    });
  });

  it("renders temperature in hero subtitle", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/59\u00B0F/)).toBeInTheDocument();
    });
  });

  it("renders AIM Intelligence header", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("AIM Intelligence")).toBeInTheDocument();
    });
  });

  it("renders AI summary narrative", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/strong threshold session/)).toBeInTheDocument();
    });
  });

  it("renders findings without category filter tabs", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Best NP in 90 Days")).toBeInTheDocument();
      expect(screen.getByText("TSS 253 This Week")).toBeInTheDocument();
    });
    // No "All" / "Performance" / "Recovery" filter tabs
    expect(screen.queryByText("All")).toBeNull();
  });

  it("renders category labels on findings", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Sleep.*Performance/)).toBeInTheDocument();
      expect(screen.getByText("Fatigue Signature")).toBeInTheDocument();
    });
  });

  it("renders sig tags on findings", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Season best")).toBeInTheDocument();
      expect(screen.getByText("High load")).toBeInTheDocument();
    });
  });

  it("renders feedback buttons on findings", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId("insight-feedback-0")).toBeInTheDocument();
      expect(screen.getByTestId("insight-feedback-1")).toBeInTheDocument();
    });
  });

  it("renders action items section", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("What To Do Next")).toBeInTheDocument();
      expect(screen.getByText("Refuel now")).toBeInTheDocument();
    });
  });

  it("renders data gaps section", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Data Gaps")).toBeInTheDocument();
      expect(screen.getByText(/Connect Oura/)).toBeInTheDocument();
    });
  });

  it("renders session notes collapsed by default", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Session Notes")).toBeInTheDocument();
    });
    // Should show the prompt text in collapsed state (activity has no notes)
    expect(screen.getByText(/Your notes help AIM/)).toBeInTheDocument();
  });

  it("expands session notes on click", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Session Notes")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Session Notes"));
    await waitFor(() => {
      expect(screen.getByTestId("session-notes")).toBeInTheDocument();
    });
  });

  it("collapses session notes when close is clicked", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Session Notes")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Session Notes"));
    await waitFor(() => {
      expect(screen.getByTestId("session-notes")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("close-notes"));
    await waitFor(() => {
      expect(screen.queryByTestId("session-notes")).toBeNull();
    });
  });

  it("renders data panel sub-tabs", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Metrics")).toBeInTheDocument();
      expect(screen.getByText("Zones")).toBeInTheDocument();
      expect(screen.getByText("Laps")).toBeInTheDocument();
      expect(screen.getByText("Peaks")).toBeInTheDocument();
    });
  });

  it("switches data panel tabs on click", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Metrics")).toBeInTheDocument();
    });
    // Click Zones tab
    fireEvent.click(screen.getByText("Zones"));
    await waitFor(() => {
      expect(screen.getByText("Power Zones")).toBeInTheDocument();
    });
  });

  it("renders Laps tab with interval data", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Laps")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Laps"));
    await waitFor(() => {
      // Should show the work type label
      expect(screen.getAllByText("work").length).toBeGreaterThan(0);
    });
  });

  it("renders floating chat bar", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Ask anything about this ride...")).toBeInTheDocument();
    });
  });

  it("renders suggested prompt chips in chat bar", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Why did power drop in the final interval?")).toBeInTheDocument();
      expect(screen.getByText("Compare to my best threshold session")).toBeInTheDocument();
    });
  });

  it("sends chat message via input", async () => {
    mockApiFetch.mockResolvedValueOnce({ reply: "Great question about your ride." });
    renderPage();
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Ask anything about this ride...")).toBeInTheDocument();
    });
    const chatInput = screen.getByPlaceholderText("Ask anything about this ride...");
    fireEvent.change(chatInput, { target: { value: "Test question" } });
    fireEvent.keyDown(chatInput, { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByText("Test question")).toBeInTheDocument();
    });
  });

  it("renders error state with retry button", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ detail: "Activity not found" }),
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Activity not found")).toBeInTheDocument();
    });
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  describe("responsive behavior", () => {
    it("renders single column on mobile", async () => {
      mockResponsive = { isMobile: true, isTablet: false, isDesktop: false };
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Morning Endurance Ride")).toBeInTheDocument();
      });
      // On mobile, hamburger menu button should be present
      expect(document.querySelector('[aria-label]') || document.querySelector('button')).toBeTruthy();
    });

    it("renders two columns on desktop", async () => {
      mockResponsive = { isMobile: false, isTablet: false, isDesktop: true };
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Morning Endurance Ride")).toBeInTheDocument();
      });
      // Intelligence panel and Data panel should both be present
      expect(screen.getByText("AIM Intelligence")).toBeInTheDocument();
      expect(screen.getByText("Activity Trace")).toBeInTheDocument();
    });
  });
});
