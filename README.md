# Boston Biking

An interactive map of Bluebikes station traffic in Boston and Cambridge, using March 2024 trips. Built for [DSC 106 Lab 7](https://dsc106.com/labs/lab07/) with Mapbox GL JS and D3, without a build step.

## Run locally

1. The supplied Mapbox **public** token is configured in the ignored local `config.js`. For a fresh clone, copy `config.example.js` to `config.js` and replace its placeholder with your public token.
2. Start a local server in this folder:

   ```sh
   python3 -m http.server 8000
   ```

3. Open http://localhost:8000. An internet connection is required for the libraries, basemap, and datasets. The trip CSV is about 21 MB, so the slider stays disabled until it finishes loading.

## Lab progress

- **Step 0:** Project HTML, global styling, and bike favicon are included. GitHub Pages uses the included Actions workflow to publish changes to `main`.
- **Step 1:** Mapbox is configured with the supplied public token to center on Boston with the lab's streets basemap and zoom limits.
- **Step 2:** Boston and Cambridge bike routes use separate GeoJSON sources and a shared green line style.
- **Step 3:** D3 draws 453 station circles in an SVG overlay. Mapbox projects their coordinates again when the map moves, zooms, or resizes.
- **Step 4:** Arrivals and departures are counted by station code with `d3.rollup`. A square-root scale controls circle size, and native SVG tooltips show the station name and counts.
- **Step 5:** The slider filters traffic within 60 minutes before and after the selected time. Its far-left position shows all trips. Minute buckets keep filtering responsive and handle windows across midnight. The filtered radius range follows the lab; stations with zero traffic are hidden.
- **Step 6:** A quantize scale groups the departure share into three colors. The legend uses the same CSS colors as the station circles.
- **Step 7:** The working map screenshot is included at `assets/boston-biking.png`. The portfolio entry uses its existing support for project URLs.

The lab's actual station JSON has `short_name`, `name`, `lat`, and `lon` fields. These are the fields used here. Filtering uses the optimized approach from step 5.4: departures are filtered by departure time and arrivals by arrival time.

## Publish to GitHub Pages

The public token is stored as the repository Actions secret `MAPBOX_ACCESS_TOKEN`. The workflow writes `config.js` into the published artifact, so the token stays out of Git history. It is still a public browser token and is visible to visitors, as required by Mapbox GL JS.

After checking changes locally:

```sh
git add index.html global.css map.css map.js assets README.md config.example.js .gitignore .github
git commit -m "Complete Boston biking visualization"
git push origin main
```

In the repository's **Settings → Pages**, the source is **GitHub Actions**. The project URL is https://davidli82.github.io/bostonbiking/ once deployment succeeds.

## Add the portfolio entry

Save a screenshot as `images/boston-biking.png` in the portfolio repository, then add this object to its `lib/projects.json`:

```json
{
  "title": "Boston Biking",
  "year": 2026,
  "image": "images/boston-biking.png",
  "url": "https://davidli82.github.io/bostonbiking/",
  "description": "An interactive map of March 2024 Bluebikes traffic in Boston and Cambridge. Explore bike routes and filter station arrivals and departures by time of day."
}
```

## Verification

JavaScript syntax was checked with `node --check map.js`. Using the lab's real 261,687-trip CSV, all 453 station counts were compared with an independent full-data calculation for all-day traffic and seven selected times, including midnight and both ends of the slider. The Boston GeoJSON URL returned 3,166 features.

Chrome checks passed for loading all stations, morning/evening filtering, midnight filtering, returning the slider to any time, updated tooltip text, pan/zoom positioning, and a 390-pixel mobile viewport without horizontal overflow. Chrome reported no browser errors. A desktop screenshot is saved at `assets/boston-biking.png`.

## Submission video

The lab requires an MP4 screen recording of **one minute or less**, with spoken explanation in this order:

1. Present the map.
2. Demonstrate all features: pan and zoom, point out the bike routes, hover over stations for counts, and move the time slider to show changing sizes and flow colors. Explain the legend and return to any time.
3. Share the most interesting thing you learned, in your own words.

A useful timing guide is 10 seconds introducing the map, 35 seconds demonstrating interactions, and 15 seconds explaining what you learned. Record and submit this yourself after checking the working site.
