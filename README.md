# smoke-finder

Phase 1 of the Singapore smoking spot finder: the data pipeline and the F1
"Can I smoke here?" engine. No dependencies; needs Node 20+.

```sh
npm run data          # fetch raw data (NEA + OpenStreetMap) and build data/zones.json
npm run check -- 1.3039 103.8318 8   # lat lng [GPS accuracy in m]
npm test              # unit tests (synthetic data, no network)
npm run spotcheck     # real places against the built data
npm run import        # load data/zones.json into MongoDB (needs MONGO_URI, e.g. in .env)
```

## Where it runs

- **API:** the center-kitchen backend serves `GET /api/smoke/check?lat=&lng=&acc=`,
  plus `/api/smoke/dsas` and `/api/smoke/meta`. It installs this repo from GitHub
  and runs `src/engine.js` on the zones near the point, read from MongoDB
  (`smokezones`, `smokedsas`, `smokemeta`).
- **Test page:** `public/index.html`, deployed by Vercel as a static site.
- **Refreshing data:** run `npm run data` then `npm run import` on your machine.
  The import swaps collections in one step, so the API never sees half a dataset.

## How a check works

1. Within 10 m of an NEA designated smoking area → **green** (amber if GPS is worse than 20 m).
2. Inside a banned place, or within its legal buffer (e.g. 5 m of a bus stop) → **red**.
3. Within 5 m of a building, under a roof, in a multi-storey carpark, or close to a
   banned place (10 m, or the GPS accuracy if larger) → **amber**.
4. Otherwise **green**, unless GPS accuracy is worse than 20 m → **amber**.

Rules, buffers and wording live in `src/rules.js`, mapped from
[NEA's list of prohibited places](https://www.nea.gov.sg/our-services/smoking-prohibition/overview).

## Data

| Source | What | Notes |
| --- | --- | --- |
| data.gov.sg (NEA) | 52 designated smoking areas | All inside Orchard Road |
| OpenStreetMap (Overpass) | Bus stops, parks, schools, walkways, buildings, etc. | ODbL; coverage varies |
| Derived | Orchard Road No Smoking Zone | Hull of the DSAs + 60 m; NEA only publishes it on OneMap |

## Known gaps

- Orchard NSZ boundary is approximate (amber within 150 m outside it).
- Building entrances aren't in the data, so the 5 m rule is applied to every
  non-landed building wall as amber.
- Not mappable from open data: covered drop-off points, queue areas, house rules
  of private premises, hawker smoking corners.
