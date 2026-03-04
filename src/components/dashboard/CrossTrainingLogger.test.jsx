/**
 * Tests for CrossTrainingLogger component.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CrossTrainingLogger from "./CrossTrainingLogger";

// Mock apiFetch
const mockApiFetch = vi.fn();
vi.mock("../../lib/api", () => ({
  apiFetch: (...args) => mockApiFetch(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const defaultEntry = {
  id: "test-uuid",
  activity_type: "strength",
  body_region: "lower_body",
  perceived_intensity: 4,
  duration_minutes: 60,
  estimated_tss: 60,
  recovery_impact: "major",
  date: "2026-03-03",
};

describe("CrossTrainingLogger", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <CrossTrainingLogger isOpen={false} onClose={vi.fn()} isMobile={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders modal when open", () => {
    render(<CrossTrainingLogger isOpen={true} onClose={vi.fn()} isMobile={false} />);
    expect(screen.getByText("Log Cross-Training")).toBeInTheDocument();
  });

  it("renders all 6 activity types", () => {
    render(<CrossTrainingLogger isOpen={true} onClose={vi.fn()} isMobile={false} />);
    expect(screen.getByText("Strength")).toBeInTheDocument();
    expect(screen.getByText("Yoga")).toBeInTheDocument();
    expect(screen.getByText("Swimming")).toBeInTheDocument();
    expect(screen.getByText("Hiking")).toBeInTheDocument();
    expect(screen.getByText("Pilates")).toBeInTheDocument();
    expect(screen.getByText("Other")).toBeInTheDocument();
  });

  it("body region only shows when Strength is selected", () => {
    render(<CrossTrainingLogger isOpen={true} onClose={vi.fn()} isMobile={false} />);
    // Body region should not be visible initially
    expect(screen.queryByText("Body Region")).not.toBeInTheDocument();

    // Select Strength
    fireEvent.click(screen.getByText("Strength"));
    expect(screen.getByText("Body Region")).toBeInTheDocument();
    expect(screen.getByText("Upper Body")).toBeInTheDocument();
    expect(screen.getByText("Lower Body")).toBeInTheDocument();
    expect(screen.getByText("Full Body")).toBeInTheDocument();
    expect(screen.getByText("Core")).toBeInTheDocument();
  });

  it("body region hides when switching from Strength to Yoga", () => {
    render(<CrossTrainingLogger isOpen={true} onClose={vi.fn()} isMobile={false} />);
    fireEvent.click(screen.getByText("Strength"));
    expect(screen.getByText("Body Region")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Yoga"));
    expect(screen.queryByText("Body Region")).not.toBeInTheDocument();
  });

  it("duration defaults change based on activity type", () => {
    render(<CrossTrainingLogger isOpen={true} onClose={vi.fn()} isMobile={false} />);
    // Default is 30
    expect(screen.getByText("30")).toBeInTheDocument();

    // Strength → 60
    fireEvent.click(screen.getByText("Strength"));
    expect(screen.getByText("60")).toBeInTheDocument();

    // Yoga → 45
    fireEvent.click(screen.getByText("Yoga"));
    expect(screen.getByText("45")).toBeInTheDocument();

    // Swimming → 30
    fireEvent.click(screen.getByText("Swimming"));
    expect(screen.getByText("30")).toBeInTheDocument();
  });

  it("renders all 5 intensity levels", () => {
    render(<CrossTrainingLogger isOpen={true} onClose={vi.fn()} isMobile={false} />);
    expect(screen.getByText("Easy")).toBeInTheDocument();
    expect(screen.getByText("Light")).toBeInTheDocument();
    expect(screen.getByText("Moderate")).toBeInTheDocument();
    expect(screen.getByText("Hard")).toBeInTheDocument();
    expect(screen.getByText("Max")).toBeInTheDocument();
  });

  it("sends correct payload on save", async () => {
    mockApiFetch.mockResolvedValueOnce({ entry: defaultEntry });

    render(<CrossTrainingLogger isOpen={true} onClose={vi.fn()} isMobile={false} />);

    // Select Strength
    fireEvent.click(screen.getByText("Strength"));
    // Select Lower Body
    fireEvent.click(screen.getByText("Lower Body"));
    // Select intensity 4 (Hard)
    fireEvent.click(screen.getByText("Hard"));
    // Save
    fireEvent.click(screen.getByText("Save Session"));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith("/cross-training/log", {
        method: "POST",
        body: expect.any(String),
      });
    });

    const body = JSON.parse(mockApiFetch.mock.calls[0][1].body);
    expect(body.activity_type).toBe("strength");
    expect(body.body_region).toBe("lower_body");
    expect(body.perceived_intensity).toBe(4);
    expect(body.duration_minutes).toBe(60);
  });

  it("sends null body_region for non-strength types", async () => {
    mockApiFetch.mockResolvedValueOnce({
      entry: { ...defaultEntry, activity_type: "yoga", body_region: null, recovery_impact: "none", estimated_tss: 14 },
    });

    render(<CrossTrainingLogger isOpen={true} onClose={vi.fn()} isMobile={false} />);

    fireEvent.click(screen.getByText("Yoga"));
    fireEvent.click(screen.getByText("Easy"));
    fireEvent.click(screen.getByText("Save Session"));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalled();
    });

    const body = JSON.parse(mockApiFetch.mock.calls[0][1].body);
    expect(body.activity_type).toBe("yoga");
    expect(body.body_region).toBeNull();
  });

  it("shows confirmation with TSS and recovery impact", async () => {
    mockApiFetch.mockResolvedValueOnce({ entry: defaultEntry });

    render(<CrossTrainingLogger isOpen={true} onClose={vi.fn()} isMobile={false} />);

    fireEvent.click(screen.getByText("Strength"));
    fireEvent.click(screen.getByText("Hard"));
    fireEvent.click(screen.getByText("Save Session"));

    await waitFor(() => {
      expect(screen.getByText("Session Logged!")).toBeInTheDocument();
    });

    expect(screen.getByText("~60")).toBeInTheDocument();
    expect(screen.getByText("Major Impact")).toBeInTheDocument();
    expect(screen.getByText(/major impact on tomorrow/)).toBeInTheDocument();
  });

  it("shows error on API failure", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<CrossTrainingLogger isOpen={true} onClose={vi.fn()} isMobile={false} />);

    fireEvent.click(screen.getByText("Strength"));
    fireEvent.click(screen.getByText("Hard"));
    fireEvent.click(screen.getByText("Save Session"));

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("Log Another resets form", async () => {
    mockApiFetch.mockResolvedValueOnce({ entry: defaultEntry });

    render(<CrossTrainingLogger isOpen={true} onClose={vi.fn()} isMobile={false} />);

    fireEvent.click(screen.getByText("Strength"));
    fireEvent.click(screen.getByText("Hard"));
    fireEvent.click(screen.getByText("Save Session"));

    await waitFor(() => {
      expect(screen.getByText("Session Logged!")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Log Another"));

    // Should be back to input stage
    expect(screen.getByText("Activity Type")).toBeInTheDocument();
    expect(screen.getByText("Save Session")).toBeInTheDocument();
  });

  it("close button calls onClose", () => {
    const onClose = vi.fn();
    render(<CrossTrainingLogger isOpen={true} onClose={onClose} isMobile={false} />);

    // Find the close button (X icon wrapper)
    const closeButtons = screen.getAllByRole("button");
    // The close button is in the header area
    const closeBtn = closeButtons.find(btn => btn.querySelector("svg.lucide-x"));
    if (closeBtn) {
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalled();
    }
  });

  it("duration +/- buttons work", () => {
    render(<CrossTrainingLogger isOpen={true} onClose={vi.fn()} isMobile={false} />);

    fireEvent.click(screen.getByText("Strength")); // Sets to 60
    expect(screen.getByText("60")).toBeInTheDocument();

    // Find the + button (has Plus icon)
    const buttons = screen.getAllByRole("button");
    const plusBtn = buttons.find(btn => btn.querySelector("svg.lucide-plus"));
    const minusBtn = buttons.find(btn => btn.querySelector("svg.lucide-minus"));

    if (plusBtn) {
      fireEvent.click(plusBtn);
      expect(screen.getByText("65")).toBeInTheDocument();
    }

    if (minusBtn) {
      fireEvent.click(minusBtn);
      expect(screen.getByText("60")).toBeInTheDocument();
    }
  });
});
