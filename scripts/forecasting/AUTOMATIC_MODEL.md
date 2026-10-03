# Automatic seasonal estimates

GET /api/predictions trains a seasonal ridge regression for Shah Alam (3.0738, 101.5183). It fetches three years of daily ERA5 reanalysis mean temperature and precipitation from Open-Meteo. Historical data ends ten days before today to accommodate ERA5 publication delay. This is gridded reconstructed weather, not station measurements. Features are three annual Fourier harmonics; the model captures seasonal patterns rather than current approaching weather systems.

The earliest 80% trains a fixed model and the latest 20% evaluates mean absolute error against training-only monthly averages. A target is withheld if it does not improve that baseline. A passing target is then refitted on all historical records to estimate tomorrow. These small baseline improvements do not establish operational forecast skill or extreme-event performance. No flood or thunderstorm labels are inferred from rainfall: those targets remain unavailable without appropriate event datasets.

The endpoint uses an 8-second upstream timeout, bounded JSON, field/date validation, safe 503 errors and a one-hour cache. It sends only the fixed public coordinates and weather parameters; no household data or uploaded reports are transmitted. Report uploads remain in browser memory. Weather failure does not block official information or emergency actions.

Source and attribution: https://open-meteo.com/en/docs/historical-weather-api — Open-Meteo / ERA5, CC BY 4.0. The public Open-Meteo service is intended for non-commercial use under its current terms; review https://open-meteo.com/en/terms before commercial deployment and use its appropriate paid endpoint/key if required. This integration was requested to read real weather history automatically. It is separate from official METMalaysia feeds and warnings.

Before relying on predictions, evaluate multiple seasons, station comparisons, geographically separate locations and extreme weather. Do not interpret these estimates as a flood safety assessment.
