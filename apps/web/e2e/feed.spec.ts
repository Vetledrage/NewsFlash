import { test, expect } from "@playwright/test";

test("feed page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\//);
  // The skeleton should render quickly.
  await expect(page.locator("text=Read more").first()).toBeVisible({
    timeout: 15_000
  });
});

