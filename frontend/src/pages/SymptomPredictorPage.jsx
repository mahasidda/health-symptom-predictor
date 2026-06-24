import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://health-symptom-predictor-fszu.onrender.com/api',
});

async function mapToKnownSymptoms(userInput) {
  try {
    const res = await api.post('/map-symptom', { input: userInput });
    return res.data.mapped || [];
  } catch {
    return [];
  }
}

function SymptomChip({ symptom, selected, onToggle }) {
  const label = symptom.replace(/_/g, ' ');
  return (
    <button
      onClick={() => onToggle(symptom)}
      style={{
        padding: '8px 14px', borderRadius: 20, fontSize: 13,
        fontWeight: 500, cursor: 'pointer', textTransform: 'capitalize',
        transition: 'all 0.15s',
        border: `1px solid ${selected ? '#6366f1' : '#d1d5db'}`,
        background: selected ? '#6366f1' : 'white',
        color: selected ? 'white' : '#374151',
        boxShadow: selected ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
      }}
    >
      {selected ? '✓ ' : ''}{label}
    </button>
  );
}

function SeverityBadge({ severity = '' }) {
  let color = '#10b981';
  if (/high/i.test(severity)) color = '#ef4444';
  else if (/moderate/i.test(severity)) color = '#f59e0b';
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 12,
      fontSize: 12, fontWeight: 600, color: 'white', background: color,
    }}>
      {severity || 'Unknown'}
    </span>
  );
}

