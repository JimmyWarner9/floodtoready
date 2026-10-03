# BanjirReady

A responsive Malaysian flood-preparedness web application with official state-level weather forecasts, METMalaysia weather bulletins, published NADMA preparation advice and agency call links.

## Run

Use Node.js 22 or newer. From this folder:

```text
npm install
npm run build
npm start
```

Open http://127.0.0.1:3000/. For development use `npm run dev`.

## Real information and coverage

The server reads the documented METMalaysia weather API at https://api.data.gov.my/weather/forecast and /weather/warning. State-category forecasts cover 13 states and Kuala Lumpur, Putrajaya and Labuan. The feed returned seven days per location on 3 October 2026. Coverage can change upstream: missing, invalid or failed responses display as unavailable with no simulated replacement. Forecast text is supplied in Bahasa Melayu. Data attribution: METMalaysia via data.gov.my, CC BY 4.0. Documentation: https://developer.data.gov.my/realtime-api/weather.

Requests have an eight-second timeout, schema validation, size bounds and a one-minute server cache. Browser refreshes every two minutes; manual refresh respects the server cache. Retrieval time is not an agency publication time. Warnings show their actual issuance and validity. Only bulletins with a known active validity interval appear. National warnings are not filtered by state, since their affected areas are free-text and include maritime regions.

River levels and rainfall measurements are available through links to JPS Public InfoBanjir, and shelter information through JKM InfoBencana. These have not been ingested into this application. There is no live rescue dispatch, route safety prediction or shelter-capacity feed.

Preparation tasks and the guidance assistant paraphrase NADMA's published safety advice (20 December 2023, PDF page 4). These are dated general guidance, not current evacuation orders. The assistant uses local rule-based retrieval; no generative AI provider or API key is configured. Questions stay in the browser. Checklist progress is saved locally only with consent and can be cleared.

Demo fixtures remain for historical unit tests; they are not rendered in the public application. Legacy demo chat/source endpoints are retired. No demo-mode badge or simulated gauges are displayed.

## Checks

`npm run build`, `npm test`, `npm run lint`.

Agency numbers open the phone dialler; the application never initiates a call or dispatches assistance automatically.
