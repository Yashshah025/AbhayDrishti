"""
train_lstm.py
=============
Train the 15-minute pressure-index LSTM forecaster on the existing
minute_level_dataset.csv.

Architecture matches ml/forecaster.py:
    LSTM(input=6, hidden=64, layers=2, dropout=0.2)
    -> Linear(64,64) -> ReLU -> Linear(64, HORIZON_MAX=15)

Inputs (per timestep):
    [pressure_index, entry_rate, exit_rate, density, vehicles, gradient]

Per-site, sliding window (stride=1):
    X: WINDOW_SIZE=30 minutes
    y: HORIZON_MAX=15 minutes (pressure_index only)

Train/Val/Test split: chronological 70/15/15.
Normalization: per-feature mean/std computed on train split, persisted in checkpoint.

Usage:
    cd ml-service
    python ml/train_lstm.py /data/minute_level_dataset.csv

Writes:  models/lstm_pressure.pt
"""
import os
import sys
import math
import json
import logging
from pathlib import Path

import numpy as np
import pandas as pd

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader

from ml.forecaster import _LSTMNet, WINDOW_SIZE, N_FEATURES, HORIZON_MAX

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger("train_lstm")

EPOCHS     = int(os.environ.get("LSTM_EPOCHS", "30"))
BATCH_SIZE = int(os.environ.get("LSTM_BATCH",  "256"))
LR         = float(os.environ.get("LSTM_LR",   "1e-3"))


def build_features(df: pd.DataFrame) -> np.ndarray:
    """Compute the 6-feature matrix expected by the LSTM."""
    df = df.copy()
    df['pressure_gradient'] = df['pressure_index'].diff().fillna(0)
    feats = df[[
        'pressure_index',
        'entry_flow_rate_pax_per_min',
        'exit_flow_rate_pax_per_min',
        'queue_density_pax_per_m2',
        'vehicle_count',
        'pressure_gradient',
    ]].astype(float).to_numpy()
    return feats


def make_windows(feats: np.ndarray):
    """Sliding-window slices: X (WINDOW_SIZE,6), y (HORIZON_MAX,)."""
    N = feats.shape[0]
    if N < WINDOW_SIZE + HORIZON_MAX:
        return np.empty((0, WINDOW_SIZE, N_FEATURES)), np.empty((0, HORIZON_MAX))
    Xs, ys = [], []
    for i in range(0, N - WINDOW_SIZE - HORIZON_MAX + 1):
        Xs.append(feats[i : i + WINDOW_SIZE])
        ys.append(feats[i + WINDOW_SIZE : i + WINDOW_SIZE + HORIZON_MAX, 0])  # pressure only
    return np.stack(Xs), np.stack(ys)


class WindowDataset(Dataset):
    def __init__(self, X, y, mean, std):
        self.X = (X - mean) / np.where(std == 0, 1, std)
        # Normalize y by pressure stats only
        self.y = (y - mean[0]) / (std[0] if std[0] != 0 else 1)
        self.X = self.X.astype(np.float32)
        self.y = self.y.astype(np.float32)

    def __len__(self):  return len(self.X)
    def __getitem__(self, i): return self.X[i], self.y[i]


def main(csv_path: str):
    log.info("Loading %s", csv_path)
    df = pd.read_csv(csv_path, parse_dates=['timestamp'])
    df = df.sort_values(['location', 'timestamp']).reset_index(drop=True)

    Xs_all, ys_all = [], []
    for site, g in df.groupby('location'):
        feats = build_features(g)
        Xs, ys = make_windows(feats)
        log.info("  site=%s windows=%d", site, len(Xs))
        if len(Xs):
            Xs_all.append(Xs)
            ys_all.append(ys)

    if not Xs_all:
        log.error("No training windows — check dataset.")
        sys.exit(1)

    X = np.concatenate(Xs_all, axis=0)
    y = np.concatenate(ys_all, axis=0)
    log.info("Total windows=%d", len(X))

    # Chronological split (assume already sorted per-site, concatenated by site so just split by index)
    n = len(X)
    train_end = int(n * 0.70)
    val_end   = int(n * 0.85)
    Xtr, ytr = X[:train_end],   y[:train_end]
    Xva, yva = X[train_end:val_end], y[train_end:val_end]
    Xte, yte = X[val_end:],     y[val_end:]

    # Per-feature mean/std on train inputs (flatten time)
    mean = Xtr.reshape(-1, N_FEATURES).mean(axis=0)
    std  = Xtr.reshape(-1, N_FEATURES).std(axis=0) + 1e-8
    log.info("feature_mean=%s feature_std=%s", mean.round(3).tolist(), std.round(3).tolist())

    train_loader = DataLoader(WindowDataset(Xtr, ytr, mean, std), batch_size=BATCH_SIZE, shuffle=True)
    val_loader   = DataLoader(WindowDataset(Xva, yva, mean, std), batch_size=BATCH_SIZE)
    test_loader  = DataLoader(WindowDataset(Xte, yte, mean, std), batch_size=BATCH_SIZE)

    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    log.info("device=%s", device)

    net = _LSTMNet().to(device)
    opt = torch.optim.Adam(net.parameters(), lr=LR)
    crit = nn.MSELoss()

    best_val = math.inf
    out_path = Path(__file__).resolve().parent.parent / 'models' / 'lstm_pressure.pt'
    out_path.parent.mkdir(parents=True, exist_ok=True)

    for epoch in range(1, EPOCHS + 1):
        net.train()
        train_losses = []
        for xb, yb in train_loader:
            xb = xb.to(device); yb = yb.to(device)
            opt.zero_grad()
            pred = net(xb)
            loss = crit(pred, yb)
            loss.backward()
            opt.step()
            train_losses.append(loss.item())

        net.eval()
        with torch.no_grad():
            val_losses = []
            for xb, yb in val_loader:
                xb = xb.to(device); yb = yb.to(device)
                val_losses.append(crit(net(xb), yb).item())

        train_l = float(np.mean(train_losses))
        val_l   = float(np.mean(val_losses))
        log.info("epoch=%02d train_mse=%.5f val_mse=%.5f", epoch, train_l, val_l)

        if val_l < best_val:
            best_val = val_l
            torch.save({
                'state_dict': net.state_dict(),
                'feature_mean': mean.tolist(),
                'feature_std':  std.tolist(),
                'epochs': epoch,
                'best_val_mse': val_l,
            }, out_path)
            log.info("  saved checkpoint → %s (best_val=%.5f)", out_path, val_l)

    # Test eval
    net.load_state_dict(torch.load(out_path, map_location=device)['state_dict'])
    net.eval()
    with torch.no_grad():
        test_losses = []
        for xb, yb in test_loader:
            xb = xb.to(device); yb = yb.to(device)
            test_losses.append(crit(net(xb), yb).item())
    log.info("test_mse=%.5f (denormalized RMSE≈%.3f pressure-units)",
             float(np.mean(test_losses)),
             float(np.sqrt(np.mean(test_losses)) * std[0]))


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("usage: python ml/train_lstm.py <minute_level_dataset.csv>")
        sys.exit(1)
    main(sys.argv[1])
