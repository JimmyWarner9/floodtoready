"""Train next-day models from daily observations; Python standard library only."""
import csv
import json
import math
import sys
from datetime import date, timedelta
from pathlib import Path

FEATURES = ['temperature_c', 'rainfall_mm', 'humidity_pct', 'pressure_hpa', 'wind_kmh', 'river_level_m']
TARGETS = ['temperature_c', 'rainfall_mm', 'storm_observed', 'flood_observed']

def solve(a, b):
    a = [row[:] + [v] for row, v in zip(a, b)]
    for k in range(len(b)):
        pivot = max(range(k, len(b)), key=lambda i: abs(a[i][k]))
        a[k], a[pivot] = a[pivot], a[k]
        divisor = a[k][k]
        if abs(divisor) < 1e-12:
            raise ValueError('Insufficient variation in training data')
        a[k] = [v / divisor for v in a[k]]
        for i in range(len(b)):
            if i != k:
                factor = a[i][k]
                a[i] = [v - factor * w for v, w in zip(a[i], a[k])]
    return [row[-1] for row in a]

def main():
    if len(sys.argv) != 2:
        raise ValueError('Usage: python train.py historical.csv')
    with open(sys.argv[1], encoding='utf-8-sig', newline='') as f:
        rows = list(csv.DictReader(f))
    if len(rows) < 365:
        raise ValueError('Provide at least 365 daily observations for one location. More years are recommended.')
    if len({r['location'] for r in rows}) != 1:
        raise ValueError('Use one location per training run')
    rows.sort(key=lambda r: r['date'])
    for i, r in enumerate(rows):
        r['day'] = date.fromisoformat(r['date'])
        if i and r['day'] != rows[i-1]['day'] + timedelta(days=1):
            raise ValueError('Dates must be unique and consecutive; resolve gaps first')
        for key in FEATURES + TARGETS[2:]:
            r[key] = float(r[key])
            if not math.isfinite(r[key]):
                raise ValueError('Non-finite observation')
        if r['rainfall_mm'] < 0 or r['wind_kmh'] < 0 or not 0 <= r['humidity_pct'] <= 100:
            raise ValueError('Invalid rainfall, wind or humidity')
        if any(r[k] not in (0, 1) for k in TARGETS[2:]):
            raise ValueError('Storm/flood observations must be 0 or 1')
    # Features are strictly from the day before the target outcome.
    pairs = list(zip(rows[:-1], rows[1:]))
    split = int(len(pairs) * .8)
    train, test = pairs[:split], pairs[split:]
    means = [sum(r[k] for r, _ in train)/len(train) for k in FEATURES]
    scales = [max(1e-6, math.sqrt(sum((r[k]-m)**2 for r, _ in train)/len(train))) for k, m in zip(FEATURES, means)]
    def vector(r):
        angle = 2*math.pi*r['day'].timetuple().tm_yday/365.25
        return [1.] + [(r[k]-m)/s for k,m,s in zip(FEATURES, means, scales)] + [math.sin(angle), math.cos(angle)]
    xs = [vector(r) for r, _ in train]
    size = len(xs[0])
    matrix = [[sum(x[i]*x[j] for x in xs) + (1. if i == j and i else 0.) for j in range(size)] for i in range(size)]
    report = {'location': rows[0]['location'], 'experimental': True, 'method': 'Ridge regression, chronological 80/20 holdout', 'training_end': train[-1][1]['date'], 'test_start': test[0][1]['date'], 'prediction_date': str(rows[-1]['day']+timedelta(days=1)), 'targets': {}}
    for target in TARGETS:
        binary = target.endswith('observed')
        if binary and (sum(r[target] for _,r in train) < 20 or sum(r[target] for _,r in test) < 5):
            report['targets'][target] = {'available': False, 'reason': 'Too few positive historical events to evaluate'}
            continue
        coefficients = solve(matrix, [sum(x[i]*r[target] for x,(_,r) in zip(xs,train)) for i in range(size)])
        def predict(r):
            value = sum(w*v for w,v in zip(coefficients,vector(r)))
            return min(1., max(0.,value)) if binary else max(0.,value) if target == 'rainfall_mm' else value
        errors = [(predict(a)-b[target])**2 if binary else abs(predict(a)-b[target]) for a,b in test]
        baseline = sum(r[target] for _,r in train)/len(train)
        baseline_errors = [(baseline-b[target])**2 if binary else abs(a[target]-b[target]) for a,b in test]
        score, reference = sum(errors)/len(errors), sum(baseline_errors)/len(baseline_errors)
        better = score < reference
        report['targets'][target] = {'available': better, 'metric': 'Brier score (uncalibrated score)' if binary else 'MAE', 'model_error': score, 'baseline_error': reference, 'next_day_prediction': predict(rows[-1]) if better else None, 'coefficients': coefficients, 'reason': 'Experimental; needs further validation' if better else 'Did not beat baseline; prediction withheld'}
    report['scaling'] = {'features': FEATURES, 'means': means, 'scales': scales}
    destination = Path(sys.argv[1]).with_name('forecast-report.json')
    destination.write_text(json.dumps(report, indent=2), encoding='utf-8')
    print('Saved', destination)

if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, OSError) as error:
        sys.exit(str(error))
