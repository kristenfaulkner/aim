import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TravelStatusCard from "./TravelStatusCard";

// Mock Recharts to avoid rendering issues in jsdom
vi.mock("recharts", () => ({
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  XAxis: () => null,
  YAxis: () => null,
  ReferenceDot: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

// ── Fixtures ──

const baseTravelEvent = {
  id: "te-001",
  detected_at: new Date(Date.now() - 2 * 86400000).toISOString(), // 2 days ago
  origin_timezone: "America/New_York",
  dest_timezone: "America/Denver",
  dest_altitude_m: 1609,
  distance_km: 2627,
  timezone_shift_hours: -2,
  altitude_change_m: 1600,
  travel_type: "flight_likely",
};

const jetLagOnlyEvent = {
  ...baseTravelEvent,
  id: "te-002",
  detected_at: new Date(Date.now() - 1 * 86400000).toISOString(), // 1 day ago
  timezone_shift_hours: -6,
  dest_altitude_m: 50, // below 1000m threshold
  altitude_change_m: 0,
};

const altitudeOnlyEvent = {
  ...baseTravelEvent,
  id: "te-003",
  timezone_shift_hours: 0, // no timezone shift
  dest_altitude_m: 2500,
};

const expiredEvent = {
  ...baseTravelEvent,
  id: "te-004",
  detected_at: new Date(Date.now() - 20 * 86400000).toISOString(), // 20 days ago
  timezone_shift_hours: -2, // jet lag recovery = 2 days, long past
  dest_altitude_m: 500, // below threshold
};

// ── Tests ──

describe("TravelStatusCard", () => {
  it("renders nothing when travelEvent is null", () => {
    const { container } = render(
      <TravelStatusCard travelEvent={null} isMobile={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when both jet lag and altitude recovery are complete", () => {
    const { container } = render(
      <TravelStatusCard travelEvent={expiredEvent} isMobile={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders collapsed state with destination city and day count", () => {
    render(<TravelStatusCard travelEvent={baseTravelEvent} isMobile={false} />);
    // "Denver" appears in both collapsed row and expanded header
    const matches = screen.getAllByText(/Denver/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    // Collapsed row shows "Day 3" (2 days ago = day 3, 1-indexed)
    const toggle = screen.getByRole("button");
    expect(toggle).toHaveTextContent(/Day 3/);
  });

  it("shows power penalty metric in collapsed state when altitude is significant", () => {
    render(<TravelStatusCard travelEvent={baseTravelEvent} isMobile={false} />);
    const toggle = screen.getByRole("button");
    expect(toggle).toHaveTextContent(/power/i);
  });

  it("expands on click to show timezone and altitude sections", () => {
    render(<TravelStatusCard travelEvent={baseTravelEvent} isMobile={false} />);
    const toggle = screen.getByRole("button");
    fireEvent.click(toggle);
    expect(screen.getByText(/Timezone/)).toBeInTheDocument();
    expect(screen.getByText(/Altitude/)).toBeInTheDocument();
  });

  it("shows timezone section when timezone shift >= 2h", () => {
    render(<TravelStatusCard travelEvent={jetLagOnlyEvent} isMobile={false} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText(/Timezone/)).toBeInTheDocument();
    expect(screen.getByText(/-6h/)).toBeInTheDocument();
  });

  it("shows altitude section when dest altitude >= 1000m", () => {
    render(<TravelStatusCard travelEvent={altitudeOnlyEvent} isMobile={false} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText(/Altitude/)).toBeInTheDocument();
    expect(screen.getByText(/2,500m/)).toBeInTheDocument();
  });

  it("hides altitude section when dest altitude < 1000m", () => {
    render(<TravelStatusCard travelEvent={jetLagOnlyEvent} isMobile={false} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.queryByText(/Altitude/)).not.toBeInTheDocument();
  });

  it("shows AI coach footer in expanded state", () => {
    render(<TravelStatusCard travelEvent={baseTravelEvent} isMobile={false} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText(/AI coach/i)).toBeInTheDocument();
  });
});
