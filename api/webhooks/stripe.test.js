import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Stripe
const mockRetrieveSubscription = vi.fn();
const mockConstructEvent = vi.fn();
const mockStripe = {
  webhooks: { constructEvent: mockConstructEvent },
  subscriptions: { retrieve: mockRetrieveSubscription },
};

vi.mock("../_lib/stripe.js", () => ({
  stripe: mockStripe,
  tierFromPriceId: (priceId) => {
    const map = {
      "price_starter": "starter",
      "price_pro": "pro",
      "price_elite": "elite",
    };
    return map[priceId] || "free";
  },
}));

// Mock Supabase
const mockUpdate = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();
const mockSelect = vi.fn().mockReturnThis();
const mockSingle = vi.fn();
const mockFrom = vi.fn(() => ({
  update: mockUpdate,
  select: mockSelect,
  eq: mockEq,
  single: mockSingle,
}));
vi.mock("../_lib/supabase.js", () => ({
  supabaseAdmin: { from: (...args) => mockFrom(...args) },
}));

// Import handler after mocks
const { default: handler } = await import("./stripe.js");

function makeRes() {
  const res = { statusCode: null, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  res.end = () => res;
  return res;
}

describe("Stripe Webhook Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for findUserByCustomerId
    mockFrom.mockImplementation(() => ({
      update: mockUpdate,
      select: () => ({
        eq: () => ({
          single: () => ({ data: { id: "user-123" } }),
        }),
      }),
      eq: mockEq,
      single: mockSingle,
    }));
    mockUpdate.mockReturnValue({ eq: () => ({}) });
  });

  it("rejects non-POST requests", async () => {
    const req = { method: "GET", headers: {} };
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });

  it("rejects requests without stripe-signature header", async () => {
    const req = { method: "POST", headers: {} };
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Missing stripe-signature header");
  });

  it("rejects invalid signatures", async () => {
    mockConstructEvent.mockImplementation(() => { throw new Error("Invalid sig"); });
    const req = { method: "POST", headers: { "stripe-signature": "bad_sig" }, body: "{}" };
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Invalid signature");
  });

  it("handles checkout.session.completed — sets tier and customer ID", async () => {
    mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      id: "evt_1",
      data: {
        object: {
          customer: "cus_123",
          subscription: "sub_456",
          metadata: { aim_user_id: "user-123" },
        },
      },
    });
    mockRetrieveSubscription.mockResolvedValue({
      items: { data: [{ price: { id: "price_pro" } }] },
    });

    const req = { method: "POST", headers: { "stripe-signature": "valid" }, body: "{}" };
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.received).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith("profiles");
  });

  it("handles customer.subscription.deleted — downgrades to free", async () => {
    mockConstructEvent.mockReturnValue({
      type: "customer.subscription.deleted",
      id: "evt_2",
      data: {
        object: {
          customer: "cus_123",
          id: "sub_456",
        },
      },
    });

    const req = { method: "POST", headers: { "stripe-signature": "valid" }, body: "{}" };
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
  });

  it("handles customer.subscription.updated — updates tier", async () => {
    mockConstructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      id: "evt_3",
      data: {
        object: {
          customer: "cus_123",
          id: "sub_456",
          status: "active",
          items: { data: [{ price: { id: "price_elite" } }] },
        },
      },
    });

    const req = { method: "POST", headers: { "stripe-signature": "valid" }, body: "{}" };
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
  });

  it("does NOT update tier when subscription has pending_update (scheduled downgrade)", async () => {
    mockConstructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      id: "evt_6",
      data: {
        object: {
          customer: "cus_123",
          id: "sub_456",
          status: "active",
          pending_update: { subscription_items: [{ price: "price_starter" }] },
          items: { data: [{ price: { id: "price_pro" } }] },
        },
      },
    });

    const req = { method: "POST", headers: { "stripe-signature": "valid" }, body: "{}" };
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    // The update mock should NOT be called for tier change since pending_update is present
    // The function returns early when pending_update exists
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("sets access_source to stripe when subscription updates (invite→stripe transition)", async () => {
    mockConstructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      id: "evt_7",
      data: {
        object: {
          customer: "cus_123",
          id: "sub_456",
          status: "active",
          items: { data: [{ price: { id: "price_pro" } }] },
        },
      },
    });

    const req = { method: "POST", headers: { "stripe-signature": "valid" }, body: "{}" };
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("handles invoice.payment_failed gracefully", async () => {
    mockConstructEvent.mockReturnValue({
      type: "invoice.payment_failed",
      id: "evt_4",
      data: {
        object: {
          customer: "cus_123",
          id: "inv_789",
          attempt_count: 2,
        },
      },
    });

    const req = { method: "POST", headers: { "stripe-signature": "valid" }, body: "{}" };
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
  });

  it("handles unrecognized event types without error", async () => {
    mockConstructEvent.mockReturnValue({
      type: "charge.succeeded",
      id: "evt_5",
      data: { object: {} },
    });

    const req = { method: "POST", headers: { "stripe-signature": "valid" }, body: "{}" };
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.received).toBe(true);
  });
});
