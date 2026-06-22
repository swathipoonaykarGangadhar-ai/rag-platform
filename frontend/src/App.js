import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API = 'http://127.0.0.1:8000';

function App() {
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await axios.get(`${API}/documents`);
      setDocuments(res.data.documents);
    } catch (err) {
      console.error('Failed to fetch documents');
    }
  };

  const uploadFile = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setUploadStatus('Uploading...');
    try {
      const res = await axios.post(`${API}/upload`, formData);
      setUploadStatus(`Done! ${res.data.chunks_stored} chunks stored`);
      fetchDocuments();
    } catch (err) {
      setUploadStatus('Upload failed. Try again.');
    }
  };

  const deleteDocument = async (filename) => {
    try {
      await axios.delete(`${API}/documents/${filename}`);
      fetchDocuments();
    } catch (err) {
      console.error('Failed to delete document');
    }
  };

  const askQuestion = async () => {
    if (!question.trim()) return;
    const userMsg = { role: 'user', text: question };
    setMessages(prev => [...prev, userMsg]);
    setQuestion('');
    setLoading(true);
    try {
      const res = await axios.post(`${API}/ask`, { question });
      const botMsg = { 
        role: 'bot', 
        text: res.data.answer, 
        sources: res.data.sources 
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', text: 'Error getting answer. Try again.' }]);
    }
    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') askQuestion();
  };

  return (
    <div className="app">
      <div className="sidebar">
        <h1>RAG Platform</h1>
        <p className="subtitle">Document Intelligence</p>

        <div className="upload-section">
          <p className="section-label">Upload Document</p>
          <input
            type="file"
            accept=".pdf,.docx,.txt,.csv,.json,.md,.png,.jpg,.jpeg,.mp3,.wav,.m4a"
            onChange={e => setFile(e.target.files[0])}
            className="file-input"
          />
          <button onClick={uploadFile} className="upload-btn">
            Upload
          </button>
          {uploadStatus && <p className="upload-status">{uploadStatus}</p>}
        </div>

        <div className="docs-section">
          <p className="section-label">Documents ({documents.length})</p>
          {documents.length === 0 && (
            <p className="no-docs">No documents yet</p>
          )}
          {documents.map((doc, i) => (
            <div key={i} className="doc-item">
              <span className="doc-icon">📄</span>
              <span className="doc-name">{doc}</span>
              <button 
                className="delete-btn"
                onClick={() => deleteDocument(doc)}
              >×</button>
            </div>
          ))}
        </div>
      </div>

      <div className="chat-area">
        <div className="messages">
          {messages.length === 0 && (
            <div className="empty-state">
              <p>Upload documents and ask anything about them!</p>
              <p className="empty-sub">AI will search across all your documents</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.role}`}>
              <div className="bubble">
                {msg.text}
                {msg.sources && (
                  <div className="sources">
                    <p className="sources-label">📄 Sources:</p>
                    {msg.sources.map((src, j) => (
                      <div key={j} className="source-item">
                        <span className="source-name">{src.source}</span>
                        <p className="source-preview">{src.preview}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="message bot">
              <div className="bubble loading">Thinking...</div>
            </div>
          )}
        </div>

        <div className="input-area">
          <input
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask anything across all your documents..."
            className="question-input"
          />
          <button onClick={askQuestion} className="ask-btn">Ask</button>
        </div>
      </div>
    </div>
  );
}

export default App;