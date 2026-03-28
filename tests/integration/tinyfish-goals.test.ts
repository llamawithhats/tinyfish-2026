import { TinyFishClient } from "@autointern/tinyfish";

describe("TinyFish goal builders", () => {
  it("produces strict extraction output instructions", () => {
    const client = new TinyFishClient();
    const goal = client.buildExtractionGoal({
      provider: "GREENHOUSE",
      keywords: ["backend", "intern"],
      locations: ["Singapore"],
      internshipOnly: true
    });

    expect(goal).toContain("Return JSON matching this exact structure");
    expect(goal).toContain("internship_relevance_score");
    expect(goal).toContain("canonical_application_url");
  });

  it("normalizes a TinyFish extraction result", () => {
    const client = new TinyFishClient();
    const normalized = client.normalizeExtractionResult({
      listings: [
        {
          external_id: "1",
          title: "Software Engineer Intern",
          company_name: "Acme",
          location: "Remote",
          internship_relevance_score: 0.98,
          canonical_application_url: "https://example.com/jobs/1",
          job_description_markdown: "Build things",
          matching_keywords: ["intern"],
          compensation_hint: ""
        }
      ],
      exhausted: true
    });

    expect(normalized.listings).toHaveLength(1);
    expect(normalized.exhausted).toBe(true);
  });
});
