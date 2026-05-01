describe("sanity", () => {
  it("runs the test harness", () => {
    expect(1 + 1).toBe(2);
  });

  it("loaded the test environment", () => {
    expect(process.env.NODE_ENV).toBe("test");
    expect(process.env.DATABASE_URL).toMatch(/_test$/);
  });
});
