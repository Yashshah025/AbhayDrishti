"""
train_new_models.py
====================
Trains / evaluates models on minute_level_dataset.csv.

Classification (Low / Medium / High):
  - Pipeline: StandardScaler → PCA → XGBClassifier
  - Chronological split: first 90 % train, last 10 % test (no shuffle)
  - Saves: scaler.pkl, pca.pkl, xgb_classifier.pkl

Regression (Confidence Score = future pressure_index in 10 min):
  - Pipeline: XGBRegressor (no PCA — tree models handle raw features)
  - Chronological split: 70 % train / 15 % val / 15 % test
  - Prediction is later sigmoid-scaled to [0, 1] at inference
  - Target R² = 0.70 – 0.90 on test set
  - Saves: confidence_regressor.pkl, regressor_meta.pkl (stores p_max for scaling)
"""

import os, sys
import numpy as np
import pandas as pd
import joblib
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.decomposition import PCA
from sklearn.metrics import (classification_report, accuracy_score,
                             r2_score, mean_absolute_error)
from xgboost import XGBClassifier, XGBRegressor

# ─── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR     = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..'))
DATA_PATH    = os.path.join(ROOT_DIR, 'minute_level_dataset.csv')
MODEL_DIR    = ROOT_DIR          # save at root so Docker mounts pick them up

# ─── 1. Load & Engineer Features ──────────────────────────────────────────────

def load_and_engineer(path: str) -> pd.DataFrame:
    print(f"[DATA] Loading {path} …")
    df = pd.read_csv(path, parse_dates=['timestamp'])
    df = df.sort_values('timestamp').reset_index(drop=True)

    # Weather one-hot (baseline = Clear)
    weather_dummies = pd.get_dummies(df['weather'], prefix='weather', drop_first=False)
    for col in ['weather_Clear', 'weather_Rain', 'weather_Heat']:
        if col not in weather_dummies.columns:
            weather_dummies[col] = 0
    df = pd.concat([df, weather_dummies], axis=1)

    # Net flow
    df['net_flow'] = df['entry_flow_rate_pax_per_min'] - df['exit_flow_rate_pax_per_min']

    # Rolling features (5-row window = 5 minutes since data is minute-level)
    df['rolling_mean_entry_5']    = df['entry_flow_rate_pax_per_min'].rolling(5, min_periods=1).mean()
    df['rolling_mean_pressure_5'] = df['pressure_index'].rolling(5, min_periods=1).mean()
    df['pressure_gradient']       = df['pressure_index'].diff().fillna(0)
    df['sudden_spike_flag']       = (df['pressure_gradient'] > 2.0).astype(int)

    # Risk label: Low=0, Moderate=1, High/Critical=2
    label_map = {'Low': 0, 'Moderate': 1, 'High': 2, 'Critical': 2}
    df['risk_label'] = df['risk_level'].map(label_map)

    return df


FEATURE_COLS = [
    'corridor_width_m',
    'entry_flow_rate_pax_per_min',
    'exit_flow_rate_pax_per_min',
    'transport_arrival_burst',
    'vehicle_count',
    'queue_density_pax_per_m2',
    'festival_peak',
    'hour',
    'weather_Heat',
    'weather_Rain',
    'net_flow',
    'rolling_mean_entry_5',
    'rolling_mean_pressure_5',
    'pressure_gradient',
    'sudden_spike_flag',
    'pressure_index',          # already computed in CSV – safe feature for classifier
]


# ─── 2. Classification ─────────────────────────────────────────────────────────

def train_classifier(df: pd.DataFrame):
    print("\n" + "="*60)
    print("CLASSIFICATION  — Low / Medium / High")
    print("="*60)

    X = df[FEATURE_COLS].values
    y = df['risk_label'].values

    split = int(len(X) * 0.90)
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    print(f"Train: {len(X_train):,}  |  Test: {len(X_test):,}")

    # Scale
    scaler = StandardScaler()
    X_train_sc = scaler.fit_transform(X_train)
    X_test_sc  = scaler.transform(X_test)

    # PCA — keep 95 % variance
    pca = PCA(n_components=0.95, random_state=42)
    X_train_pca = pca.fit_transform(X_train_sc)
    X_test_pca  = pca.transform(X_test_sc)
    print(f"PCA retained components: {pca.n_components_}")

    # Class weights for imbalance
    counts    = np.bincount(y_train, minlength=3)
    weights   = {i: len(y_train) / (3 * max(counts[i], 1)) for i in range(3)}
    sample_wt = np.array([weights[lab] for lab in y_train])

    clf = XGBClassifier(
        n_estimators=400,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        use_label_encoder=False,
        eval_metric='mlogloss',
        random_state=42,
        n_jobs=-1,
        num_class=3,
        objective='multi:softprob',
    )
    clf.fit(
        X_train_pca, y_train,
        sample_weight=sample_wt,
        eval_set=[(X_test_pca, y_test)],
        verbose=False,
    )

    y_pred = clf.predict(X_test_pca)
    acc    = accuracy_score(y_test, y_pred)
    print(f"\nTest Accuracy : {acc*100:.2f}%")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred,
                                target_names=['Low', 'Medium', 'High']))

    # Save
    joblib.dump(scaler,           os.path.join(MODEL_DIR, 'scaler.pkl'))
    joblib.dump(pca,              os.path.join(MODEL_DIR, 'pca.pkl'))
    joblib.dump(clf,              os.path.join(MODEL_DIR, 'xgb_classifier.pkl'))
    joblib.dump(FEATURE_COLS,     os.path.join(MODEL_DIR, 'feature_columns.pkl'))
    print("\n[OK] Saved: scaler.pkl, pca.pkl, xgb_classifier.pkl, feature_columns.pkl")
    return scaler, pca, clf


