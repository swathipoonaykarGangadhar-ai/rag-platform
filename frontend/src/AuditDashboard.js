import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://127.0.0.1:8000';

function AuditDashboard({ onClose }) {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, logsRes] = await Promise.all([
        axios.get(`${API}/audit/stats`),
        axios.get(`${API}/audit/logs`)
      ]);
      setStats(statsRes.data);
      setLogs(logsRes.data.logs.reverse());
    } catch {}
    setLoading(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0d1117cc',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        background: '#161b22', border: '1px solid #30363d',
        borderRadius: 16, width: '90%', maxWidth: 800,
        maxHeight: '85vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #30363d',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{ color: '#e6edf3', fontSize: 18, fontWeight: 700, margin: 0 }}>
              📋 Audit Trail
            </h2>
            <p style={{ color: '#8b949e', fontSize: 12, margin: '4px 0 0' }}>
              Compliance log of all queries and responses
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: '1px solid #30363d',
            color: '#8b949e', borderRadius: 8, padding: '6px 14px',
            cursor: 'pointer', fontSize: 13, fontFamily: 'Inter, sans-serif'
          }}>Close</button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#8b949e' }}>
            Loading audit data...
          </div>
        ) : (
          <div style={{ overflow: 'auto', flex: 1 }}>
            {/* Stats */}
            {stats && (
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12, padding: 20
              }}>
                {[
                  { label: 'Total Queries', value: stats.total_queries, color: '#6e56cf' },
                  { label: 'Avg Confidence', value: stats.avg_confidence + '%', color: '#3fb950' },
                  { label: 'Unique Users', value: stats.unique_users, color: '#58a6ff' },
                  { label: 'High Confidence', value: stats.high_confidence, color: '#3fb950' },
                  { label: 'Medium Confidence', value: stats.medium_confidence, color: '#d29922' },
                  { label: 'Low Confidence', value: stats.low_confidence, color: '#f85149' },
                ].map((stat, i) => (
                  <div key={i} style={{
                    background: '#21262d', borderRadius: 10,
                    padding: '14px 16px', border: '1px solid #30363d'
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: stat.color }}>
                      {stat.value}
                    </div>
                    <div style={{ fontSize: 11, color: '#8b949e', marginTop: 4 }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Logs */}
            <div style={{ padding: '0 20px 20px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#8b949e', 
                textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                Recent Queries
              </div>
              {logs.length === 0 && (
                <div style={{ color: '#8b949e', fontSize: 13, padding: 20, textAlign: 'center' }}>
                  No queries logged yet
                </div>
              )}
              {logs.map((log, i) => (
                <div key={i} style={{
                  background: '#21262d', borderRadius: 10,
                  padding: '12px 16px', marginBottom: 8,
                  border: '1px solid #30363d'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: '#6e56cf', fontWeight: 600 }}>
                      {log.user_email}
                    </span>
                    <span style={{ fontSize: 11, color: '#8b949e' }}>
                      {log.timestamp} · {log.response_time_ms}ms
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#e6edf3', marginBottom: 6 }}>
                    {log.question}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 20,
                      background: log.confidence_score >= 70 ? '#3fb95022' : 
                                  log.confidence_score >= 40 ? '#d2992222' : '#f8514922',
                      color: log.confidence_score >= 70 ? '#3fb950' : 
                             log.confidence_score >= 40 ? '#d29922' : '#f85149'
                    }}>
                      {log.confidence_label} ({log.confidence_score}%)
                    </span>
                    {log.sources_used.slice(0, 2).map((src, j) => (
                      <span key={j} style={{
                        fontSize: 10, padding: '2px 8px', borderRadius: 20,
                        background: '#6e56cf22', color: '#6e56cf'
                      }}>
                        📄 {src}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AuditDashboard;