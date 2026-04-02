import { test, expect } from "@playwright/test";

test("app loads and shows sidebar", async ({ page }) => {
  await page.goto("/");
  // The app redirects to /races by default — sidebar should be visible
  await expect(page.locator("nav")).toBeVisible();
});

test("entity list loads content", async ({ page }) => {
  await page.goto("/races");
  // At least one entity card should render from the SRD pack
  const cards = page.locator("[data-testid='entity-card']");
  await expect(cards.first()).toBeVisible({ timeout: 10_000 });
});
