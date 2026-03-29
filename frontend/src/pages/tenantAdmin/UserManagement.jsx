import { useEffect, useState } from 'react';
import { tenantAPI } from '../../services/api';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteData, setInviteData] = useState({
    name: '',
    email: '',
    role: 'teacher',
    password: ''
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await tenantAPI.listUsers();
      setUsers(response);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    try {
      await tenantAPI.inviteUser(inviteData);
      setInviteData({ name: '', email: '', role: 'teacher', password: '' });
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to invite user');
    }
  };

  const handleRemove = async (userId) => {
    if (!window.confirm('Remove this user?')) return;
    try {
      await tenantAPI.removeUser(userId);
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to remove user');
    }
  };

  if (loading) return <div className="loading">Loading users...</div>;

  return (
    <div className="dashboard-container" style={{ padding: '2rem' }}>
      <h1>User Management</h1>
      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleInvite} className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <h3>Invite User</h3>
        <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
          <input className="form-input" placeholder="Name" value={inviteData.name} onChange={(e) => setInviteData((p) => ({ ...p, name: e.target.value }))} required />
          <input className="form-input" type="email" placeholder="Email" value={inviteData.email} onChange={(e) => setInviteData((p) => ({ ...p, email: e.target.value }))} required />
          <select className="form-select" value={inviteData.role} onChange={(e) => setInviteData((p) => ({ ...p, role: e.target.value }))}>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
          </select>
          <input className="form-input" type="password" placeholder="Optional temp password" value={inviteData.password} onChange={(e) => setInviteData((p) => ({ ...p, password: e.target.value }))} />
        </div>
        <button className="btn btn-primary" style={{ marginTop: '0.75rem' }}>Invite</button>
      </form>

      <div className="card" style={{ padding: '1rem' }}>
        <h3>Users</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.user_id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  {user.role !== 'admin' && user.role !== 'tenant_admin' && (
                    <button className="btn btn-danger btn-sm" onClick={() => handleRemove(user.user_id)}>Remove</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default UserManagement;