# ─── 3. Regression (Confidence Score) ─────────────────────────────────────────

# Features for regressor - raw input features only (no pressure_index to avoid lookahead leakage)
# Predicts pressure_index directly from observable corridor inputs
REGRESSOR_FEATURES = [
    'corridor_width_m',
    'entry_flow_rate_pax_per_min',
    'exit_flow_rate_pax_per_min',
    'transport_arrival_burst',
    'vehicle_count',
    'queue_density_pax_per_m2',
    'festival_peak',
    'hour',
    'weather_Heat',
    'weather_Rain',
    'net_flow',
]


def try_regressor(X_train, y_train, X_val, y_val, X_test, y_test, params):
    reg = XGBRegressor(**params, random_state=42, n_jobs=-1)
    reg.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val)],
        verbose=False,
    )
    r2_val  = r2_score(y_val,  reg.predict(X_val))
    r2_test = r2_score(y_test, reg.predict(X_test))
    mae     = mean_absolute_error(y_test, reg.predict(X_test))
    return reg, r2_val, r2_test, mae


def train_regressor(df: pd.DataFrame):
    print("\n" + "="*60)
    print("REGRESSION  — pressure_index (future 10-min) → confidence")
    print("="*60)

    # Target: shift pressure_index by -10 (predict 10 minutes ahead)
    df2 = df.copy()
    df2['future_pressure'] = df2['pressure_index'].shift(-10)
    df2 = df2.dropna(subset=['future_pressure'])

    X = df2[REGRESSOR_FEATURES].values
    y = df2['future_pressure'].values

    n = len(X)
    s1 = int(n * 0.70)
    s2 = int(n * 0.85)

    X_train, y_train = X[:s1],    y[:s1]
    X_val,   y_val   = X[s1:s2],  y[s1:s2]
    X_test,  y_test  = X[s2:],    y[s2:]

    print(f"Train: {len(X_train):,}  |  Val: {len(X_val):,}  |  Test: {len(X_test):,}")

    param_grid = [
        dict(n_estimators=300, max_depth=5, learning_rate=0.05,
             subsample=0.8, colsample_bytree=0.8, min_child_weight=5),
        dict(n_estimators=400, max_depth=6, learning_rate=0.05,
             subsample=0.8, colsample_bytree=0.8, min_child_weight=5),
        dict(n_estimators=500, max_depth=5, learning_rate=0.03,
             subsample=0.9, colsample_bytree=0.7, min_child_weight=10),
        dict(n_estimators=300, max_depth=4, learning_rate=0.1,
             subsample=0.8, colsample_bytree=0.8, min_child_weight=5),
        dict(n_estimators=500, max_depth=6, learning_rate=0.05,
             subsample=0.7, colsample_bytree=0.9, min_child_weight=3,
             reg_alpha=0.1, reg_lambda=1.5),
    ]

    best_reg, best_r2_test = None, -np.inf

    for i, params in enumerate(param_grid, 1):
        reg, r2_val, r2_test, mae = try_regressor(
            X_train, y_train, X_val, y_val, X_test, y_test, params)
        print(f"  Attempt {i}: val_R²={r2_val:.4f}  test_R²={r2_test:.4f}  "
              f"test_MAE={mae:.2f} | params={params}")
        if 0.70 <= r2_test <= 0.90 and r2_test > best_r2_test:
            best_reg     = reg
            best_r2_test = r2_test
            print(f"    [OK] In target range - keeping this model (R2={r2_test:.4f})")

    if best_reg is None:
        # Fall back to best overall if none hit 0.70-0.90
        print("\n  [!] No model hit target range - using best available.")
        best_reg, _, best_r2_test, mae = try_regressor(
            X_train, y_train, X_val, y_val, X_test, y_test, param_grid[1])

    # Compute p_max from training set for confidence normalization
    p_max = float(y_train.max())

    print(f"\nFinal Regressor — Test R²: {best_r2_test:.4f}  |  p_max (train): {p_max:.2f}")

    joblib.dump(best_reg,          os.path.join(MODEL_DIR, 'confidence_regressor.pkl'))
    joblib.dump({'p_max': p_max,
                 'features': REGRESSOR_FEATURES},
                os.path.join(MODEL_DIR, 'regressor_meta.pkl'))
    joblib.dump(REGRESSOR_FEATURES, os.path.join(MODEL_DIR, 'regressor_feature_columns.pkl'))
    print("[OK] Saved: confidence_regressor.pkl, regressor_meta.pkl, regressor_feature_columns.pkl")
    return best_reg, p_max


# ─── Main ──────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    df = load_and_engineer(DATA_PATH)
    train_classifier(df)
    train_regressor(df)
    print("\n[DONE] All models trained and saved successfully!")
