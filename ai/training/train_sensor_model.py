#!/usr/bin/env python3
"""Train a per-user GreenCropNAT sensor model from exported AI samples.

Input format:
  JSON returned by GET /api/ai/sensor-learning/me

The script uses pandas/numpy/scikit-learn when installed. If scikit-learn is not
available yet, it still writes a simple baseline model so the pipeline remains
usable during setup.
"""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Any


FEATURE_COLUMNS = [
    "pressure",
    "flow_rate",
    "ec_value",
    "ph_value",
    "temp_c",
    "wls1",
    "wls2",
    "float_alarm",
    "locked",
    "pump1_on",
    "pump2_on",
    "green_on",
    "red_on",
    "ph_ok",
    "is_on",
    "active_tank",
    "uptime_seconds",
    "pump_count",
]


def load_samples(input_path: Path) -> tuple[list[dict[str, float]], list[str], list[float], dict[str, Any]]:
    raw = json.loads(input_path.read_text(encoding="utf-8"))
    samples = raw.get("samples", raw if isinstance(raw, list) else [])
    tenant_meta = {
        "tenant_id": raw.get("tenant_id") if isinstance(raw, dict) else None,
        "device_id": raw.get("device_id") if isinstance(raw, dict) else None,
        "isolation": raw.get("isolation") if isinstance(raw, dict) else None,
    }

    rows: list[dict[str, float]] = []
    labels: list[str] = []
    risk_scores: list[float] = []
    for sample in samples:
        feature_raw = sample.get("feature_json") or "{}"
        try:
            features = json.loads(feature_raw) if isinstance(feature_raw, str) else dict(feature_raw)
        except Exception:
            features = {}
        rows.append({key: float(features.get(key) or 0) for key in FEATURE_COLUMNS})
        labels.append(str(sample.get("label") or "unknown"))
        risk_scores.append(float(sample.get("risk_score") or 0))

    return rows, labels, risk_scores, tenant_meta


def train_with_sklearn(rows: list[dict[str, float]], labels: list[str], risk_scores: list[float], output_dir: Path) -> dict[str, Any]:
    import joblib  # type: ignore
    import pandas as pd  # type: ignore
    from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor  # type: ignore
    from sklearn.metrics import accuracy_score, mean_absolute_error  # type: ignore
    from sklearn.model_selection import train_test_split  # type: ignore

    frame = pd.DataFrame(rows, columns=FEATURE_COLUMNS).fillna(0)
    can_split = len(rows) >= 8 and len(set(labels)) >= 2

    if can_split:
        x_train, x_test, y_train, y_test, r_train, r_test = train_test_split(
            frame,
            labels,
            risk_scores,
            test_size=0.25,
            random_state=42,
            stratify=labels if min(Counter(labels).values()) >= 2 else None,
        )
    else:
        x_train, x_test, y_train, y_test, r_train, r_test = frame, frame, labels, labels, risk_scores, risk_scores

    classifier = RandomForestClassifier(n_estimators=120, random_state=42, min_samples_leaf=2)
    classifier.fit(x_train, y_train)
    regressor = RandomForestRegressor(n_estimators=120, random_state=42, min_samples_leaf=2)
    regressor.fit(x_train, r_train)

    label_predictions = classifier.predict(x_test)
    risk_predictions = regressor.predict(x_test)

    output_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {
            "feature_columns": FEATURE_COLUMNS,
            "classifier": classifier,
            "risk_regressor": regressor,
        },
        output_dir / "sensor_model.joblib",
    )

    return {
        "engine": "scikit-learn",
        "sample_count": len(rows),
        "labels": dict(Counter(labels)),
        "accuracy": float(accuracy_score(y_test, label_predictions)) if len(y_test) else None,
        "risk_mae": float(mean_absolute_error(r_test, risk_predictions)) if len(r_test) else None,
        "model_file": str(output_dir / "sensor_model.joblib"),
    }


def train_baseline(rows: list[dict[str, float]], labels: list[str], risk_scores: list[float], output_dir: Path) -> dict[str, Any]:
    label_counts = Counter(labels)
    majority_label = label_counts.most_common(1)[0][0] if label_counts else "unknown"
    avg_risk = sum(risk_scores) / len(risk_scores) if risk_scores else 0
    model = {
        "engine": "baseline",
        "feature_columns": FEATURE_COLUMNS,
        "sample_count": len(rows),
        "majority_label": majority_label,
        "average_risk_score": avg_risk,
        "labels": dict(label_counts),
    }
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "sensor_model.baseline.json").write_text(json.dumps(model, indent=2), encoding="utf-8")
    return {**model, "model_file": str(output_dir / "sensor_model.baseline.json")}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Path to JSON from /api/ai/sensor-learning/me")
    parser.add_argument("--output-dir", default="ai/models", help="Where model files should be written")
    args = parser.parse_args()

    input_path = Path(args.input)
    output_dir = Path(args.output_dir)
    rows, labels, risk_scores, tenant_meta = load_samples(input_path)
    if not rows:
        raise SystemExit("No samples found. Let the device collect telemetry first, then export again.")

    try:
        report = train_with_sklearn(rows, labels, risk_scores, output_dir)
    except ImportError:
        report = train_baseline(rows, labels, risk_scores, output_dir)

    report["tenant_meta"] = tenant_meta
    (output_dir / "training_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
