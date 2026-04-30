const jwt = require("jsonwebtoken");
const { requireAuth, requireRole } = require("../api/middleware/auth");

process.env.JWT_SECRET = "test-secret";

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

describe("auth middleware", () => {
  it("rejects without token", () => {
    const req = { cookies: {} };
    const res = mockRes();
    const next = vi.fn();
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("accepts valid token", () => {
    const token = jwt.sign({ id: 1, role: "employee" }, process.env.JWT_SECRET);
    const req = { cookies: { token } };
    const res = mockRes();
    const next = vi.fn();
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user.id).toBe(1);
  });

  it("enforces role", () => {
    const req = { user: { role: "employee" } };
    const res = mockRes();
    const next = vi.fn();
    requireRole(["hr"])(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
