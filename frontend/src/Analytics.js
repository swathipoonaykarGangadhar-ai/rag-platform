import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://127.0.0.1:8000';

function BarChart({ data, valueKey, labelKey, color }) {
  if (!data || data.length === 0) return (
    <div style={{ color: '#8b949e', fontSize: 12, padding: 12, textAlign: 'center' }}>
      No data yet
    </div>
  );
  const max = Math.max(...data.map(d => d[valueKey]));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {data.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 120, fontSize: 11, color: '#8b949e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {item[labelKey]}
          </div>
          <div style={{ flex: 1, background: '#21262d', borderRadius: 4, height: 20, overflow: 'hidden' }}>
            <div style={{
              width: `${(item[valueKey] / max) * 100}%`,
              height: '100%',
              background: color,
              borderRadius: 4,
              transition: 'width 0.5s ease',
              display: 'flex', alignItems: 'center', paddingLeft: 6
            }}>
              <span style={{ fontSize: 10, color: 'white', fontWeight: 600 }}>{item[valueKey]}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Analytics({ onClose }) {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

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

  const statCards = stats ? [
    { label: 'Total Queries', value: stats.total_queries, color: '#6e56cf', icon: '💬' },
    { label: 'Avg Confidence', value: stats.avg_confidence + '%', color: '#3fb950', icon: '🎯' },
    { label: 'Avg Response', value: stats.avg_response_time + 'ms', color: '#58a6ff', icon: '⚡' },
    { label: 'Unique Users', value: stats.unique_users, color: '#d29922', icon: '👤' },
  ] : [];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0d1117cc',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        background: '#161b22', border: '1px solid #30363d',
        borderRadius: 16, width: '92%', maxWidth: 900,
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
              📈 Usage Analytics
            </h2>
            <p style={{ color: '#8b949e', fontSize: 12, margin: '4px 0 0' }}>
              Platform usage insights and performance metrics
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={fetchData} style={{
              background: '#21262d', border: '1px solid #30363d',
              color: '#8b949e', borderRadius: 8, padding: '6px 14px',
              cursor: 'pointer', fontSize: 12, fontFamily: 'Inter, sans-serif'
            }}>🔄 Refresh</button>
            <button onClick={onClose} style={{
              background: 'none', border: '1px solid #30363d',
              color: '#8b949e', borderRadius: 8, padding: '6px 14px',
              cursor: 'pointer', fontSize: 13, fontFamily: 'Inter, sans-serif'
            }}>Close</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 4, padding: '12px 24px 0',
          borderBottom: '1px solid #30363d'
        }}>
          {['overview', 'documents', 'queries', 'logs'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '8px 16px', border: 'none', borderRadius: '8px 8px 0 0',
              background: activeTab === tab ? '#21262d' : 'transparent',
              color: activeTab === tab ? '#e6edf3' : '#8b949e',
              cursor: 'pointer', fontSize: 13, fontFamily: 'Inter, sans-serif',
              fontWeight: activeTab === tab ? 600 : 400,
              borderBottom: activeTab === tab ? '2px solid #6e56cf' : '2px solid transparent'
            }}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ overflow: 'auto', flex: 1, padding: 24 }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#8b949e', padding: 40 }}>
              Loading analytics...
            </div>
          ) : !stats ? (
            <div style={{ textAlign: 'center', color: '#8b949e', padding: 40 }}>
              No data available yet. Ask some questions first!
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div>
                  {/* Stat Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                    {statCards.map((stat, i) => (
                      <div key={i} style={{
                        background: '#21262d', borderRadius: 10,
                        padding: '16px', border: '1px solid #30363d',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: 24, marginBottom: 6 }}>{stat.icon}</div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: stat.color }}>
                          {stat.value}
                        </div>
                        <div style={{ fontSize: 11, color: '#8b949e', marginTop: 4 }}>
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Confidence Breakdown */}
                  <div style={{
                    background: '#21262d', borderRadius: 10,
                    padding: 16, border: '1px solid #30363d', marginBottom: 16
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                      Confidence Distribution
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[
                        { label: 'High', value: stats.high_confidence, color: '#3fb950' },
                        { label: 'Medium', value: stats.medium_confidence, color: '#d29922' },
                        { label: 'Low', value: stats.low_confidence, color: '#f85149' },
                      ].map((item, i) => (
                        <div key={i} style={{ flex: 1, textAlign: 'center', background: '#161b22', borderRadius: 8, padding: 12 }}>
                          <div style={{ fontSize: 22, fontWeight: 700, color: item.color }}>{item.value}</div>
                          <div style={{ fontSize: 11, color: '#8b949e', marginTop: 4 }}>{item.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Queries by Date */}
                  {stats.queries_by_date.length > 0 && (
                    <div style={{
                      background: '#21262d', borderRadius: 10,
                      padding: 16, border: '1px solid #30363d'
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                        Queries by Date
                      </div>
                      <BarChart
                        data={stats.queries_by_date}
                        valueKey="count"
                        labelKey="date"
                        color="#6e56cf"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Documents Tab */}
              {activeTab === 'documents' && (
                <div style={{
                  background: '#21262d', borderRadius: 10,
                  padding: 16, border: '1px solid #30363d'
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
                    Most Used Documents
                  </div>
                  {stats.top_documents.length === 0 ? (
                    <div style={{ color: '#8b949e', fontSize: 13, textAlign: 'center', padding: 20 }}>
                      No document usage data yet
                    </div>
                  ) : (
                    <BarChart
                      data={stats.top_documents}
                      valueKey="count"
                      labelKey="name"
                      color="#3fb950"
                    />
                  )}
                </div>
              )}

              {/* Queries Tab */}
              {activeTab === 'queries' && (
                <div style={{
                  background: '#21262d', borderRadius: 10,
                  padding: 16, border: '1px solid #30363d'
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
                    Most Asked Questions
                  </div>
                  {stats.top_questions.length === 0 ? (
                    <div style={{ color: '#8b949e', fontSize: 13, textAlign: 'center', padding: 20 }}>
                      No query data yet
                    </div>
                  ) : (
                    <BarChart
                      data={stats.top_questions}
                      valueKey="count"
                      labelKey="question"
                      color="#58a6ff"
                    />
                  )}
                </div>
              )}

              {/* Logs Tab */}
              {activeTab === 'logs' && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                    Recent Activity
                  </div>
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
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Analytics;