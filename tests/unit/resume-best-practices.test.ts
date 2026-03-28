import { getResumeBestPractices } from "@autointern/prompts";

describe("resume prompt rules", () => {
  it("includes one-page and no-table constraints", () => {
    const rules = getResumeBestPractices().join(" ").toLowerCase();
    expect(rules).toContain("single page");
    expect(rules).toContain("never use tables");
    expect(rules).toContain("truthful");
  });
});
