import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';
import Login from './Login';
import AuditDashboard from './AuditDashboard';
import DocumentComparison from './DocumentComparison';
import Analytics from './Analytics';

const API = 'http://127.0.0.1:8000';

const FILE_ICONS = {
  pdf: '📄', docx: '📝', txt: '📃', csv: '📊',
  json: '🔧', md: '📋', png: '🖼️', jpg: '🖼️',
  jpeg: '🖼️', mp3: '🎵', wav: '🎵', m4a: '🎵'
};

const SAMPLE_QUESTIONS = [
  "What is this document about?",
  "Summarize the key points",
  "What are the main topics covered?",
  "List the important findings"
];

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return <div className={`toast ${type}`}>{message}</div>;
}

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('rag_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState('dark');
  const [toast, setToast] = useState(null);
  const [summaries, setSummaries] = useState({});
  const [expandedDoc, setExpandedDoc] = useState(null);
  const [agentMode, setAgentMode] = useState(false);
  const [agentSteps, setAgentSteps] = useState([]);
  const [showAudit, setShowAudit] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (user) {
      fetchDocuments();
      fetchHistory();
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('rag_token');
    localStorage.removeItem('rag_user');
    setUser(null);
    setMessages([]);
    setDocuments([]);
  };

  const fetchDocuments = async () => {
    try {
      const res = await axios.get(`${API}/documents`);
      setDocuments(res.data.documents);
    } catch {}
  };

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API}/history`);
      const msgs = [];
      res.data.history.forEach(item => {
        msgs.push({ role: 'user', text: item.question, timestamp: item.timestamp });
        msgs.push({ role: 'bot', text: item.answer, sources: item.sources, timestamp: item.timestamp });
      });
      setMessages(msgs);
    } catch {}
  };

  const clearHistory = async () => {
    try {
      await axios.delete(`${API}/history`);
      setMessages([]);
      showToast('Chat history cleared');
    } catch {
      showToast('Failed to clear history', 'error');
    }
  };

  const exportToPDF = async () => {
    if (messages.length === 0) {
      showToast('No messages to export', 'error');
      return;
    }
    try {
      const res = await axios.post(`${API}/export/pdf`, { messages }, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'rag-chat-export.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('Chat exported as PDF!');
    } catch {
      showToast('Export failed. Try again.', 'error');
    }
  };

  const uploadFile = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    try {
      const res = await axios.post(`${API}/upload`, formData);
      showToast('Done - ' + res.data.chunks_stored + ' chunks indexed');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchDocuments();
    } catch {
      showToast('Upload failed. Please try again.', 'error');
    }
    setUploading(false);
  };

  const deleteDocument = async (filename) => {
    try {
      await axios.delete(`${API}/documents/${filename}`);
      fetchDocuments();
      showToast('Document deleted');
    } catch {
      showToast('Failed to delete', 'error');
    }
  };

  const summarizeDocument = async (filename) => {
    setSummaries(prev => ({ ...prev, [filename]: 'loading' }));
    try {
      const res = await axios.post(`${API}/summarize/${encodeURIComponent(filename)}`);
      setSummaries(prev => ({ ...prev, [filename]: res.data.summary }));
    } catch {
      setSummaries(prev => ({ ...prev, [filename]: 'Failed to summarize.' }));
    }
  };

  const askQuestion = async (q) => {
    const text = q || question;
    if (!text.trim() || loading) return;
    setMessages(prev => [...prev, { role: 'user', text }]);
    setQuestion('');
    setLoading(true);
    setAgentSteps([]);
    try {
      const endpoint = agentMode ? `${API}/agent` : `${API}/ask`;
      const token = localStorage.getItem('rag_token');
      const recentHistory = messages.slice(-6).map(m => ({
        role: m.role,
        text: m.text
      }));
      const res = await axios.post(endpoint, {
        question: text,
        chat_history: recentHistory
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(prev => [...prev, {
        role: 'bot',
        text: res.data.answer,
        sources: res.data.sources,
        confidence: res.data.confidence,
        steps: res.data.steps,
        isAgent: agentMode,
        timestamp: new Date().toLocaleTimeString()
      }]);
      if (res.data.steps) setAgentSteps(res.data.steps);
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: 'Something went wrong. Please try again.' }]);
    }
    setLoading(false);
  };

  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      showToast('Voice input not supported. Use Chrome!', 'error');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onstart = () => {
      setIsListening(true);
      showToast('Listening... speak your question');
    };
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      setQuestion(transcript);
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    recognition.onerror = () => {
      setIsListening(false);
      showToast('Voice input error. Try again.', 'error');
    };
    recognition.start();
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    return FILE_ICONS[ext] || '📁';
  };

  const getFileExt = (filename) => filename.split('.').pop().toUpperCase();

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <aside className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-icon">🧠</div>
            <h1>RAG Platform</h1>
          </div>
          <div className="brand-sub">Document Intelligence</div>
        </div>
        <div className="sidebar-body">
          <div>
            <div className="section-label">Upload Document</div>
            <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
              <div className="upload-icon">📂</div>
              <div className="upload-label">
                {file ? file.name : 'Click to choose a file'}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="file-input"
                accept=".pdf,.docx,.txt,.csv,.json,.md,.png,.jpg,.jpeg,.mp3,.wav,.m4a"
                onChange={e => setFile(e.target.files[0])}
              />
            </div>
            {file && (
              <button
                className="upload-btn"
                onClick={uploadFile}
                disabled={uploading}
                style={{ marginTop: 8 }}
              >
                {uploading ? 'Uploading...' : 'Upload ' + file.name}
              </button>
            )}
          </div>
          <div>
            <div className="section-label">Documents ({documents.length})</div>
            <div className="docs-list">
              {documents.length === 0 && (
                <div className="no-docs">No documents yet</div>
              )}
              {documents.map((doc, i) => (
                <div key={i}>
                  <div className="doc-item">
                    <span className="doc-type-icon">{getFileIcon(doc)}</span>
                    <div className="doc-info">
                      <div className="doc-name">{doc}</div>
                      <div className="doc-type">{getFileExt(doc)}</div>
                    </div>
                    <button
                      className="doc-summarize"
                      onClick={() => {
                        setExpandedDoc(expandedDoc === doc ? null : doc);
                        if (!summaries[doc]) summarizeDocument(doc);
                      }}
                      title="Summarize"
                    >✦</button>
                    <button className="doc-delete" onClick={() => deleteDocument(doc)}>✕</button>
                  </div>
                  {expandedDoc === doc && (
                    <div className="doc-summary">
                      {summaries[doc] === 'loading'
                        ? <span className="summary-loading">Summarizing...</span>
                        : summaries[doc] || 'Click to summarize'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="sidebar-footer">
          <button className="footer-btn theme-btn" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
          <button className="footer-btn" onClick={exportToPDF}>
            Export
          </button>
          <button className="footer-btn" onClick={clearHistory}>
            Clear
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <button className="toggle-sidebar-btn" onClick={() => setSidebarOpen(o => !o)}>
            ☰
          </button>
          <span className="topbar-title">Chat</span>
          {messages.length > 0 && (
            <span className="msg-badge">{messages.length} messages</span>
          )}
          <span className="topbar-sub">
            {user.username || user.email} · {documents.length} docs
          </span>
          <button
            onClick={() => setShowAnalytics(true)}
            style={{
              background: 'none', border: '1px solid #30363d',
              color: '#8b949e', borderRadius: 6, padding: '4px 12px',
              cursor: 'pointer', fontSize: 12, fontFamily: 'Inter, sans-serif',
              marginLeft: 8
            }}>
            📈 Analytics
          </button>
          <button
            onClick={() => setShowComparison(true)}
            style={{
              background: 'none', border: '1px solid #30363d',
              color: '#8b949e', borderRadius: 6, padding: '4px 12px',
              cursor: 'pointer', fontSize: 12, fontFamily: 'Inter, sans-serif',
              marginLeft: 8
            }}>
            📊 Compare
          </button>
          <button
            onClick={() => setShowAudit(true)}
            style={{
              background: 'none', border: '1px solid #30363d',
              color: '#8b949e', borderRadius: 6, padding: '4px 12px',
              cursor: 'pointer', fontSize: 12, fontFamily: 'Inter, sans-serif',
              marginLeft: 8
            }}>
            📋 Audit
          </button>
          <button
            onClick={handleLogout}
            style={{
              background: 'none', border: '1px solid #30363d',
              color: '#8b949e', borderRadius: 6, padding: '4px 12px',
              cursor: 'pointer', fontSize: 12, fontFamily: 'Inter, sans-serif',
              marginLeft: 8
            }}>
            Sign Out
          </button>
        </div>

        <div className="messages">
          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🧠</div>
              <div className="empty-title">Ask anything about your documents</div>
              <div className="empty-sub">
                Upload documents on the left, then ask questions.
              </div>
              <div className="empty-chips">
                {SAMPLE_QUESTIONS.map((q, i) => (
                  <div key={i} className="chip" onClick={() => askQuestion(q)}>{q}</div>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={'message ' + msg.role}>
                {msg.timestamp && (
                  <div className="msg-meta">
                    {msg.role === 'user' ? 'You' : 'AI'} · {msg.timestamp}
                  </div>
                )}
                <div className="bubble">
                  {msg.isAgent && msg.steps && (
                    <div className="agent-steps">
                      <div className="agent-steps-title">🤖 Agent Research Steps</div>
                      {msg.steps.map((step, j) => (
                        <div key={j} className="agent-step">
                          <span className="step-icon">
                            {step.step === 'Planning' ? '🗺️' : step.step === 'Searching' ? '🔍' : '🧠'}
                          </span>
                          <span className="step-desc">{step.description}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {msg.confidence && (
                    <div className={'confidence-badge ' + msg.confidence.color}>
                      {msg.confidence.color === 'green' ? '✅' : msg.confidence.color === 'yellow' ? '⚠️' : '🚨'}
                      {' '}{msg.confidence.label} ({msg.confidence.score}%)
                    </div>
                  )}
                  {msg.text}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="sources">
                      <div className="sources-label">Sources</div>
                      {msg.sources.slice(0, 3).map((src, j) => (
                        <div key={j} className="source-item">
                          <div className="source-name">{src.source}</div>
                          <div className="source-preview">{src.preview}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="message bot">
              <div className="bubble loading">
                <div className="dot-anim">
                  <span /><span /><span />
                </div>
                Searching documents...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-area">
          <div className="agent-toggle">
            <button
              className={'agent-btn ' + (agentMode ? 'active' : '')}
              onClick={() => setAgentMode(m => !m)}
            >
              {agentMode ? '🤖 Agent Mode ON' : '💬 Standard Mode'}
            </button>
            {agentMode && (
              <span className="agent-hint">AI will search multiple times for deeper answers</span>
            )}
          </div>
          <div className="input-wrap">
            <textarea
              className="question-input"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  askQuestion();
                }
              }}
              placeholder={agentMode ? "Ask a complex question... Agent will research deeply" : "Ask anything... (Enter to send)"}
              rows={1}
            />
            <button
              className={'mic-btn ' + (isListening ? 'listening' : '')}
              onClick={isListening ? stopVoiceInput : startVoiceInput}
              title={isListening ? 'Stop listening' : 'Voice input'}
            >
              {isListening ? '⏹' : '🎤'}
            </button>
            <button className="ask-btn" onClick={() => askQuestion()} disabled={loading}>
              ➤
            </button>
          </div>
          <div className="input-hint">Enter to send · Shift+Enter for new line · 🎤 for voice</div>
        </div>
      </main>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {showAudit && <AuditDashboard onClose={() => setShowAudit(false)} />}
      {showComparison && (
        <DocumentComparison
          documents={documents}
          onClose={() => setShowComparison(false)}
        />
      )}
      {showAnalytics && <Analytics onClose={() => setShowAnalytics(false)} />}
    </div>
  );
}

export default App;