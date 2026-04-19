import os
import joblib
import numpy as np

ROOT = r'c:\Users\YASH\OneDrive\Desktop\Lakshya'
files = ['scaler.pkl','pca.pkl','xgb_classifier.pkl','confidence_regressor.pkl',
         'regressor_meta.pkl','feature_columns.pkl','regressor_feature_columns.pkl']
print('=== Model Files ===')
for f in files:
    p = os.path.join(ROOT, f)
    exists = os.path.exists(p)
    size   = os.path.getsize(p) if exists else 0
    status = 'OK' if exists else 'MISSING'
    print(f'  {status} {f} ({size/1024:.1f} KB)')

print()
print('=== Quick Model Sanity Check ===')
scaler = joblib.load(ROOT + r'\scaler.pkl')
pca    = joblib.load(ROOT + r'\pca.pkl')
clf    = joblib.load(ROOT + r'\xgb_classifier.pkl')
reg    = joblib.load(ROOT + r'\confidence_regressor.pkl')
meta   = joblib.load(ROOT + r'\regressor_meta.pkl')

print(f'Scaler features: {scaler.n_features_in_}')
print(f'PCA components:  {pca.n_components_}')
print(f'Classifier classes: {clf.n_classes_}')
print(f'Regressor features: {reg.n_features_in_}')
print(f'p_max: {meta["p_max"]:.2f}')

# Test forward pass
X_dummy = np.zeros((1, scaler.n_features_in_))
Xs = scaler.transform(X_dummy)
Xp = pca.transform(Xs)
risk = clf.predict(Xp)
prob = clf.predict_proba(Xp)
print(f'Classifier output: class={risk[0]} prob={prob[0].round(3)}')

X_reg_dummy = np.zeros((1, reg.n_features_in_))
press = reg.predict(X_reg_dummy)
print(f'Regressor output: pressure={press[0]:.2f}')
print()
print('PASS - All models loaded and inference works.')
