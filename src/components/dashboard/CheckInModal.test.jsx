/**
 * Tests for CheckInModal and CheckInSummaryCard components.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CheckInModal, { CheckInSummaryCard } from "./CheckInModal";

// Mock apiFetch
const mockApiFetch = vi.fn();
vi.mock("../../lib/api", () => ({
  apiFetch: (...args) => mockApiFetch(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  // Reset body overflow
  document.body.style.overflow = "";
});

describe("CheckInModal", () => {
  it("renders greeting with athlete name", () => {
    render(<CheckInModal athleteName="Kristen" onComplete={vi.fn()} onSkip={vi.fn()} />);
    // The greeting depends on time of day
    expect(
      screen.getByText(/Kristen/)
    ).toBeInTheDocument();
  });

  it("renders all 4 rating rows", () => {
    render(<CheckInModal onComplete={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByText("Life Stress")).toBeInTheDocument();
    expect(screen.getByText("Motivation")).toBeInTheDocument();
    expect(screen.getByText("Muscle Soreness")).toBeInTheDocument();
    expect(screen.getByText("Mood")).toBeInTheDocument();
  });

  it("renders endpoint labels for each field", () => {
    render(<CheckInModal onComplete={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByText("Overwhelming")).toBeInTheDocument();
    expect(screen.getByText("Fired Up")).toBeInTheDocument();
    expect(screen.getByText("Very Sore")).toBeInTheDocument();
    expect(screen.getByText("Excellent")).toBeInTheDocument();
  });

  it("save button is disabled when no values selected", () => {
    render(<CheckInModal onComplete={vi.fn()} onSkip={vi.fn()} />);
    const saveBtn = screen.getByText("Save & Continue");
    expect(saveBtn).toBeDisabled();
  });

  it("save button enables when at least 1 value is selected", () => {
    render(<CheckInModal onComplete={vi.fn()} onSkip={vi.fn()} />);
    // Click "Life Stress 3"
    fireEvent.click(screen.getByLabelText("Life Stress 3"));
    const saveBtn = screen.getByText("Save & Continue");
    expect(saveBtn).not.toBeDisabled();
  });

  it("tapping same value toggles it off (deselects)", () => {
    render(<CheckInModal onComplete={vi.fn()} onSkip={vi.fn()} />);
    const btn = screen.getByLabelText("Motivation 4");
    fireEvent.click(btn); // select
    // Save should be enabled
    expect(screen.getByText("Save & Continue")).not.toBeDisabled();
    fireEvent.click(btn); // deselect
    // Save should be disabled again (all null)
    expect(screen.getByText("Save & Continue")).toBeDisabled();
  });

  it("sends correct payload on save", async () => {
    const onComplete = vi.fn();
    mockApiFetch.mockResolvedValueOnce({
      checkin: {
        life_stress_score: 2,
        motivation_score: 4,
        muscle_soreness_score: null,
        mood_score: 5,
      },
    });

    render(<CheckInModal onComplete={onComplete} onSkip={vi.fn()} />);

    fireEvent.click(screen.getByLabelText("Life Stress 2"));
    fireEvent.click(screen.getByLabelText("Motivation 4"));
    fireEvent.click(screen.getByLabelText("Mood 5"));

    fireEvent.click(screen.getByText("Save & Continue"));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith("/checkin/submit", {
        method: "POST",
        body: JSON.stringify({
          life_stress: 2,
          motivation: 4,
          mood: 5,
        }),
      });
    });
  });

  it("shows success state after save", async () => {
    mockApiFetch.mockResolvedValueOnce({
      checkin: { life_stress_score: 3 },
    });

    render(<CheckInModal onComplete={vi.fn()} onSkip={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("Life Stress 3"));
    fireEvent.click(screen.getByText("Save & Continue"));

    await waitFor(() => {
      expect(screen.getByText("You're all set!")).toBeInTheDocument();
    });
  });

  it("shows error message on API failure", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<CheckInModal onComplete={vi.fn()} onSkip={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("Mood 3"));
    fireEvent.click(screen.getByText("Save & Continue"));

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("skip button calls onSkip", async () => {
    const onSkip = vi.fn();
    render(<CheckInModal onComplete={vi.fn()} onSkip={onSkip} />);

    fireEvent.click(screen.getByText("Skip for now"));

    // Wait for exit animation
    await waitFor(() => {
      expect(onSkip).toHaveBeenCalled();
    }, { timeout: 500 });
  });

  it("pre-fills values when editing", () => {
    const initialValues = {
      life_stress_score: 2,
      motivation_score: 4,
      muscle_soreness_score: 1,
      mood_score: 5,
    };

    render(
      <CheckInModal
        initialValues={initialValues}
        onComplete={vi.fn()}
        onSkip={vi.fn()}
      />
    );

    // Button text should reflect editing mode
    expect(screen.getByText("Update & Continue")).toBeInTheDocument();
    expect(screen.getByText("Update your check-in")).toBeInTheDocument();
  });

  it("shows first-time tooltip when isFirstTime is true", () => {
    render(
      <CheckInModal
        isFirstTime={true}
        onComplete={vi.fn()}
        onSkip={vi.fn()}
      />
    );

    expect(
      screen.getByText(/AIM uses your daily check-in/)
    ).toBeInTheDocument();
  });

  it("prevents body scroll when open", () => {
    render(<CheckInModal onComplete={vi.fn()} onSkip={vi.fn()} />);
    expect(document.body.style.overflow).toBe("hidden");
  });
});

describe("CheckInSummaryCard", () => {
  it("renders nothing when checkin is null", () => {
    const { container } = render(
      <CheckInSummaryCard checkin={null} onEdit={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders scores as emoji + value pairs", () => {
    const checkin = {
      life_stress_score: 2,
      motivation_score: 4,
      muscle_soreness_score: 1,
      mood_score: 5,
    };

    render(<CheckInSummaryCard checkin={checkin} onEdit={vi.fn()} />);
    expect(screen.getByText("Morning Check-In")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("edit button calls onEdit", () => {
    const onEdit = vi.fn();
    const checkin = { life_stress_score: 3 };

    render(<CheckInSummaryCard checkin={checkin} onEdit={onEdit} />);
    fireEvent.click(screen.getByText("Edit"));
    expect(onEdit).toHaveBeenCalled();
  });

  it("handles partial check-in (some nulls)", () => {
    const checkin = {
      life_stress_score: 2,
      motivation_score: null,
      muscle_soreness_score: null,
      mood_score: 5,
    };

    render(<CheckInSummaryCard checkin={checkin} onEdit={vi.fn()} />);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });
});
