import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

const API = 'http://127.0.0.1:8000';

function App() {
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const uploadFile = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setUploadStatus('Uploading...');
    try {
      const res = await axios.post(`${API}/upload`, formData);
      setUploadStatus(`Done! ${res.data.chunks_stored} chunks stored from ${file.name}`);
    } catch (err) {
      setUploadStatus('Upload failed. Try again.');
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
      const botMsg = { role: 'bot', text: res.data.answer };
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
            accept=".pdf,.docx"
            onChange={e => setFile(e.target.files[0])}
            className="file-input"
          />
          <button onClick={uploadFile} className="upload-btn">
            Upload
          </button>
          {uploadStatus && <p className="upload-status">{uploadStatus}</p>}
        </div>
      </div>

      <div className="chat-area">
        <div className="messages">
          {messages.length === 0 && (
            <div className="empty-state">
              <p>Upload a document and ask anything about it!</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.role}`}>
              <div className="bubble">{msg.text}</div>
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
            placeholder="Ask a question about your document..."
            className="question-input"
          />
          <button onClick={askQuestion} className="ask-btn">Ask</button>
        </div>
      </div>
    </div>
  );
}

export default App;