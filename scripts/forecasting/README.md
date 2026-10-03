# Banjir Ready experimental forecasting

This starter trains next-day temperature, rainfall, thunderstorm and flood-event models from real daily observations for one location. It does not contain fabricated training data or an already-trained model.

Fill historical-template.csv with at least 365 consecutive daily observations. Several years, including enough storm and flood events, are preferable. Match all measurements and event labels to the same location and daily time window. Use storm_observed and flood_observed as 0/1 confirmed observations, not forecasts or warning labels. Keep original sources, measurement definitions, units and licensing in a separate provenance file. Do not mix regional labels with station-level measurements without a documented aggregation method.

Run:

    python train.py historical-template.csv

The script writes forecast-report.json next to the CSV. It uses an earlier 80% for training and later 20% for testing. Scaling uses training data only. Continuous targets must beat yesterday's observation; event scores must beat training prevalence. Predictions that fail this check are withheld. Too few positive events also disable an event model.

Event outputs are uncalibrated experimental scores, not reliable flood probabilities. This is a baseline for research: tune and validate with separate chronological validation sets, multiple seasons, class-specific metrics, calibration and geographic testing before deployment. A single holdout comparison is not a safety certification.

No website integration is enabled yet. Display validated model outputs separately from official METMalaysia forecasts. Never interpret missing data or a low score as proof that a place is safe. Never replace official warnings or emergency advice with these outputs.
