import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
vi.mock("../_lib/auth.js", () => ({
  verifySession: vi.fn(),
  cors: vi.fn(),
}));

// Mock Supabase
const mockInsert = vi.fn().mockReturnThis();
const mockUpdate = vi.fn().mockReturnThis();
const mockSelect = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();
const mockSingle = vi.fn();

const chainable = () => ({
  insert: mockInsert,
  update: mockUpdate,
  select: mockSelect,
  eq: mockEq,
  single: mockSingle,
});

vi.mock("../_lib/supabase.js", () => ({
  supabaseAdmin: { from: vi.fn(() => chainable()) },
}));

const { verifySession } = await import("../_lib/auth.js");
const { supabaseAdmin } = await import("../_lib/supabase.js");
const { default: handler } = await import("./redeem.js");

function makeRes() {
  const res = { statusCode: null, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  res.end = () => res;
  return res;
}

function makeReq(body = {}) {
  return { method: "POST", body, headers: {} };
}

describe("POST /api/invite/redeem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifySession.mockResolvedValue({ userId: "user-1" });
  });

  it("rejects non-POST requests", async () => {
    const res = makeRes();
    await handler({ method: "GET", headers: {} }, res);
    expect(res.statusCode).toBe(405);
  });

  it("rejects unauthenticated requests", async () => {
    verifySession.mockResolvedValue(null);
    const res = makeRes();
    await handler(makeReq({ code: "TEST" }), res);
    expect(res.statusCode).toBe(401);
  });

  it("requires a code in the body", async () => {
    const res = makeRes();
    await handler(makeReq({}), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Invite code is required");
  });

  it("returns 404 for invalid codes", async () => {
    let callCount = 0;
    supabaseAdmin.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: () => ({ data: null }), // invite_codes lookup → not found
          }),
        }),
      }),
    }));

    const res = makeRes();
    await handler(makeReq({ code: "INVALID" }), res);
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe("Invalid or expired invite code");
  });

  it("returns 410 for expired codes", async () => {
    const pastDate = new Date("2020-01-01").toISOString();
    supabaseAdmin.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: () => ({
              data: { id: "inv-1", code: "EXPIRED", tier: "pro", expires_at: pastDate, current_uses: 0, max_uses: 5 },
            }),
          }),
        }),
      }),
    }));

    const res = makeRes();
    await handler(makeReq({ code: "EXPIRED" }), res);
    expect(res.statusCode).toBe(410);
    expect(res.body.error).toBe("This invite code has expired");
  });

  it("returns 410 for codes at max uses", async () => {
    supabaseAdmin.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: () => ({
              data: { id: "inv-1", code: "FULL", tier: "elite", expires_at: null, current_uses: 5, max_uses: 5 },
            }),
          }),
        }),
      }),
    }));

    const res = makeRes();
    await handler(makeReq({ code: "FULL" }), res);
    expect(res.statusCode).toBe(410);
    expect(res.body.error).toBe("This invite code has reached its limit");
  });

  it("returns 409 for already-redeemed codes", async () => {
    let callNum = 0;
    supabaseAdmin.from.mockImplementation((table) => {
      if (table === "invite_codes") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => ({
                  data: { id: "inv-1", code: "USED", tier: "pro", expires_at: null, current_uses: 0, max_uses: 5 },
                }),
              }),
            }),
          }),
        };
      }
      if (table === "invite_redemptions") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => ({ data: { id: "redemption-1" } }), // already redeemed
              }),
            }),
          }),
        };
      }
      return chainable();
    });

    const res = makeRes();
    await handler(makeReq({ code: "USED" }), res);
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toBe("You have already used this code");
  });

  it("successfully redeems a valid code", async () => {
    let callNum = 0;
    supabaseAdmin.from.mockImplementation((table) => {
      if (table === "invite_codes") {
        callNum++;
        if (callNum === 1) {
          // First call: lookup code
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => ({
                    data: { id: "inv-1", code: "VALID", tier: "elite", expires_at: null, current_uses: 0, max_uses: 5 },
                  }),
                }),
              }),
            }),
          };
        }
        // Second call: increment uses
        return { update: () => ({ eq: () => ({}) }) };
      }
      if (table === "invite_redemptions") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => ({ data: null }), // not yet redeemed
              }),
            }),
          }),
          insert: () => ({}),
        };
      }
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              single: () => ({ data: { subscription_tier: "free", access_source: "stripe" } }),
            }),
          }),
          update: () => ({ eq: () => ({}) }),
        };
      }
      return chainable();
    });

    const res = makeRes();
    await handler(makeReq({ code: "valid" }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.tier).toBe("elite");
    expect(res.body.message).toContain("Elite access");
  });

  it("normalizes code to uppercase", async () => {
    supabaseAdmin.from.mockImplementation(() => ({
      select: () => ({
        eq: (col, val) => {
          if (col === "code") {
            expect(val).toBe("LOWERCASE");
          }
          return {
            eq: () => ({
              single: () => ({ data: null }),
            }),
          };
        },
      }),
    }));

    const res = makeRes();
    await handler(makeReq({ code: "lowercase" }), res);
    expect(res.statusCode).toBe(404);
  });

  it("rejects invite code if user already on higher paid plan", async () => {
    let callNum = 0;
    supabaseAdmin.from.mockImplementation((table) => {
      if (table === "invite_codes") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => ({
                  data: { id: "inv-1", code: "STARTER-CODE", tier: "starter", expires_at: null, current_uses: 0, max_uses: 5 },
                }),
              }),
            }),
          }),
        };
      }
      if (table === "invite_redemptions") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => ({ data: null }),
              }),
            }),
          }),
        };
      }
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              single: () => ({ data: { subscription_tier: "pro", access_source: "stripe" } }),
            }),
          }),
        };
      }
      return chainable();
    });

    const res = makeRes();
    await handler(makeReq({ code: "STARTER-CODE" }), res);
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toBe("You're already on a higher or equal plan");
  });
});
