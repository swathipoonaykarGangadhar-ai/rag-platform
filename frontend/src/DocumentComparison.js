import React, { useState } from 'react';
import axios from 'axios';

const API = 'http://127.0.0.1:8000';

function DocumentComparison({ documents, onClose }) {
  const [doc1, setDoc1] = useState('');
  const [doc2, setDoc2] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const compare = async () => {
    if (!doc1 || !doc2) {
      setError('Please select two documents');
      return;
    }
    if (doc1 === doc2) {
      setError('Please select two different documents');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await axios.post(`${API}/compare`, { doc1, doc2 });
      setResult(res.data);
    } catch {
      setError('Comparison failed. Try again.');
    }
    setLoading(false);
  };

  const formatComparison = (text) => {
    if (!text) return [];
    const sections = text.split(/\n(?=\d\.|OVERVIEW|SIMILARITIES|DIFFERENCES|UNIQUE|RECOMMENDATION)/);
    return sections.filter(s => s.trim());
  };

  const getSectionColor = (section) => {
    if (section.includes('SIMILARITIES')) return '#3fb950';
    if (section.includes('DIFFERENCES')) return '#f85149';
    if (section.includes('UNIQUE TO DOC 1')) return '#58a6ff';
    if (section.includes('UNIQUE TO DOC 2')) return '#d29922';
    if (section.includes('RECOMMENDATION')) return '#6e56cf';
    return '#8b949e';
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0d1117cc',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        background: '#161b22', border: '1px solid #30363d',
        borderRadius: 16, width: '90%', maxWidth: 860,
        maxHeight: '90vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #30363d',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{ color: '#e6edf3', fontSize: 18, fontWeight: 700, margin: 0 }}>
              📊 Document Comparison
            </h2>
            <p style={{ color: '#8b949e', fontSize: 12, margin: '4px 0 0' }}>
              AI-powered side-by-side document analysis
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: '1px solid #30363d',
            color: '#8b949e', borderRadius: 8, padding: '6px 14px',
            cursor: 'pointer', fontSize: 13, fontFamily: 'Inter, sans-serif'
          }}>Close</button>
        </div>

        <div style={{ overflow: 'auto', flex: 1, padding: 24 }}>
          {/* Document Selectors */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, marginBottom: 20, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                Document 1
              </div>
              <select
                value={doc1}
                onChange={e => setDoc1(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px',
                  background: '#21262d', border: '1px solid #30363d',
                  borderRadius: 8, color: '#e6edf3', fontSize: 13,
                  fontFamily: 'Inter, sans-serif', outline: 'none'
                }}
              >
                <option value="">Select document...</option>
                {documents.map((doc, i) => (
                  <option key={i} value={doc}>{doc}</option>
                ))}
              </select>
            </div>

            <div style={{ color: '#8b949e', fontSize: 20, textAlign: 'center', paddingTop: 20 }}>⚡</div>

            <div>
              <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                Document 2
              </div>
              <select
                value={doc2}
                onChange={e => setDoc2(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px',
                  background: '#21262d', border: '1px solid #30363d',
                  borderRadius: 8, color: '#e6edf3', fontSize: 13,
                  fontFamily: 'Inter, sans-serif', outline: 'none'
                }}
              >
                <option value="">Select document...</option>
                {documents.map((doc, i) => (
                  <option key={i} value={doc}>{doc}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div style={{
              background: '#f8514922', color: '#f85149',
              borderRadius: 8, padding: '10px 14px',
              fontSize: 13, marginBottom: 16
            }}>{error}</div>
          )}

          <button
            onClick={compare}
            disabled={loading}
            style={{
              width: '100%', padding: 12, marginBottom: 24,
              background: '#6e56cf', color: 'white', border: 'none',
              borderRadius: 10, fontSize: 14, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              fontFamily: 'Inter, sans-serif'
            }}
          >
            {loading ? '🔍 Comparing documents...' : '⚡ Compare Documents'}
          </button>

          {/* Results */}
          {result && (
            <div>
              <div style={{
                display: 'flex', gap: 8, marginBottom: 16,
                padding: '10px 14px', background: '#21262d',
                borderRadius: 8, fontSize: 12, color: '#8b949e'
              }}>
                <span>📄 <strong style={{ color: '#58a6ff' }}>{result.doc1}</strong></span>
                <span>vs</span>
                <span>📄 <strong style={{ color: '#d29922' }}>{result.doc2}</strong></span>
              </div>

              {formatComparison(result.comparison).map((section, i) => {
                const color = getSectionColor(section);
                const lines = section.trim().split('\n');
                const title = lines[0];
                const content = lines.slice(1).join('\n').trim();
                return (
                  <div key={i} style={{
                    background: '#21262d', borderRadius: 10,
                    padding: '14px 16px', marginBottom: 10,
                    borderLeft: `3px solid ${color}`
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {title}
                    </div>
                    <div style={{ fontSize: 13, color: '#e6edf3', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                      {content}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DocumentComparison;