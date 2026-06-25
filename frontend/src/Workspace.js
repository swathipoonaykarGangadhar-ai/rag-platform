import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'https://web-production-38b2d.up.railway.app';

function Workspace({ user, onClose }) {
  const [workspaces, setWorkspaces] = useState([]);
  const [myWorkspace, setMyWorkspace] = useState(null);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceDesc, setNewWorkspaceDesc] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('my');

  const token = localStorage.getItem('rag_token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchWorkspaces();
    fetchMyWorkspace();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const res = await axios.get(`${API}/workspaces`, { headers });
      setWorkspaces(res.data.workspaces);
    } catch {}
  };

  const fetchMyWorkspace = async () => {
    try {
      const res = await axios.get(`${API}/workspaces/my`, { headers });
      setMyWorkspace(res.data);
    } catch {}
  };

  const createWorkspace = async () => {
    if (!newWorkspaceName) return;
    setLoading(true);
    try {
      await axios.post(`${API}/workspaces`, {
        name: newWorkspaceName,
        description: newWorkspaceDesc
      }, { headers });
      setNewWorkspaceName('');
      setNewWorkspaceDesc('');
      fetchWorkspaces();
    } catch {}
    setLoading(false);
  };

  const addMember = async () => {
    if (!newMemberEmail || !myWorkspace) return;
    try {
      await axios.post(
        `${API}/workspaces/${myWorkspace.workspace_id}/members`,
        { email: newMemberEmail, role: 'member' },
        { headers }
      );
      setNewMemberEmail('');
      fetchMyWorkspace();
    } catch {}
  };

  const removeMember = async (email) => {
    if (!myWorkspace) return;
    try {
      await axios.delete(
        `${API}/workspaces/${myWorkspace.workspace_id}/members/${email}`,
        { headers }
      );
      fetchMyWorkspace();
    } catch {}
  };

  const s = {
    overlay: {
      position: 'fixed', inset: 0, background: '#0d1117cc',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, fontFamily: 'Inter, sans-serif'
    },
    modal: {
      background: '#161b22', border: '1px solid #30363d',
      borderRadius: 16, width: '90%', maxWidth: 700,
      maxHeight: '85vh', overflow: 'hidden',
      display: 'flex', flexDirection: 'column'
    },
    header: {
      padding: '20px 24px', borderBottom: '1px solid #30363d',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between'
    },
    title: { color: '#e6edf3', fontSize: 18, fontWeight: 700, margin: 0 },
    subtitle: { color: '#8b949e', fontSize: 12, margin: '4px 0 0' },
    closeBtn: {
      background: 'none', border: '1px solid #30363d',
      color: '#8b949e', borderRadius: 8, padding: '6px 14px',
      cursor: 'pointer', fontSize: 13, fontFamily: 'Inter, sans-serif'
    },
    tabs: {
      display: 'flex', gap: 4, padding: '12px 24px 0',
      borderBottom: '1px solid #30363d'
    },
    tab: (active) => ({
      padding: '8px 16px', border: 'none',
      borderRadius: '8px 8px 0 0',
      background: active ? '#21262d' : 'transparent',
      color: active ? '#e6edf3' : '#8b949e',
      cursor: 'pointer', fontSize: 13,
      fontFamily: 'Inter, sans-serif',
      fontWeight: active ? 600 : 400,
      borderBottom: active ? '2px solid #6e56cf' : '2px solid transparent'
    }),
    body: { overflow: 'auto', flex: 1, padding: 24 },
    input: {
      width: '100%', padding: '10px 12px',
      background: '#21262d', border: '1px solid #30363d',
      borderRadius: 8, color: '#e6edf3', fontSize: 13,
      fontFamily: 'Inter, sans-serif', outline: 'none',
      boxSizing: 'border-box', marginBottom: 8
    },
    btn: {
      padding: '10px 20px', background: '#6e56cf',
      color: 'white', border: 'none', borderRadius: 8,
      cursor: 'pointer', fontSize: 13, fontWeight: 600,
      fontFamily: 'Inter, sans-serif'
    },
    card: {
      background: '#21262d', borderRadius: 10,
      padding: '14px 16px', marginBottom: 10,
      border: '1px solid #30363d'
    },
    memberRow: {
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', padding: '8px 0',
      borderBottom: '1px solid #30363d'
    }
  };

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.header}>
          <div>
            <h2 style={s.title}>🏢 Workspaces</h2>
            <p style={s.subtitle}>Manage team workspaces and members</p>
          </div>
          <button style={s.closeBtn} onClick={onClose}>Close</button>
        </div>

        <div style={s.tabs}>
          {['my', 'all', 'create'].map(tab => (
            <button key={tab} style={s.tab(activeTab === tab)}
              onClick={() => setActiveTab(tab)}>
              {tab === 'my' ? 'My Workspace' : tab === 'all' ? 'All Workspaces' : 'Create New'}
            </button>
          ))}
        </div>

        <div style={s.body}>
          {/* My Workspace Tab */}
          {activeTab === 'my' && (
            <div>
              <div style={s.card}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#e6edf3', marginBottom: 4 }}>
                  Current Workspace
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#6e56cf' }}>
                  {myWorkspace?.workspace_id || 'default'}
                </div>
                <div style={{ fontSize: 12, color: '#8b949e', marginTop: 4 }}>
                  {myWorkspace?.members?.length || 0} members
                </div>
              </div>

              {/* Members */}
              <div style={{ fontSize: 11, fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                Members
              </div>
              {myWorkspace?.members?.map((member, i) => (
                <div key={i} style={s.memberRow}>
                  <div>
                    <div style={{ fontSize: 13, color: '#e6edf3' }}>{member.email}</div>
                    <div style={{ fontSize: 11, color: '#8b949e' }}>{member.role} · Joined {member.joined_at}</div>
                  </div>
                  {user.role === 'admin' && member.email !== user.email && (
                    <button onClick={() => removeMember(member.email)} style={{
                      background: 'none', border: '1px solid #f8514944',
                      color: '#f85149', borderRadius: 6, padding: '4px 10px',
                      cursor: 'pointer', fontSize: 11, fontFamily: 'Inter, sans-serif'
                    }}>Remove</button>
                  )}
                </div>
              ))}

              {/* Add Member */}
              {user.role === 'admin' && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                    Add Member
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      style={{ ...s.input, marginBottom: 0, flex: 1 }}
                      placeholder="Enter email address"
                      value={newMemberEmail}
                      onChange={e => setNewMemberEmail(e.target.value)}
                    />
                    <button style={s.btn} onClick={addMember}>Add</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* All Workspaces Tab */}
          {activeTab === 'all' && (
            <div>
              {workspaces.length === 0 ? (
                <div style={{ color: '#8b949e', textAlign: 'center', padding: 40 }}>
                  No workspaces yet. Create one!
                </div>
              ) : (
                workspaces.map((ws, i) => (
                  <div key={i} style={s.card}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#6e56cf' }}>{ws.name}</div>
                    <div style={{ fontSize: 12, color: '#8b949e', marginTop: 4 }}>{ws.description}</div>
                    <div style={{ fontSize: 11, color: '#484f58', marginTop: 6 }}>
                      Created by {ws.created_by} · {ws.created_at}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Create Workspace Tab */}
          {activeTab === 'create' && (
            <div>
              {user.role !== 'admin' ? (
                <div style={{
                  background: '#f8514922', border: '1px solid #f8514944',
                  borderRadius: 8, padding: 16, color: '#f85149', fontSize: 13
                }}>
                  Only admins can create workspaces.
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                    Workspace Name
                  </div>
                  <input
                    style={s.input}
                    placeholder="e.g. Engineering Team"
                    value={newWorkspaceName}
                    onChange={e => setNewWorkspaceName(e.target.value)}
                  />
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                    Description
                  </div>
                  <input
                    style={s.input}
                    placeholder="What is this workspace for?"
                    value={newWorkspaceDesc}
                    onChange={e => setNewWorkspaceDesc(e.target.value)}
                  />
                  <button
                    style={{ ...s.btn, width: '100%', padding: 12 }}
                    onClick={createWorkspace}
                    disabled={loading}
                  >
                    {loading ? 'Creating...' : 'Create Workspace'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Workspace;