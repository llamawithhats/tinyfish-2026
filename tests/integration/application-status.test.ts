import { mapExecutionResultToListingStatus } from "@autointern/domain";

describe("application result state mapping", () => {
  it("maps TinyFish execution results to listing statuses", () => {
    expect(mapExecutionResultToListingStatus("success")).toBe("APPLIED");
    expect(mapExecutionResultToListingStatus("manual_action_required")).toBe("MANUAL_ACTION_REQUIRED");
    expect(mapExecutionResultToListingStatus("failed")).toBe("FAILED");
  });
});
