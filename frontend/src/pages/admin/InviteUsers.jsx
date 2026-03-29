import { useState, useEffect } from 'react';
import { Clipboard, MailPlus, Send, ShieldAlert, Trash2, X } from 'lucide-react';
import { invitationAPI } from '../../services/invitationAPI';
import { useAuth } from '../../context/AuthContext';
import './InviteUsers.css';

function InviteUsers() {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    assigned_role: 'student'
  });

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const invites = await invitationAPI.getInvitations();
      setInvitations(invites);
      setError('');
    } catch (err) {
      setError('Failed to load invitations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email) {
      setError('Please enter an email address');
      return;
    }

    try {
      setLoading(true);
      await invitationAPI.sendInvitation({
        email: formData.email.toLowerCase(),
        assigned_role: formData.assigned_role
      });

      // Refresh list
      await fetchInvitations();
      
      // Reset form
      setFormData({ email: '', assigned_role: 'student' });
      setShowForm(false);
      setError('');
      setSuccess(`Invitation sent to ${formData.email}`);
    } catch (err) {
      const errorMsg = typeof err === 'string' ? err : err?.message || 'Failed to send invitation';
      setError(errorMsg);
      setSuccess('');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (invitationId, email) => {
    if (!window.confirm(`Delete invitation for ${email}?`)) {
      return;
    }

    try {
      setLoading(true);
      await invitationAPI.revokeInvitation(invitationId);
      await fetchInvitations();
      setError('');
      setSuccess('Invitation removed successfully');
    } catch (err) {
      const errorMsg = typeof err === 'string' ? err : err?.message || 'Failed to delete invitation';
      console.error('Revoke error:', err);
      setError(`Error: ${errorMsg}`);
      setSuccess('');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'badge-warning',
      accepted: 'badge-success',
      rejected: 'badge-danger'
    };
    return badges[status] || 'badge-secondary';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getRoleColor = (role) => {
    const colors = {
      admin: 'text-danger',
      tenant_admin: 'text-danger',
      teacher: 'text-primary',
      student: 'text-success'
    };
    return colors[role] || 'text-secondary';
  };

  if (!user || (user.role !== 'admin' && user.role !== 'tenant_admin')) {
    return (
      <div className="access-denied">
        <h2>Access Denied</h2>
        <p>Only admins and tenant admins can manage invitations.</p>
      </div>
    );
  }

  const canInviteTenantAdmin = user?.role === 'admin';

  return (
    <div className="invite-users-container">
      <div className="page-header">
        <h1>Manage Users & Invitations</h1>
        <p className="subtitle">Invite new users to join your organization</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="actions-bar">
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
          disabled={loading}
        >
          {showForm ? <><X size={14} /> Cancel</> : <><MailPlus size={14} /> Send Invitation</>}
        </button>
      </div>

      {showForm && (
        <div className="invite-form-card">
          <h3>Send Invitation</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email Address *</label>
              <input
                type="email"
                id="email"
                className="form-control"
                placeholder="teacher@school.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <small className="form-text text-muted">
                User must have this email in their Google account
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="role">Assign Role *</label>
              <select
                id="role"
                className="form-select"
                value={formData.assigned_role}
                onChange={(e) => setFormData({ ...formData, assigned_role: e.target.value })}
              >
                <option value="student">Student (Can take exams)</option>
                <option value="teacher">Teacher (Can create exams)</option>
                {canInviteTenantAdmin && <option value="tenant_admin">Tenant Admin (User management)</option>}
              </select>
              <small className="form-text text-muted">
                Can be changed later from user profile
              </small>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-success" disabled={loading}>
                <Send size={14} /> {loading ? 'Sending...' : 'Send Invitation'}
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setShowForm(false)}
                disabled={loading}
              >
                Cancel
              </button>
            </div>

            <div className="info-box">
              <strong>What happens next:</strong>
              <ul>
                <li>Email is sent to {formData.email || '[email]'} with a magic link</li>
                <li>User clicks the link and logs in with Google</li>
                <li>Account is automatically created with "{formData.assigned_role}" role</li>
                <li>Invitation expires after 30 days if not used</li>
              </ul>
            </div>
          </form>
        </div>
      )}

      <div className="invitations-section">
        <h3>Pending & Sent Invitations</h3>
        
        {loading && !showForm ? (
          <div className="loading">Loading invitations...</div>
        ) : invitations.length === 0 ? (
          <div className="empty-state">
            <p>No invitations sent yet.</p>
            <p>Click "Send Invitation" to invite your first user!</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="invitations-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Invited By</th>
                  <th>Sent Date</th>
                  <th>Expires</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((invite) => (
                  <tr key={invite.invitation_id} className={`status-${invite.status}`}>
                    <td className="email-cell">
                      <strong>{invite.email}</strong>
                    </td>
                    <td>
                      <span className={`role-badge ${getRoleColor(invite.assigned_role)}`}>
                        {invite.assigned_role}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadge(invite.status)}`}>
                        {invite.status}
                      </span>
                    </td>
                    <td>{invite.invited_by_name || 'System'}</td>
                    <td>{formatDate(invite.created_at)}</td>
                    <td className={new Date(invite.expires_at) < new Date() ? 'text-danger' : ''}>
                      {formatDate(invite.expires_at)}
                    </td>
                    <td>
                      {invite.status === 'pending' && (
                        <>
                          <button
                            className="btn-action btn-sm btn-outline-secondary"
                            onClick={() => {
                              const inviteUrl = `${window.location.origin}/accept-invite/${invite.invitation_id}`;
                              navigator.clipboard.writeText(inviteUrl);
                              setSuccess('Invite link copied to clipboard');
                              setError('');
                            }}
                            title="Copy invite link"
                          >
                            <Clipboard size={13} /> Copy Link
                          </button>
                          <button
                            className="btn-action btn-sm btn-outline-danger"
                            onClick={() => handleRevoke(invite.invitation_id, invite.email)}
                            title="Delete pending invitation"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </>
                      )}
                      {invite.status === 'accepted' && (
                        <button
                          className="btn-action btn-sm btn-outline-danger"
                          onClick={() => handleRevoke(invite.invitation_id, invite.email)}
                          title="Delete this accepted invitation"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="help-section">
        <h4>How Invitations Work</h4>
        <ol>
          <li><strong>You send:</strong> Enter user's email and assign a role</li>
          <li><strong>Email sent:</strong> User receives email with a unique magic link</li>
          <li><strong>User accepts:</strong> Clicks link and logs in with Google</li>
          <li><strong>Account created:</strong> User account created with your assigned role</li>
          <li><strong>Access granted:</strong> User can now access your organization</li>
        </ol>
        <p className="warning">
          <ShieldAlert size={14} /> <strong>Important:</strong> The Google email must match the invitation email, or the user will be blocked!
        </p>
      </div>
    </div>
  );
}

export default InviteUsers;
