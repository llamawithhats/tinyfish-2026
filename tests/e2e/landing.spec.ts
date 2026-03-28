import { test, expect } from "@playwright/test";

test("landing page explains the workflow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Apply to better internships")).toBeVisible();
  await expect(page.getByText("TinyFish-powered ATS automation")).toBeVisible();
});
