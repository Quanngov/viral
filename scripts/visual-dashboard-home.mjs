/**
 * Visual capture for dashboard home panels (desktop + mobile).
 * Run: npx playwright install chromium && node scripts/visual-dashboard-home.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "fs/promises";
import path from "path";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const OUT = path.join(process.cwd(), "tmp", "visual-dashboard-home");

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const contexts = [
    { name: "desktop", width: 1280, height: 800 },
    { name: "mobile", width: 390, height: 844 },
  ];

  for (const ctx of contexts) {
    const page = await browser.newPage({ viewport: { width: ctx.width, height: ctx.height } });
    await page.addInitScript(() => {
      window.localStorage.setItem("viral:onboarding-dismissed", "1");
    });
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForSelector("section.dashboard-home-section .dashboard-home-panel", {
      timeout: 30_000,
    });
    await page.waitForTimeout(1000);

    const panel = page.locator("section.dashboard-home-section .dashboard-home-panel");
    await panel.scrollIntoViewIfNeeded();
    await panel.screenshot({ path: path.join(OUT, `panel-${ctx.name}.png`) });

    await page.screenshot({
      path: path.join(OUT, `home-${ctx.name}.png`),
      fullPage: false,
    });
    await page.close();
  }

  await browser.close();
  console.log(`Screenshots saved to ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
