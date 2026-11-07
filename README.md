# Bloom Map — Gardens by the Bay

An interactive version of the official illustrated map of Gardens by the Bay (Bay South).
Visitors explore it on a large kiosk screen, build a visit plan, and scan a QR code to
carry that plan onto their phone. This is an entry for the Stratagile AI warm-up exercise.
The full spec is in [`docs/SPEC.md`](docs/SPEC.md).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173  (also on your LAN IP — open /m on a phone)
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
```

| URL | What |
|---|---|
| `/` | Picks kiosk or mobile automatically, based on screen size |
| `/kiosk` | Kiosk mode for 1920×1080 or 1366×768 touch screens |
| `/kiosk?idle=10` | Same, but resets after 10 s idle instead of 60 s (useful for demos) |
| `/m` | Mobile mode |
| `/m?a=flower-dome&plan=cloud-forest,planet` | Deep link that the kiosk QR code produces |
| `/a/<id>` | Short link to a single attraction |
| `?debug=1` | Clicking the map logs `{x, y}` in % for placing hotspots |

## Scanning the QR code with a phone (local)

- `npm run dev` prints a **📱 Kiosk for QR scanning** address. The kiosk can be opened at either
  that address or `localhost`. In both cases the QR uses the computer's Wi-Fi IP.
- The phone must be on the **same Wi-Fi** as the computer. Mobile data won't work.
- If the phone still can't connect:
  - Check that Windows Firewall allows **Node.js** (Windows Security → Firewall → Allow an app).
  - Check the Wi-Fi isn't a guest or office network that blocks devices from reaching each other.
    A phone hotspot is a quick workaround: connect both the computer and a second phone to it.
- A public deploy (Vercel) avoids all of this.

## How it works

- **Map:** `public/map.webp` is the official map. It falls back to `map.jpg`.
  Hotspots are HTML buttons placed in % coordinates inside a `react-zoom-pan-pinch` canvas.
  They are counter-scaled with a CSS variable so they stay the same size on screen at any zoom.
- **Data:** `src/data/attractions.json` lists 62 places: attractions 1–37, dining a–l, lakes,
  transport, the Garden Rhapsody show, the drop-off point and the five car parks. Sub-gardens carry a
  `group` ("World of Plants", "Heritage Gardens") that shows on the card and works in search. Each `pos` was read from the numbered marker on the official map.
  Descriptions are our own wording. Hours appear only where the official site states them.
- **Kiosk:**
  - An attract loop tours the highlights at full screen.
  - Touching the screen opens the explorer.
  - After 60 s idle, a 10 s "Still exploring?" countdown runs, then the kiosk resets.
  - The QR code always encodes the current selection and plan.
- **Mobile:**
  - Draggable bottom sheet with search, category filters and attraction details.
  - "My plan" has visited ticks, a nearest-neighbour walking order and sharing.
  - The plan is stored in `localStorage` under `gbtb-plan-v1`.
  - Colours follow the system light or dark mode.
- **Zoom:** 1× to 4× of the fitted view. Every hotspot label appears past 1.8×.
- **Offline:** the production build registers `public/sw.js`, so a kiosk keeps working without
  network once it has loaded. It isn't registered in `npm run dev`.
- **Card images:** each card shows a crop of the illustrated map (`MapThumb`), so no
  separate photo set is needed.

## Deploy (Vercel)

```bash
npx vercel           # first time: log in and link the project
npx vercel --prod
```

`vercel.json` rewrites every route to `index.html`. After deploying, open
`https://<your-app>.vercel.app/kiosk` on the big screen. The QR code automatically
points to the same domain.

## Credits

Map and content © Gardens by the Bay. This is a concept entry for the Stratagile AI warm-up and is not an official product.
