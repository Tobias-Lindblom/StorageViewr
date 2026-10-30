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

test("PWA:n återställer träffytor efter ett appbyte", async ({ page }) => {
  test.skip(test.info().project.name !== "mobile-chromium");
  await page.addInitScript(() => {
    let visibility: DocumentVisibilityState = "visible";
    const viewport = new EventTarget();
    Object.assign(viewport, {
      height: 500,
      offsetLeft: 0,
      offsetTop: 96,
      pageLeft: 0,
      pageTop: 96,
      scale: 1,
      width: 390,
    });
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: viewport,
    });
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => visibility === "hidden",
    });
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => visibility,
    });
    (window as Window & { setTestVisibility?: (value: DocumentVisibilityState) => void })
      .setTestVisibility = (value) => {
        visibility = value;
        document.dispatchEvent(new Event("visibilitychange"));
      };
  });

  await page.goto("/login");
  const email = page.getByLabel("E-postadress");
  await email.focus();
  await expect.poll(() => page.evaluate(() =>
    document.documentElement.style.getPropertyValue("--app-viewport-top"),
  )).toBe("96px");

  await page.evaluate(() => {
    (window as Window & { setTestVisibility?: (value: DocumentVisibilityState) => void })
      .setTestVisibility?.("hidden");
  });
  await expect.poll(() => page.evaluate(() => ({
    active: document.activeElement?.tagName,
    height: document.documentElement.style.getPropertyValue("--app-visible-height"),
    top: document.documentElement.style.getPropertyValue("--app-viewport-top"),
  }))).toEqual({ active: "BODY", height: "", top: "" });

  await page.evaluate(() => {
    (window as Window & { setTestVisibility?: (value: DocumentVisibilityState) => void })
      .setTestVisibility?.("visible");
  });
  await expect.poll(() => page.evaluate(() =>
    document.documentElement.style.getPropertyValue("--app-viewport-top"),
  )).toBe("");
  const password = page.getByRole("textbox", { name: "Lösenord" });
  await password.click();
  await expect(password).toBeFocused();
});

test("signaturen bevaras när mobilens viewport roteras", async ({ page, browserName }) => {
  test.skip(test.info().project.name !== "mobile-chromium");
  const suffix = `${browserName}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const origin = "http://127.0.0.1:3100";
  const headers = { Origin: origin };
  const post = async <T>(path: string, data: unknown, expected = 201) => {
    const response = await page.request.post(path, { headers, data });
    expect(response.status()).toBe(expected);
    return (await response.json()).data as T;
  };

  await post("/api/auth/register", {
    name: "Mobil Testare",
    email: `signature-${suffix}@example.test`,
    password: "e2e-sakert-losenord-2026",
  });
  await post("/api/organizations", {
    name: "Signaturlager",
    slug: `signature-${suffix}`.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 60),
  });
  const warehouse = await post<{ id: string }>("/api/warehouses", {
    name: "Mobillager",
    code: "MOBIL",
    address: "",
  });
  const location = await post<{ id: string }>("/api/locations", {
    warehouseId: warehouse.id,
    zone: "A",
    shelf: "1",
    position: "1",
  });
  const product = await post<{ id: string }>("/api/products", {
    sku: "SIGN-1",
    name: "Signaturprodukt",
    barcode: "",
    description: "",
    imageUrl: "",
  });
  await post("/api/inventory/placements", {
    productId: product.id,
    locationId: location.id,
  });
  const inventory = await post<{ id: string }>("/api/inventory/sessions", {
    name: "Signaturtest",
    baseline: true,
    warehouseId: warehouse.id,
    locationIds: [location.id],
  });
  const detailResponse = await page.request.get(`/api/inventory/sessions/${inventory.id}`);
  expect(detailResponse.status()).toBe(200);
  const detail = (await detailResponse.json()).data as {
    places: Array<{
      id: string;
      revision: number;
      rows: Array<{ productId: string; currentVersion: number | null; currentQuantity: number }>;
    }>;
  };
  const place = detail.places[0];
  const countResponse = await page.request.put(
    `/api/inventory/sessions/${inventory.id}/count/${place.id}`,
    {
      headers,
      data: {
        expectedRevision: place.revision,
        confirmReplace: false,
        confirmComplete: true,
        rows: place.rows.map((row) => ({
          productId: row.productId,
          expectedVersion: row.currentVersion,
          countedQuantity: row.currentQuantity,
        })),
      },
    },
  );
  expect(countResponse.status()).toBe(200);

  await page.addInitScript(() => {
    const nativeMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = (query: string) => query === "(display-mode: standalone)"
      ? {
          matches: true,
          media: query,
          onchange: null,
          addListener: () => undefined,
          removeListener: () => undefined,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          dispatchEvent: () => true,
        } as MediaQueryList
      : nativeMatchMedia(query);
  });
  await page.goto(`/inventories/${inventory.id}`);
  await page.getByRole("button", { name: "Granska och genomför" }).click();
  await page.getByRole("button", { name: "Öppna signeringsytan" }).click();
  const canvas = page.getByLabel("Skriv din signatur här");
  await expect(canvas).toBeVisible();
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  await page.mouse.move(bounds!.x + bounds!.width * 0.2, bounds!.y + bounds!.height * 0.55);
  await page.mouse.down();
  await page.mouse.move(bounds!.x + bounds!.width * 0.42, bounds!.y + bounds!.height * 0.35, { steps: 6 });
  await page.mouse.move(bounds!.x + bounds!.width * 0.68, bounds!.y + bounds!.height * 0.62, { steps: 6 });
  await page.mouse.up();
  const useSignature = page.getByRole("button", { name: "Använd signaturen" });
  await expect(useSignature).toBeEnabled();

  await page.setViewportSize({ width: 915, height: 412 });
  await expect(canvas).toBeVisible();
  await expect(useSignature).toBeEnabled();
  await useSignature.click();
  await expect(page.getByAltText("Sparad signatur")).toBeVisible();
});
