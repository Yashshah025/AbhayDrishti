import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
os.chdir(os.path.join(os.path.dirname(__file__), 'backend'))

from ml.predictor import CrowdRiskPredictor
from engine import AlertEngine
from simulation.simulator import CrowdSimulator
from ml.features import calculate_features

print('Testing predictor...')
predictor = CrowdRiskPredictor()
print(f'  Ready: {predictor.is_ready}')

print('Testing simulator load...')
sim = CrowdSimulator()
sim.load_data()
print(f'  Loaded rows: {len(sim._df):,}')

print('Testing feature engineering + prediction...')
sample   = sim._df.head(20).copy()
enriched = calculate_features(sample)
result   = predictor.predict(enriched)
print(f'  Prediction: {result}')

print('Testing alert engine...')
engine = AlertEngine()
tick   = enriched.tail(1).to_dict(orient='records')[0]
alert  = engine.process_state(tick, result)
print(f'  Alert generated: {alert is not None}')
print()
print('PASS - Full backend stack works.')