function ResultCard({ result, name, age, symptoms, mappedSymptoms }) {
  const downloadReport = async () => {
    try {
      const res = await api.post('/report', {
        name, age, symptoms,
        prediction: result.prediction,
        confidence: result.confidence,
      }, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'health_report.txt');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      toast.error('Could not generate report');
    }
  };

  return (
    <div style={{
      background: 'white', border: '1px solid #e5e7eb',
      borderRadius: 14, padding: 22, marginTop: 20,
      boxShadow: '0 4px 16px rgba(99,102,241,0.10)'
    }}>
      {mappedSymptoms?.length > 0 && (
        <div style={{
          marginBottom: 14, padding: '10px 14px', borderRadius: 8,
          background: '#eff6ff', border: '1px solid #bfdbfe',
          fontSize: 13, color: '#1d4ed8'
        }}>
          🔍 Your input was matched to: <strong>{mappedSymptoms.map(s => s.replace(/_/g, ' ')).join(', ')}</strong>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
            Most Likely Condition
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>{result.prediction}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Confidence</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#6366f1' }}>{result.confidence}%</div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <SeverityBadge severity={result.severity} />
        <span style={{ fontSize: 13, color: '#6b7280' }}>
          Recommended: <strong style={{ color: '#111827' }}>{result.doctor}</strong>
        </span>
      </div>

      {result.top3?.length > 1 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#6b7280' }}>Other Possibilities</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {result.top3.slice(1).map(t => (
              <span key={t.disease} style={{
                fontSize: 12, padding: '4px 10px', borderRadius: 8,
                background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb',
              }}>
                {t.disease} ({t.confidence}%)
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 18, borderTop: '1px solid #f3f4f6', paddingTop: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: '#111827' }}>
          🩺 Suggested Precautions
        </div>
        <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {result.precautions.map((p, i) => (
            <li key={i} style={{ fontSize: 13, lineHeight: 1.6, color: '#374151' }}>{p}</li>
          ))}
        </ul>
      </div>

      <button onClick={downloadReport} style={{
        marginTop: 18, padding: '10px 20px', background: '#6366f1',
        color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer',
        fontSize: 14, fontWeight: 600, boxShadow: '0 2px 8px rgba(99,102,241,0.3)'
      }}>
        📄 Download Health Report
      </button>
    </div>
  );
}

export default function SymptomPredictorPage() {
  const [allSymptoms, setAllSymptoms]       = useState([]);
  const [selected, setSelected]             = useState([]);
  const [search, setSearch]                 = useState('');
  const [name, setName]                     = useState('');
  const [age, setAge]                       = useState('');
  const [result, setResult]                 = useState(null);
  const [loading, setLoading]               = useState(false);
  const [mappedSymptoms, setMappedSymptoms] = useState([]);

  useEffect(() => {
    api.get('/symptoms')
      .then(r => setAllSymptoms(r.data.symptoms || []))
      .catch(() => toast.error('Could not load symptoms — make sure backend is running'));
  }, []);

  const toggleSymptom = (s) => {
    setSelected(sel => sel.includes(s) ? sel.filter(x => x !== s) : [...sel, s]);
  };

  const filtered = allSymptoms.filter(s =>
    s.toLowerCase().includes(search.toLowerCase())
  );

  const handlePredict = async () => {
    setLoading(true);
    setResult(null);
    setMappedSymptoms([]);

    let symptomsToUse = [...selected];

    if (search.trim() !== '' && filtered.length === 0) {
      const mapped = await mapToKnownSymptoms(search.trim());
      if (mapped.length === 0) {
        toast.error('Could not match your symptom. Please try selecting from the list.');
        setLoading(false);
        return;
      }
      setMappedSymptoms(mapped);
      mapped.forEach(s => { if (!symptomsToUse.includes(s)) symptomsToUse.push(s); });
    }

    if (symptomsToUse.length === 0) {
      toast.warn('Please select or type at least one symptom');
      setLoading(false);
      return;
    }

    try {
      const res = await api.post('/predict', { symptoms: symptomsToUse });
      setResult(res.data);
    } catch {
      toast.error('Prediction failed. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes shimmer { 0% { background-position: -800px 0; } 100% { background-position: 800px 0; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        body { margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%); min-height: 100vh; }
        input:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
      `}</style>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 16px', fontFamily: 'Inter, system-ui, sans-serif' }}>

        <div style={{
          textAlign: 'center', marginBottom: 24,
          background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
          borderRadius: 20, padding: '28px 20px',
          border: '1px solid rgba(255,255,255,0.3)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: 52, marginBottom: 10 }}>🩺</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>
            AI Health Symptom Predictor
          </div>
          <div style={{ fontSize: 14, color: '#374151', marginTop: 8, lineHeight: 1.6 }}>
            Select symptoms or type anything — we will find the closest match.
          </div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.97)', borderRadius: 20, padding: 24,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)', border: '1px solid rgba(255,255,255,0.5)'
        }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            <input placeholder="Name (optional)" value={name} onChange={e => setName(e.target.value)}
              style={{ flex: 1, minWidth: 160, padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none' }} />
            <input placeholder="Age (optional)" type="number" value={age} onChange={e => setAge(e.target.value)}
              style={{ width: 120, padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none' }} />
          </div>

          <input
            placeholder="🔍 Search symptoms or type anything (e.g. heartpain, stomach ache)..."
            value={search}
            onChange={e => { setSearch(e.target.value); setResult(null); }}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, marginBottom: 12, boxSizing: 'border-box', outline: 'none' }}
          />

          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 8,
            maxHeight: 240, overflowY: 'auto', padding: 12,
            border: '1px solid #e5e7eb', borderRadius: 12, background: '#f8faff',
          }}>
            {filtered.map(s => (
              <SymptomChip key={s} symptom={s} selected={selected.includes(s)} onToggle={toggleSymptom} />
            ))}
            {filtered.length === 0 && search.trim() !== '' && (
              <div style={{
                fontSize: 13, padding: 12, color: '#1d4ed8',
                background: '#eff6ff', borderRadius: 8, width: '100%',
                border: '1px solid #bfdbfe'
              }}>
                💡 <strong>"{search}"</strong> is not in our list — click <strong>Predict</strong> and we will automatically find the closest matching symptom for you.
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, color: '#6b7280' }}>
                {selected.length} symptom{selected.length !== 1 ? 's' : ''} selected
              </span>
              {selected.length > 0 && (
                <button onClick={() => { setSelected([]); setResult(null); }}
                  style={{
                    fontSize: 12, padding: '4px 10px', borderRadius: 6,
                    border: '1px solid #fca5a5', background: '#fff1f2',
                    color: '#ef4444', cursor: 'pointer', fontWeight: 500
                  }}>
                  ✕ Clear All
                </button>
              )}
            </div>
            <button
              onClick={handlePredict}
              disabled={loading || (selected.length === 0 && search.trim() === '')}
              style={{
                padding: '11px 28px',
                background: loading || (selected.length === 0 && search.trim() === '') ? '#c7d2fe' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white', border: 'none', borderRadius: 10,
                cursor: loading || (selected.length === 0 && search.trim() === '') ? 'not-allowed' : 'pointer',
                fontSize: 14, fontWeight: 700,
                boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
                transition: 'all 0.2s'
              }}>
              {loading ? '🔍 Analyzing...' : 'Predict'}
            </button>
          </div>

          {loading && (
            <div style={{ marginTop: 20, background: 'white', border: '1px solid #e5e7eb', borderRadius: 14, padding: 22 }}>
              {[200, 140, 100, '100%', '90%', '95%'].map((w, i) => (
                <div key={i} style={{
                  width: w, height: i < 3 ? (i === 0 ? 24 : 16) : 14,
                  borderRadius: 6, marginBottom: 12,
                  background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                  backgroundSize: '800px 100%',
                  animation: 'shimmer 1.5s infinite linear'
                }} />
              ))}
              <div style={{ textAlign: 'center', fontSize: 13, color: '#6366f1', fontWeight: 600, animation: 'pulse 1.5s ease-in-out infinite' }}>
                🤖 AI is analyzing your symptoms...
              </div>
            </div>
          )}

          {!loading && result && (
            <ResultCard result={result} name={name} age={age} symptoms={selected} mappedSymptoms={mappedSymptoms} />
          )}
        </div>
      </div>
    </>
  );
}