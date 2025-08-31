# PredictWind Screenshooter (Apify Actor)

This Actor captures **wind map screenshots** from PredictWind at your venue, for selected **models** (defaults: AROME, ECMWF) and **hours** (defaults: 09:00–17:00), and stores PNGs in the run’s **Key‑value store**.

## How it works
- Opens the PredictWind **Wind** map centered at your coordinates.
- (Optionally) clicks the **Wind** layer and **model tabs** (via CSS selectors).
- Waits for the map to render, then takes a screenshot.
- Saves files like: `predictwind_ECMWF_YYYYMMDD_0900.png`.

## Inputs
- `lat`, `lon` — your venue coordinates (pre-filled).
- `models` — e.g., `["AROME","ECMWF"]` (must be available for your region).
- `hours` — default `[9,10,11,12,13,14,15,16,17]`.
- `mode`:
  - `batch`: in one run, capture all `hours` (ideal for a daily 09:00 schedule).
  - `hourly`: capture only the current local hour (schedule the Actor hourly).
- `timezone` — local timezone for naming (default `Europe/Rome`).
- `clickSelectors` — override CSS selectors if the UI changes.

## Outputs
- PNG images saved to the **default key‑value store** of the run.

## Scheduling
**Option 1: Batch once per day**
- Set `mode = batch`.
- Create a **Schedule** with CRON: `0 9 * * *` and Timezone `Europe/Rome`.
- One run per day at 09:00; it captures hours 09→17 for both models.

**Option 2: Hourly**
- Set `mode = hourly`.
- Create a **Schedule** with CRON: `0 9-17 * * *` and Timezone `Europe/Rome`.
- The Actor runs each hour and captures only that hour’s screenshots.

## Notes
- Ensure your PredictWind plan/UI exposes AROME/ECMWF for your region.
- Respect PredictWind’s Terms; use for personal/legitimate purposes.
- To export images elsewhere, you can add an integration (e.g., to S3 or Google Drive) or modify the Actor to upload after `Actor.setValue(...)`.
