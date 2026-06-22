import React from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import SymptomPredictorPage from './pages/SymptomPredictorPage';

export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
      <ToastContainer position="top-right" autoClose={3000} />
      <SymptomPredictorPage />
    </div>
  );
}