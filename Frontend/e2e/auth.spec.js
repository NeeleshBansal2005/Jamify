import { expect, test } from "@playwright/test";
import { createAuthenticatedUser } from "./helpers/jamify.js";

test("authentication smoke: a registered test user can log in through the UI", async ({
  browser
}) => {
  const user = await createAuthenticatedUser("auth");
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto("/login");
    await page.getByPlaceholder("Email").fill(user.account.email);
    await page.getByPlaceholder("Password").fill(user.account.password);
    await page.getByRole("button", { name: "Login" }).click();

    await expect(page).toHaveURL(/\/discover$/);
    await expect(
      page.getByRole("heading", { name: "Live Rooms" })
    ).toBeVisible();
  } finally {
    await context.close();
    await user.api.dispose();
  }
});
