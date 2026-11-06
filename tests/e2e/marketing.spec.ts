import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("landing and contact information remain readable without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("/");
  expect(await page.locator('[data-reveal-state="hidden"]').count()).toBe(0);
  const headings = page.locator("main h2");
  expect(await headings.count()).toBeGreaterThan(5);
  for (const heading of await headings.all()) await expect(heading).toBeVisible();
  await expect(page.getByText("93", { exact: true })).toBeVisible();
  await page.goto("/pilot");
  expect(await page.locator("p").allTextContents()).toEqual(
    expect.arrayContaining([expect.stringContaining("Aktivera JavaScript")]),
  );
  await expect(page.locator("#pilot-form")).toHaveAttribute("method", "post");
  await page.goto("/integritet");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await context.close();
});

test("missing IntersectionObserver and blocked hydration leave content visible", async ({ page }) => {
  await page.addInitScript(() => { Reflect.deleteProperty(window, "IntersectionObserver"); });
  await page.goto("/");
  expect(await page.locator('[data-reveal-state="hidden"]').count()).toBe(0);
  await page.route("**/*.js*", (route) => route.abort());
  await page.reload();
  expect(await page.locator('[data-reveal-state="hidden"]').count()).toBe(0);
  await expect(page.getByRole("heading", { name: "Från lagersaldo till färdiga rapporter" })).toBeVisible();
});

test("scroll reveal works for tall mobile sections and respects reduced motion", async ({ page }) => {
  await page.goto("/");
  await expect.poll(() => page.locator('[data-reveal-state="hidden"]').count()).toBeGreaterThan(0);
  const target = page.locator("#rapporter [data-reveal-state]");
  await target.scrollIntoViewIfNeeded();
  await expect(target).toHaveAttribute("data-reveal-state", "visible");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator('[data-reveal-state="hidden"]')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('[data-reveal-state="hidden"]')).toHaveCount(0);
  await expect(page.getByText("93", { exact: true })).toBeVisible();
});

test("pilot form validates, preserves data on failure, prevents duplicate submits and confirms success", async ({ page }) => {
  await page.goto("/pilot");
  await page.getByRole("link", { name: "Gå till formuläret" }).click();
  await expect(page.locator("#pilot-form")).toBeFocused();
  const submit = page.getByRole("button", { name: "Skicka pilotförfrågan" });
  await submit.click();
  await expect(page.locator('[name="name"]')).toBeFocused();
  await expect(page.locator('[name="name"]')).toHaveAttribute("aria-invalid", "true");
  await page.locator('[name="name"]').fill("Anna Andersson");
  await page.locator('[name="companyName"]').fill("Testlager AB");
  await page.locator('[name="email"]').fill("anna@example.test");
  for (const name of ["businessType", "productRange", "locationRange"]) {
    await page.locator('[name="' + name + '"]').selectOption({ index: 1 });
  }
  const need = page.getByRole("checkbox", { name: "Inventering", exact: true });
  await need.focus();
  await page.keyboard.press("Space");
  await expect(need).toBeChecked();
  await page.route("**/api/pilot-requests", (route) => route.fulfill({
    status: 500, contentType: "application/json",
    body: JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Testfel" } }),
  }));
  await submit.click();
  await expect(page.locator("#pilot-form").getByRole("alert")).toBeVisible();
  await expect(page.locator('[name="email"]')).toHaveValue("anna@example.test");
  await page.unroute("**/api/pilot-requests");
  let requests = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/pilot-requests", async (route) => {
    requests++;
    expect(route.request().postDataJSON().needs).toEqual(["Inventering"]);
    await gate;
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ data: { received: true } }) });
  });
  await submit.click();
  await expect(page.getByRole("button", { name: "Skickar förfrågan" })).toBeDisabled();
  await page.locator("#pilot-form").evaluate((form) => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  release();
  const success = page.getByRole("heading", { name: "Tack — vi har fått er pilotförfrågan." });
  await expect(success).toBeFocused();
  expect(requests).toBe(1);
  await expect(page.getByRole("status")).toContainText("inom 24 timmar");
  await expect(page.getByRole("status")).toContainText("inget automatiskt bekräftelsemejl");
});

test("privacy and pilot terms have no serious accessibility violations", async ({ page }) => {
  for (const path of ["/pilot", "/integritet", "/om-oss", "/kontakt"]) {
    await page.goto(path);
    if (path === "/pilot") await page.getByText("Praktiskt om piloten", { exact: true }).click();
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(result.violations.filter((item) => item.impact === "serious" || item.impact === "critical")).toEqual([]);
  }
});

test("public pages reflow at 320 pixels and doubled text size", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 800 });
  for (const path of ["/", "/pilot", "/integritet", "/om-oss", "/kontakt"]) {
    await page.goto(path);
    // Wait for hydration before changing text sizing. Use a stylesheet so React's
    // DOM attributes stay untouched, as with browser accessibility preferences.
    await page.waitForFunction(() => document.querySelector("main") &&
      [...document.querySelectorAll("a")].some((a) => Object.keys(a).some((key) => key.startsWith("__reactProps"))));
    // Streaming can continue briefly after React attaches event handlers.
    // Leave the DOM untouched until hydration has settled.
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      const entries = [...document.querySelectorAll<HTMLElement>("main *")].map((element) => ({
        element, size: parseFloat(getComputedStyle(element).fontSize),
        line: parseFloat(getComputedStyle(element).lineHeight),
      }));
      const style = document.createElement("style");
      style.textContent = entries.map(({ element, size, line }, i) => {
        element.classList.add("text-zoom-" + i);
        return ".text-zoom-" + i + "{font-size:" + size * 2 + "px!important;" +
          (Number.isFinite(line) ? "line-height:" + line * 2 + "px!important;" : "") + "}";
      }).join("\\n");
      document.head.append(style);
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    const overflowingText = await page.locator("main h1, main h2, main p, main label, main summary, main dd, main button").evaluateAll((elements) =>
      elements.filter((element) => {
        const box = element.getBoundingClientRect();
        return !element.closest('[aria-hidden="true"]') && box.width > 0 && (element.scrollWidth > element.clientWidth + 2 ||
          box.left < -2 || box.right > innerWidth + 2);
      }).map((element) => element.textContent?.trim().slice(0, 100)),
    );
    expect(overflowingText).toEqual([]);
    await page.screenshot({ path: test.info().outputPath(path === "/" ? "landing-zoom.png" : path.slice(1) + "-zoom.png"), fullPage: true });
    await page.goto("about:blank");
  }
});

test("social metadata and sharing image are available without indexing development", async ({ page, request }) => {
  await page.goto("/pilot");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", "Starta pilot | StorageViewr");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  const response = await request.get("/opengraph-image");
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/png");
  expect((await response.body()).subarray(1, 4).toString()).toBe("PNG");
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  expect(await sitemap.text()).not.toContain("/dashboard");
});

test("footer routes visitors to about and contact pages without exposing contact details inline", async ({ page }) => {
  await page.goto("/");
  const footer = page.locator("footer");
  await expect(footer).not.toContainText("tobiasmagnuslindblom@gmail.com");
  await expect(footer).not.toContainText("Tobias Lindblom");
  await footer.getByRole("link", { name: "Om oss", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Om StorageViewr" })).toBeVisible();
  await page.locator("footer").getByRole("link", { name: "Kontakta oss", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Kontakta oss" })).toBeVisible();
  await expect(page.getByRole("link", { name: "tobiasmagnuslindblom@gmail.com" })).toHaveAttribute("href", "mailto:tobiasmagnuslindblom@gmail.com");
});
