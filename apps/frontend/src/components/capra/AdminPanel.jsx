import { useState, useEffect } from 'react';
const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';
import { getAuthHeaders as getBaseAuthHeaders } from '../../utils/authHeaders.js';


const ROLES = ['user', 'developer', 'manager', 'admin'];

const ROLE_COLORS = {
  user: { bg: '#eff6ff', color: '#3b82f6', border: '#bfdbfe' },
  developer: { bg: '#ecfdf5', color: '#10b981', border: '#a7f3d0' },
  manager: { bg: '#fef9c3', color: '#ca8a04', border: '#fde047' },
  admin: { bg: '#fef2f2', color: '#ef4444', border: '#fecaca' },
};

export default function AdminPanel({ token, onClose }) {
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('pending');

  const getAuthHeaders = () => {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
    // Electron headers removed in unified frontend
    return headers;
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');

      const [usersRes, pendingRes] = await Promise.all([
        fetch(API_URL + '/api/auth/admin/users', { headers: getAuthHeaders() }),
        fetch(API_URL + '/api/auth/admin/pending', { headers: getAuthHeaders() }),
      ]);

      if (!usersRes.ok || !pendingRes.ok) {
        throw new Error('Failed to fetch users');
      }

      const usersData = await usersRes.json();
      const pendingData = await pendingRes.json();

      setUsers(usersData.users || []);
      setPendingUsers(pendingData.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateRoles = async (username, newRoles) => {
    try {
      setError('');
      setSuccess('');

      const response = await fetch(API_URL + `/api/auth/admin/users/${username}/roles`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ roles: newRoles }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update roles');
      }

      setSuccess(`Roles updated for ${username}`);
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (username) => {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');

      const response = await fetch(API_URL + `/api/auth/admin/users/${username}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }

      setSuccess(`User ${username} deleted`);
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleApproveUser = (username) => {
    handleUpdateRoles(username, ['user']);
  };

  const toggleRole = (user, role) => {
    const currentRoles = user.roles || [];
    const newRoles = currentRoles.includes(role)
      ? currentRoles.filter(r => r !== role)
      : [...currentRoles, role];
    handleUpdateRoles(user.username, newRoles);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-lg shadow-xl" style={{ background: '#ffffff', border: '1px solid #e5e5e5' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50" style={{ borderBottom: '1px solid #e5e7eb' }}>
          <h2 className="text-lg font-semibold" style={{ color: '#111827' }}>
            User Management
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded transition-colors hover:bg-gray-100"
            style={{ color: '#6b7280' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 pt-4 gap-2" style={{ borderBottom: '1px solid #e5e5e5' }}>
          <button
            onClick={() => setActiveTab('pending')}
            className="px-4 py-2 text-sm font-medium rounded-t transition-colors"
            style={{
              background: activeTab === 'pending' ? 'transparent' : 'transparent',
              color: activeTab === 'pending' ? '#333333' : '#999999',
              border: activeTab === 'pending' ? '1px dashed #10b981' : '1px solid transparent',
              borderBottom: 'none',
              marginBottom: '-1px',
            }}
          >
            Pending Approval
            {pendingUsers.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full" style={{ background: '#fef9c3', color: '#ca8a04' }}>
                {pendingUsers.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className="px-4 py-2 text-sm font-medium rounded-t transition-colors"
            style={{
              background: activeTab === 'all' ? 'transparent' : 'transparent',
              color: activeTab === 'all' ? '#333333' : '#999999',
              border: activeTab === 'all' ? '1px dashed #10b981' : '1px solid transparent',
              borderBottom: 'none',
              marginBottom: '-1px',
            }}
          >
            All Users ({users.length})
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
            <p className="text-sm" style={{ color: '#dc2626' }}>{error}</p>
          </div>
        )}
        {success && (
          <div className="mx-6 mt-4 p-3 rounded" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
            <p className="text-sm" style={{ color: '#10b981' }}>{success}</p>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]" style={{ background: '#f5f5f5' }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 rounded-full animate-spin" style={{ border: '2px solid #e5e5e5', borderTopColor: '#10b981' }} />
            </div>
          ) : activeTab === 'pending' ? (
            // Pending Users
            pendingUsers.length === 0 ? (
              <div className="text-center py-12" style={{ color: '#999999' }}>
                No pending users
              </div>
            ) : (
              <div className="space-y-3">
                {pendingUsers.map(user => (
                  <div
                    key={user.username}
                    className="flex items-center justify-between p-4 rounded"
                    style={{ background: '#ffffff', border: '1px solid #e5e5e5' }}
                  >
                    <div>
                      <p className="font-medium" style={{ color: '#333333' }}>
                        {user.name}
                      </p>
                      <p className="text-sm" style={{ color: '#666666' }}>
                        @{user.username}
                      </p>
                      <p className="text-xs mt-1" style={{ color: '#999999' }}>
                        Registered: {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApproveUser(user.username)}
                        className="px-4 py-2 text-sm font-medium rounded transition-colors"
                        style={{ background: '#10b981', color: '#ffffff' }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.username)}
                        className="px-4 py-2 text-sm font-medium rounded transition-colors"
                        style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca' }}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            // All Users
            <div className="space-y-3">
              {users.map(user => (
                <div
                  key={user.username}
                  className="p-4 rounded"
                  style={{ background: '#ffffff', border: '1px solid #e5e5e5' }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium" style={{ color: '#333333' }}>
                        {user.name}
                        {user.isEnvUser && (
                          <span className="ml-2 px-2 py-0.5 text-xs rounded" style={{ background: '#fef9c3', color: '#ca8a04' }}>
                            ENV
                          </span>
                        )}
                      </p>
                      <p className="text-sm" style={{ color: '#666666' }}>
                        @{user.username}
                      </p>
                    </div>
                    {!user.isEnvUser && (
                      <button
                        onClick={() => handleDeleteUser(user.username)}
                        className="px-2 py-1 text-xs font-medium rounded transition-colors"
                        style={{ color: '#ef4444' }}
                        title="Delete user"
                      >
                        Delete
                      </button>
                    )}
                  </div>

                  {/* Roles */}
                  <div className="flex flex-wrap gap-2">
                    {ROLES.map(role => {
                      const hasRole = (user.roles || []).includes(role);
                      const roleColor = ROLE_COLORS[role];
                      return (
                        <button
                          key={role}
                          onClick={() => !user.isEnvUser && toggleRole(user, role)}
                          disabled={user.isEnvUser}
                          className="px-3 py-1 text-xs font-medium rounded-full border transition-all"
                          style={{
                            background: hasRole ? roleColor.bg : '#f5f5f5',
                            color: hasRole ? roleColor.color : '#999999',
                            borderColor: hasRole ? roleColor.border : '#e5e5e5',
                            cursor: user.isEnvUser ? 'not-allowed' : 'pointer',
                            opacity: user.isEnvUser ? 0.6 : 1,
                          }}
                        >
                          {role}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
