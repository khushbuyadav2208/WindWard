import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("real-data dashboard, consistent filters, navigation, interval inspection and export", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await page.goto("/");
  await expect(page.getByText("100.0% paired coverage")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Actual vs. day-ahead forecast" }),
  ).toBeVisible();
  await page.screenshot({
    path: "../artifacts/overview-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "1D", exact: true }).click();
  await expect(page.getByText("48 matched intervals")).toBeVisible();
  await page.getByLabel("Date interpretation").selectOption("delivery");
  await expect(page.getByText(/January deliveries → decisions/)).toBeVisible();
  await page.getByRole("button", { name: "Decision settings" }).click();
  await page.getByLabel("Day-ahead cutoff (London)").fill("09:00");
  await expect(page.getByText("09:00 GMT on D−1.")).toBeVisible();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  expect((await downloadEvent).suggestedFilename()).toContain("windward");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.getByText("1,488 matched intervals")).toBeVisible();
  await page.getByLabel("End date", { exact: true }).fill("2026-01-15");
  await page.getByRole("button", { name: "Month", exact: true }).click();
  await expect(page.getByLabel("End date", { exact: true })).toHaveValue(
    "2026-01-31",
  );
  await expect(page.getByText("1,488 matched intervals")).toBeVisible();
  await page
    .getByRole("link", { name: "Forecast analysis", exact: true })
    .click();
  const search = page.getByLabel("Search delivery or publication date");
  await search.fill("2026-01-10");
  await expect(page.locator("tbody tr").first()).toContainText("Jan");
  await page.getByRole("button", { name: "Abs. error MW" }).click();
  await search.fill("impossible-search");
  await expect(
    page.getByText("No intervals match your search.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Accuracy analysis", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "MAPE", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "../artifacts/accuracy-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "Data & methodology", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Data health & provenance" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("responsive layout and mobile navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByText("100.0% paired coverage")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "../artifacts/overview-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("link", { name: "Accuracy analysis", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Understand the uncertainty." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("accessible overview has no serious or critical violations", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("100.0% paired coverage")).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  const violations = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(
    violations.map((v) => ({
      id: v.id,
      description: v.description,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
});
test("accuracy and methodology accessibility", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("100.0% paired coverage")).toBeVisible();
  for (const name of ["Accuracy analysis", "Data & methodology"]) {
    await page.getByRole("link", { name, exact: true }).click();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      results.violations
        .filter((v) => v.impact === "serious" || v.impact === "critical")
        .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
    ).toEqual([]);
  }
});
test("loading and safe API failure states", async ({ page }) => {
  let release: () => void = () => {};
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/dashboard?**", async (route) => {
    await ready;
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        detail: "Elexon is temporarily unavailable. Please retry later.",
      }),
    });
  });
  await page.goto("/");
  await expect(
    page.getByRole("status", { name: "Loading wind analysis" }),
  ).toBeVisible();
  release();
  await expect(
    page.getByRole("heading", { name: "We couldn’t load the analysis." }),
  ).toBeVisible();
  await expect(
    page.getByText("Elexon is temporarily unavailable. Please retry later."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});
