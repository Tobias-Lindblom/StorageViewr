import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectNoSeriousAccessibilityViolations(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const serious = result.violations.filter((violation) =>
    violation.impact === "serious" || violation.impact === "critical",
  );
  expect(serious, serious.map((item) => `${item.id}: ${item.help}`).join("\n")).toEqual([]);
}

test("publika huvudvyer fungerar och klarar WCAG-kontroll", async ({ page }) => {
  for (const path of ["/", "/pilot", "/login"]) {
    await page.goto(path);
    await expect(page.locator("body")).toBeVisible();
    await expectNoSeriousAccessibilityViolations(page);
  }
});

test("inloggad navigering fungerar på desktop och mobil", async ({ page, browserName }) => {
  const suffix = `${browserName}-${test.info().project.name}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `e2e-${suffix}@example.test`;
  const origin = "http://127.0.0.1:3100";

  const registration = await page.request.post("/api/auth/register", {
    headers: { Origin: origin },
    data: { name: "E2E Testare", email, password: "e2e-sakert-losenord-2026" },
  });
  expect(registration.status()).toBe(201);

  const organization = await page.request.post("/api/organizations", {
    headers: { Origin: origin },
    data: { name: "E2E Lager", slug: `e2e-${suffix}`.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 60) },
  });
  expect(organization.status()).toBe(201);

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Huvudnavigation" })).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
});
