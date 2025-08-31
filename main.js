import { Actor } from 'apify';
import { chromium } from 'playwright';

// Helper: pad 2 digits
const pad2 = (n) => String(n).padStart(2, '0');

await Actor.main(async () => {
  const input = await Actor.getInput() || {};

  const {
    lat = 39.206933,
    lon = 9.205533,
    zoom = 9,
    models = ["AROME", "ECMWF"],
    hours = [9,10,11,12,13,14,15,16,17], // 09:00 to 17:00 local
    urlTemplate = "https://www.predictwind.com/weather-maps/?wind&lat={lat}&lon={lon}&zoom={zoom}",
    viewportWidth = 1600,
    viewportHeight = 1000,
    deviceScaleFactor = 2,
    mapReadyWaitMs = 2000,
    clickSelectors = {
      wind: 'button[aria-label="Wind"]',
      model: 'button[data-model="{MODEL}"]',
      hour: '' // leave empty unless you know the selector template for hours
    },
    // Run mode:
    // "batch"  -> capture all hours in 'hours' in one run (easiest for daily 09:00 schedule)
    // "hourly" -> capture only the current local hour if between 9..17 (use hourly schedule)
    mode = "batch",
    timezone = "Europe/Rome"
  } = input;

  const baseUrl = urlTemplate
    .replace("{lat}", String(lat))
    .replace("{lon}", String(lon))
    .replace("{zoom}", String(zoom));

  // Create browser
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: viewportWidth, height: viewportHeight, deviceScaleFactor },
  });
  const page = await context.newPage();

  // Build hour list depending on mode
  let hourList = hours;
  if (mode === "hourly") {
    // Compute current local hour in the given timezone
    const now = new Date();
    // Convert now to timezone using Intl
    const fmt = new Intl.DateTimeFormat('en-GB', { hour12: false, timeZone: timezone, hour: '2-digit' });
    const currentHour = parseInt(fmt.format(now), 10);
    if (currentHour >= 9 && currentHour <= 17) {
      hourList = [currentHour];
    } else {
      Actor.log.info(`Current local hour (${currentHour}) is outside 09–17; exiting.`);
      await browser.close();
      return;
    }
  }

  // Navigate once per model to keep the SPA fresh
  for (const model of models) {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });

    // Ensure "Wind" layer (if needed)
    if (clickSelectors?.wind) {
      try {
        await page.click(clickSelectors.wind, { timeout: 5000 });
      } catch (e) {
        Actor.log.warning(`Wind-layer click skipped: ${e?.message || e}`);
      }
    }

    // Click model tab/button
    if (clickSelectors?.model) {
      const modelSelector = clickSelectors.model.replace("{MODEL}", model);
      try {
        await page.click(modelSelector, { timeout: 7000 });
      } catch (e) {
        Actor.log.warning(`Model click skipped for ${model}: ${e?.message || e}`);
      }
    }

    for (const hour of hourList) {
      // Optional: click hour if you know its selector template
      if (clickSelectors?.hour) {
        const hourSelector = clickSelectors.hour.replace("{HOUR}", String(hour));
        try {
          await page.click(hourSelector, { timeout: 7000 });
        } catch (e) {
          Actor.log.warning(`Hour click skipped for ${hour}: ${e?.message || e}`);
        }
      }

      await page.waitForTimeout(mapReadyWaitMs);

      // Timestamp (local to timezone) for file naming
      const now = new Date();
      const y = now.toLocaleString('en-GB', { timeZone: timezone, year: 'numeric' });
      const mm = pad2(parseInt(now.toLocaleString('en-GB', { timeZone: timezone, month: '2-digit' }), 10));
      const dd = pad2(parseInt(now.toLocaleString('en-GB', { timeZone: timezone, day: '2-digit' }), 10));
      const hh = pad2(hour);

      const png = await page.screenshot({ type: 'png' });
      const key = `predictwind_${model}_${y}${mm}${dd}_${hh}00.png`;

      // Save each image to the default key-value store
      await Actor.setValue(key, png, { contentType: 'image/png' });
      Actor.log.info(`Saved ${key}`);
    }
  }

  await browser.close();
});
