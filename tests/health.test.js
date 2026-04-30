const request = require("supertest");
const app = require("../api/app");

describe("GET /api/health", () => {
  it("returns project metadata", async () => {
    const res = await request(app).get("/api/health");
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.project).toBe("SESMag");
  });
});
