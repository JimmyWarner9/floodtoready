# Current location forecasts

The website now uses current Open-Meteo numerical weather forecasts rather than the earlier Shah Alam seasonal model. The Python training script remains a separate research starter.

GET /api/predictions defaults to Shah Alam. ?search= searches Malaysian place names; ?id= resolves a selected place and verifies country MY before fetching a seven-day forecast. Coverage depends on the place catalogue, not every address. The forecast covers a location point, not a whole state.

Cards show daily minimum/maximum temperature, total precipitation, maximum daily precipitation probability and thunderstorm conditions from WMO codes 95/96/99. Absence of modelled storms does not guarantee safety. Flood prediction remains unavailable. Official METMalaysia information is separately displayed. These are provider forecasts, not predictions from a newly trained local model.

Requests use bounded validated JSON, five-second per-provider timeouts, safe unavailable responses and a fifteen-minute forecast cache. Only searched public place names and resolved public coordinates go to Open-Meteo; household data is not sent. Do not enter personal addresses. Application code does not log searches. Place-result cache is bounded and in memory.

Attribution: Open-Meteo / GeoNames, CC BY 4.0.
https://open-meteo.com/en/docs
https://open-meteo.com/en/docs/geocoding-api
The public API is for non-commercial use under current terms. Review https://open-meteo.com/en/terms before commercial deployment.

Verification: production build, live Kuching search and seven-day forecast, offline and malformed-provider fallback checks.
