/**
 * Tests for POST /api/activities/manual endpoint.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──

const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockSupabaseFrom = vi.fn();

vi.mock("../../_lib/supabase.js", () => ({
  supabaseAdmin: {
    from: (...args) => mockSupabaseFrom(...args),
  },
}));

vi.mock("../../_lib/auth.js", () => ({
  verifySession: vi.fn(),
  cors: vi.fn(),
}));

vi.mock("../../_lib/cross-training.js", () => ({
  estimateCrossTrainingTSS: vi.fn().mockReturnValue(45),
  estimateRecoveryImpact: vi.fn().mockReturnValue("moderate"),
}));

vi.mock("../../_lib/training-load.js", () => ({
  updateDailyMetrics: vi.fn().mockResolvedValue(undefined),
}));

import handler from "../manual.js";
import { verifySession } from "../../_lib/auth.js";
import { estimateCrossTrainingTSS, estimateRecoveryImpact } from "../../_lib/cross-training.js";
import { updateDailyMetrics } from "../../_lib/training-load.js";

// ── Helpers ──

function makeReq(body = {}, method = "POST") {
  return { method, body };
}

function makeRes() {
  const res = {
    _status: null,
    _json: null,
    status: vi.fn(function (code) { res._status = code; return res; }),
    json: vi.fn(function (data) { res._json = data; return res; }),
    end: vi.fn().mockReturnThis(),
  };
  return res;
}

function setupSupabaseInsert(returnData, error = null) {
  const chain = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: returnData, error }),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data: returnData, error: null }),
  };
  // For cross_training_log insert, return a thenable
  const crossChain = {
    insert: vi.fn().mockReturnValue(Promise.resolve({ data: null, error: null })),
  };
  mockSupabaseFrom.mockImplementation((table) => {
    if (table === "cross_training_log") return crossChain;
    return chain;
  });
  return { chain, crossChain };
}

// ── Tests ──

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/activities/manual", () => {
  it("returns 401 without valid auth token", async () => {
    verifySession.mockResolvedValueOnce(null);
    const req = makeReq({ activity_type: "cycling", duration_seconds: 3600 });
    const res = makeRes();

    await handler(req, res);

    expect(res._status).toBe(401);
    expect(res._json.error).toBe("Unauthorized");
  });

  it("returns 400 if activity_type is missing", async () => {
    verifySession.mockResolvedValueOnce({ userId: "user-1" });
    const req = makeReq({ duration_seconds: 3600 });
    const res = makeRes();

    await handler(req, res);

    expect(res._status).toBe(400);
    expect(res._json.error).toBe("activity_type and duration_seconds are required");
  });

  it("returns 400 if duration_seconds is missing", async () => {
    verifySession.mockResolvedValueOnce({ userId: "user-1" });
    const req = makeReq({ activity_type: "cycling" });
    const res = makeRes();

    await handler(req, res);

    expect(res._status).toBe(400);
    expect(res._json.error).toBe("activity_type and duration_seconds are required");
  });

  it("inserts into activities and returns the row", async () => {
    verifySession.mockResolvedValueOnce({ userId: "user-1" });

    const insertedActivity = {
      id: "act-1",
      name: "Cycling",
      activity_type: "ride",
      source: "manual",
      started_at: "2026-03-04T12:00:00Z",
      duration_seconds: 3600,
      distance_meters: 76146.948, // 47.3 mi
      avg_power_watts: 214,
      tss: 178,
    };

    const { chain } = setupSupabaseInsert(insertedActivity);

    const req = makeReq({
      activity_type: "cycling",
      duration_seconds: 3600,
      date: "2026-03-04",
      perceived_intensity: 3,
      fields: {
        distance: "47.3",
        avg_power: "214",
        tss: "178",
      },
    });
    const res = makeRes();

    await handler(req, res);

    expect(res._status).toBe(201);
    expect(res._json.id).toBe("act-1");
    expect(res._json.activity_type).toBe("ride");
    expect(res._json.source).toBe("manual");

    // Verify insert was called with correct table
    expect(mockSupabaseFrom).toHaveBeenCalledWith("activities");
    expect(chain.insert).toHaveBeenCalled();

    // Verify the inserted record
    const insertCall = chain.insert.mock.calls[0][0];
    expect(insertCall.user_id).toBe("user-1");
    expect(insertCall.source).toBe("manual");
    expect(insertCall.activity_type).toBe("ride"); // mapped from "cycling"
    expect(insertCall.duration_seconds).toBe(3600);
    expect(insertCall.avg_power_watts).toBe(214);
    expect(insertCall.tss).toBe(178);
    // Distance should be converted from miles to meters
    expect(insertCall.distance_meters).toBeCloseTo(47.3 * 1609.34, 0);
  });

  it("cross-training types also write to cross_training_log", async () => {
    verifySession.mockResolvedValueOnce({ userId: "user-1" });

    const insertedActivity = {
      id: "act-2",
      name: "Strength",
      activity_type: "strength",
      source: "manual",
      tss: null,
    };

    const { crossChain } = setupSupabaseInsert(insertedActivity);

    const req = makeReq({
      activity_type: "strength",
      duration_seconds: 3600,
      date: "2026-03-04",
      perceived_intensity: 4,
      body_region: "Lower Body",
    });
    const res = makeRes();

    await handler(req, res);

    expect(res._status).toBe(201);

    // cross_training_log should have been written
    expect(mockSupabaseFrom).toHaveBeenCalledWith("cross_training_log");
    expect(crossChain.insert).toHaveBeenCalled();

    const crossInsert = crossChain.insert.mock.calls[0][0];
    expect(crossInsert.activity_type).toBe("strength");
    expect(crossInsert.body_region).toBe("lower_body");
    expect(crossInsert.perceived_intensity).toBe(4);
    expect(crossInsert.duration_minutes).toBe(60);
    expect(crossInsert.estimated_tss).toBe(45);
    expect(crossInsert.recovery_impact).toBe("moderate");

    // Cross-training functions should have been called
    expect(estimateCrossTrainingTSS).toHaveBeenCalled();
    expect(estimateRecoveryImpact).toHaveBeenCalled();
  });

  it("TSS triggers training load update", async () => {
    verifySession.mockResolvedValueOnce({ userId: "user-1" });

    const insertedActivity = {
      id: "act-3",
      name: "Cycling",
      activity_type: "ride",
      source: "manual",
      tss: 200,
    };

    setupSupabaseInsert(insertedActivity);

    const req = makeReq({
      activity_type: "cycling",
      duration_seconds: 5400,
      fields: { tss: "200" },
    });
    const res = makeRes();

    await handler(req, res);

    expect(res._status).toBe(201);
    expect(updateDailyMetrics).toHaveBeenCalledWith("user-1", insertedActivity);
  });
});
