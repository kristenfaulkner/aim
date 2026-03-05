/**
 * Tests for LogActivityModal component.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LogActivityModal from "../LogActivityModal";

// Mock apiFetch
const mockApiFetch = vi.fn();
vi.mock("../../../lib/api", () => ({
  apiFetch: (...args) => mockApiFetch(...args),
}));

// Mock supabase auth for file upload (uses raw fetch with auth token)
vi.mock("../../../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "test-token" } },
      }),
    },
  },
}));

// Mock useResponsive
vi.mock("../../../hooks/useResponsive", () => ({
  useResponsive: () => ({ isMobile: false, isTablet: false, isDesktop: true }),
}));

// Mock global fetch for file upload endpoint
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
});

describe("LogActivityModal", () => {
  it("does not render when isOpen is false", () => {
    const { container } = render(
      <LogActivityModal isOpen={false} onClose={vi.fn()} onSaved={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders when isOpen is true", () => {
    render(
      <LogActivityModal isOpen={true} onClose={vi.fn()} onSaved={vi.fn()} />
    );
    expect(screen.getByText("Log Activity")).toBeInTheDocument();
  });

  it("save button is disabled until activity type + intensity + duration are set", () => {
    render(
      <LogActivityModal isOpen={true} onClose={vi.fn()} onSaved={vi.fn()} />
    );
    // Save button should show "Save Session" but be non-functional (gradient not applied)
    const saveBtn = screen.getByText("Save Session");
    expect(saveBtn).toBeInTheDocument();
    // Hint text should show
    expect(screen.getByText(/Select an activity type/)).toBeInTheDocument();

    // Select activity type
    fireEvent.click(screen.getByText("Cycling"));
    expect(screen.getByText(/Rate your effort level/)).toBeInTheDocument();

    // Select intensity
    fireEvent.click(screen.getByText("Moderate"));
    // Duration defaults to 1:00:00 for cycling so button should now be enabled
    expect(screen.queryByText(/Select an activity type/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Rate your effort level/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Add a duration/)).not.toBeInTheDocument();
  });

  it("strength type shows muscle group selector; others hide it", () => {
    render(
      <LogActivityModal isOpen={true} onClose={vi.fn()} onSaved={vi.fn()} />
    );

    // Select cycling — no body region
    fireEvent.click(screen.getByText("Cycling"));
    expect(screen.queryByText("Muscle Group Focus")).not.toBeInTheDocument();

    // Switch to strength — body region should appear
    fireEvent.click(screen.getByText("Strength"));
    expect(screen.getByText("Muscle Group Focus")).toBeInTheDocument();
    expect(screen.getByText("Upper Body")).toBeInTheDocument();
    expect(screen.getByText("Lower Body")).toBeInTheDocument();
    expect(screen.getByText("Full Body")).toBeInTheDocument();
    expect(screen.getByText("Core")).toBeInTheDocument();
  });

  it("performance fields visible for cycling/running/swimming/hiking; hidden for yoga/pilates/other", () => {
    render(
      <LogActivityModal isOpen={true} onClose={vi.fn()} onSaved={vi.fn()} />
    );

    // Cycling has performance fields (always shown, no accordion)
    fireEvent.click(screen.getByText("Cycling"));
    expect(screen.getByText("Distance & Speed")).toBeInTheDocument();
    expect(screen.getByText("Power")).toBeInTheDocument();

    // Running has performance fields
    fireEvent.click(screen.getByText("Running"));
    expect(screen.getByText("Distance & Pace")).toBeInTheDocument();

    // Swimming has performance fields
    fireEvent.click(screen.getByText("Swimming"));
    expect(screen.getByText("Distance & Pace")).toBeInTheDocument();

    // Hiking has performance fields
    fireEvent.click(screen.getByText("Hiking"));
    expect(screen.getByText("Distance & Elevation")).toBeInTheDocument();

    // Yoga has NO performance fields
    fireEvent.click(screen.getByText("Yoga"));
    expect(screen.queryByText("Distance & Speed")).not.toBeInTheDocument();
    expect(screen.queryByText("Distance & Pace")).not.toBeInTheDocument();

    // Pilates has NO performance fields
    fireEvent.click(screen.getByText("Pilates"));
    expect(screen.queryByText("Distance & Speed")).not.toBeInTheDocument();

    // Other has NO performance fields
    fireEvent.click(screen.getByText("Other"));
    expect(screen.queryByText("Distance & Speed")).not.toBeInTheDocument();
  });

  it("file upload calls POST /api/activities/parse-file and populates fields on success", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        parsed: {
          distance: "47.2",
          avg_power: "214",
          avg_hr: "148",
          duration_seconds: 5400,
        },
        activity_type_hint: "cycling",
      }),
    });

    render(
      <LogActivityModal isOpen={true} onClose={vi.fn()} onSaved={vi.fn()} />
    );

    // Select cycling first
    fireEvent.click(screen.getByText("Cycling"));

    // Find the file input and simulate upload
    const fileInput = document.querySelector('input[type="file"]');
    const testFile = new File(["test content"], "ride.fit", {
      type: "application/octet-stream",
    });

    fireEvent.change(fileInput, { target: { files: [testFile] } });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/activities/parse-file",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: "Bearer test-token",
          }),
        })
      );
    });

    // After parsing, the performance fields should be visible and populated
    await waitFor(() => {
      expect(screen.getByText("Distance & Speed")).toBeInTheDocument();
    });
  });

  it("file upload shows inline error on failed response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Invalid file" }),
    });

    render(
      <LogActivityModal isOpen={true} onClose={vi.fn()} onSaved={vi.fn()} />
    );

    fireEvent.click(screen.getByText("Cycling"));

    const fileInput = document.querySelector('input[type="file"]');
    const badFile = new File(["bad"], "bad.fit", {
      type: "application/octet-stream",
    });

    fireEvent.change(fileInput, { target: { files: [badFile] } });

    await waitFor(() => {
      expect(
        screen.getByText(/Couldn't parse this file/)
      ).toBeInTheDocument();
    });
  });

  it("clearing file removes parsed field values", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        parsed: { avg_power: "200" },
        activity_type_hint: "cycling",
      }),
    });

    render(
      <LogActivityModal isOpen={true} onClose={vi.fn()} onSaved={vi.fn()} />
    );

    fireEvent.click(screen.getByText("Cycling"));

    const fileInput = document.querySelector('input[type="file"]');
    const testFile = new File(["content"], "ride.fit", {
      type: "application/octet-stream",
    });
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    // Wait for parsing to complete
    await waitFor(() => {
      expect(screen.getByText(/Data auto-filled below/)).toBeInTheDocument();
    });

    // Click the clear (X) button on the file card
    const clearBtns = screen.getAllByRole("button");
    const clearBtn = clearBtns.find((btn) => {
      // The X button is a small circular button
      const style = btn.getAttribute("style") || "";
      return style.includes("border-radius: 13");
    });
    if (clearBtn) {
      fireEvent.click(clearBtn);
    }

    // After clearing, the "Drop a file" text should reappear
    await waitFor(() => {
      expect(
        screen.getByText("Drop a file or click to browse")
      ).toBeInTheDocument();
    });
  });

  it("save calls POST /api/activities/manual with correct payload", async () => {
    const savedActivity = {
      id: "new-id",
      name: "Cycling",
      activity_type: "ride",
      source: "manual",
      started_at: "2026-03-04T12:00:00Z",
      duration_seconds: 3600,
    };
    mockApiFetch.mockResolvedValueOnce(savedActivity);

    render(
      <LogActivityModal isOpen={true} onClose={vi.fn()} onSaved={vi.fn()} />
    );

    // Fill required fields
    fireEvent.click(screen.getByText("Cycling"));
    fireEvent.click(screen.getByText("Moderate")); // intensity 3

    // Save
    fireEvent.click(screen.getByText("Save Session"));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/activities/manual",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"activity_type":"cycling"'),
        })
      );
    });

    // Verify the payload includes duration_seconds
    const callArgs = mockApiFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.activity_type).toBe("cycling");
    expect(body.duration_seconds).toBe(3600); // 1h default for cycling
    expect(body.perceived_intensity).toBe(3);
  });

  it("onSaved called with returned activity on 201", async () => {
    const savedActivity = {
      id: "new-id",
      name: "Cycling",
      activity_type: "ride",
      source: "manual",
    };
    mockApiFetch.mockResolvedValueOnce(savedActivity);
    const onSaved = vi.fn();

    render(
      <LogActivityModal isOpen={true} onClose={vi.fn()} onSaved={onSaved} />
    );

    fireEvent.click(screen.getByText("Cycling"));
    fireEvent.click(screen.getByText("Hard")); // intensity 4
    fireEvent.click(screen.getByText("Save Session"));

    // Wait for success state
    await waitFor(() => {
      expect(screen.getByText("Done")).toBeInTheDocument();
    });

    // Click Done — should call onSaved
    fireEvent.click(screen.getByText("Done"));
    expect(onSaved).toHaveBeenCalledWith(savedActivity);
  });

  it("all state resets on close", async () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <LogActivityModal isOpen={true} onClose={onClose} onSaved={vi.fn()} />
    );

    // Select cycling and intensity
    fireEvent.click(screen.getByText("Cycling"));
    fireEvent.click(screen.getByText("Moderate"));
    expect(screen.getByText(/Logging cycling session/)).toBeInTheDocument();

    // Click Cancel
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalled();

    // Re-open modal — state should be reset
    rerender(
      <LogActivityModal isOpen={true} onClose={onClose} onSaved={vi.fn()} />
    );
    expect(screen.getByText("Pick a type to start")).toBeInTheDocument();
  });
});
