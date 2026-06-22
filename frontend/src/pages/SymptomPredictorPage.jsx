import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

function SymptomChip({ symptom, selected, onToggle }) {
  const label = symptom.replace(/_/g, ' ');
  return (
    <button
      onClick={() => onToggle(symptom)}
      style={{
        padding: '8px 14px',
        borderRadius: 20,
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer',
        textTransform: 'capitalize',
        transition: 'all 0.15s',
        border: `1px solid ${selected ? '#6366f1' : '#d1d5db'}`,
        background: selected ? '#6366f1' : '#f9fafb',
        color: selected ? 'white' : '#374151',
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

function ResultCard({ result, name, age, symptoms }) {
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
      boxShadow: '0 2px 8px rgba(0,0,0,0.07)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
            Most Likely Condition
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>
            {result.prediction}
          </div>
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
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#6b7280' }}>
            Other Possibilities
          </div>
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
        fontSize: 14, fontWeight: 600
      }}>
        📄 Download Health Report
      </button>
    </div>
  );
}

export default function SymptomPredictorPage() {
  const [allSymptoms, setAllSymptoms] = useState([]);
  const [selected, setSelected]       = useState([]);
  const [search, setSearch]           = useState('');
  const [name, setName]               = useState('');
  const [age, setAge]                 = useState('');
  const [result, setResult]           = useState(null);
  const [loading, setLoading]         = useState(false);

  useEffect(() => {
    api.get('/symptoms')
      .then(r => setAllSymptoms(r.data.symptoms || []))
      .catch(() => toast.error('Could not load symptoms — make sure backend is running on port 5000'));
  }, []);

  const toggleSymptom = (s) => {
    setSelected(sel => sel.includes(s) ? sel.filter(x => x !== s) : [...sel, s]);
  };

  const handlePredict = async () => {
    if (selected.length === 0) { toast.warn('Please select at least one symptom'); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post('/predict', { symptoms: selected });
      setResult(res.data);
    } catch {
      toast.error('Prediction failed. Make sure backend is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = allSymptoms.filter(s => s.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '24px 16px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 44, marginBottom: 8 }}>🩺</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>AI Health Symptom Predictor</div>
        <div style={{ fontSize: 14, color: '#6b7280', marginTop: 6 }}>
          Select your symptoms to get a possible condition, precautions, and doctor recommendation.
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <input placeholder="Name (optional)" value={name} onChange={e => setName(e.target.value)}
          style={{ flex: 1, minWidth: 160, padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none' }} />
        <input placeholder="Age (optional)" type="number" value={age} onChange={e => setAge(e.target.value)}
          style={{ width: 120, padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none' }} />
      </div>
      <input placeholder="🔍 Search symptoms..." value={search} onChange={e => setSearch(e.target.value)}
        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, marginBottom: 12, boxSizing: 'border-box', outline: 'none' }} />
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 8,
        maxHeight: 240, overflowY: 'auto', padding: 12,
        border: '1px solid #e5e7eb', borderRadius: 12, background: '#f9fafb',
      }}>
        {filtered.map(s => (
          <SymptomChip key={s} symptom={s} selected={selected.includes(s)} onToggle={toggleSymptom} />
        ))}
        {filtered.length === 0 && (
          <div style={{ fontSize: 13, color: '#9ca3af', padding: 8 }}>No matching symptoms</div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
        <span style={{ fontSize: 13, color: '#6b7280' }}>
          {selected.length} symptom{selected.length !== 1 ? 's' : ''} selected
        </span>
        <button onClick={handlePredict} disabled={loading || selected.length === 0}
          style={{
            padding: '10px 24px',
            background: loading || selected.length === 0 ? '#c7d2fe' : '#6366f1',
            color: 'white', border: 'none', borderRadius: 8,
            cursor: loading || selected.length === 0 ? 'not-allowed' : 'pointer',
            fontSize: 14, fontWeight: 600
          }}>
          {loading ? '⏳ Predicting...' : '🔮 Predict'}
        </button>
      </div>
      {result && <ResultCard result={result} name={name} age={age} symptoms={selected} />}
    </div>
  );
}