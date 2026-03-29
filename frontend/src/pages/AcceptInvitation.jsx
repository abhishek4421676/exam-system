import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from "../context/AuthContext";
import { invitationAPI } from "../services/invitationAPI";
import { useGoogleLogin } from '@react-oauth/google';
import { CheckCircle2, XCircle } from 'lucide-react';
import './AcceptInvitation.css';

function AcceptInvitation() {
  const { invitationId } = useParams();
  const navigate = useNavigate();
  const { googleLogin } = useAuth();
  
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stage, setStage] = useState('loading'); // loading, show, accepting, success, error
  const [userEmail, setUserEmail] = useState('');

  const getRedirectPathForRole = (role) => {
    if (role === 'admin') return '/admin';
    if (role === 'tenant_admin') return '/tenant-admin/users';
    if (role === 'teacher') return '/teacher';
    return '/student';
  };

  useEffect(() => {
    if (!invitationId) {
      setError('Invalid invitation link');
      setStage('error');
      setLoading(false);
      return;
    }

    fetchInvitationById(invitationId);
  }, [invitationId]);

  const fetchInvitationById = async (id) => {
    try {
      const details = await invitationAPI.getInvitationDetails(id);
      setInvitation(details);
      setUserEmail(details.email || '');
      setStage('show');
    } catch (err) {
      console.error('Failed to fetch invitation details:', err);
      const errorMessage = err?.message || 'Invitation not found or already used';
      setError(errorMessage);
      setStage('error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingInvitations = async (email) => {
    try {
      const invites = await invitationAPI.getPendingInvitations(email);
      const matching = invites.find(inv => inv.invitation_id == invitationId);
      
      if (matching) {
        setInvitation(matching);
        setUserEmail(email);
        setStage('show');
      } else {
        setError('No pending invitation found for this email. Please use the email address that received the invite.');
        setStage('show');
      }
    } catch (err) {
      console.error('Failed to fetch invitations:', err);
      // If error, still show the page - user can login via Google
      setStage('show');
      setError('Could not check invitations right now. You can still continue with Google sign-in.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (codeResponse) => {
      try {
        setStage('accepting');
        setError('');

        // Get the access token from the response
        const accessToken = codeResponse.access_token;

        // Fetch user info from Google using the access token
        const googleUserResponse = await fetch(
          'https://www.googleapis.com/oauth2/v1/userinfo?alt=json',
          {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        );

        if (!googleUserResponse.ok) {
          throw new Error('Failed to get Google user info');
        }

        const googleUserData = await googleUserResponse.json();

        // Accept invitation with Google user data
        const result = await invitationAPI.acceptInvitation(invitationId, {
          id: googleUserData.id,
          email: googleUserData.email,
          name: googleUserData.name,
          picture: googleUserData.picture
        });

        // The acceptance API now returns { user_id, email, role, tenant_id, token }
        const userData = {
          user_id: result.user_id,
          email: result.email,
          role: result.role,
          name: result.name || googleUserData.name,
          tenant_id: result.tenant_id
        };
        
        // Store user info and JWT token
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', result.token);

        setStage('success');
        
        // Redirect to dashboard after short delay
        setTimeout(() => {
          navigate(getRedirectPathForRole(result.role));
        }, 2000);

      } catch (err) {
        const errorMessage = typeof err === 'string' 
          ? err 
          : err?.message || 'Failed to accept invitation';
        
        setError(errorMessage);
        setStage('error');
        console.error('Acceptance error:', err);
      }
    },
    onError: (error) => {
      console.error('Google login error:', error);
      setError('Google login failed. Please try again.');
      setStage('error');
    },
    flow: 'implicit'
  });

  if (stage === 'loading') {
    return (
      <div className="accept-invitation-container loading-state">
        <div className="spinner"></div>
        <p>Loading invitation details...</p>
      </div>
    );
  }

  if (stage === 'success') {
    return (
      <div className="accept-invitation-container success-state">
        <div className="success-card">
          <div className="success-icon"><CheckCircle2 size={30} /></div>
          <h2>Invitation Accepted!</h2>
          <p>Your account has been created successfully.</p>
          <p className="redirect-text">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  if (stage === 'error' || error) {
    return (
      <div className="accept-invitation-container error-state">
        <div className="error-card">
          <div className="error-icon"><XCircle size={30} /></div>
          <h2>Invitation Error</h2>
          <p className="error-message">{error}</p>
          
          <div className="error-actions">
            <p>Please contact your administrator for a new invitation.</p>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/login')}
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="accept-invitation-container">
      <div className="invitation-card">
        <div className="card-header">
          <h1>Accept Invitation</h1>
        </div>

        <div className="card-body">
          {invitation ? (
            <div className="invitation-details">
              <div className="detail-box">
                <p className="label">Invited to join:</p>
                <h3 className="tenant-name">
                  {invitation.tenant_name || 'Organization'}
                </h3>
              </div>

              <div className="detail-box">
                <p className="label">Your role:</p>
                <p className={`role-display role-${invitation.assigned_role}`}>
                  {invitation.assigned_role.charAt(0).toUpperCase() + invitation.assigned_role.slice(1)}
                  {invitation.assigned_role === 'admin' && ' - Full access'}
                  {invitation.assigned_role === 'tenant_admin' && ' - User management'}
                  {invitation.assigned_role === 'teacher' && ' - Can create exams'}
                  {invitation.assigned_role === 'student' && ' - Can take exams'}
                </p>
              </div>

              <div className="detail-box">
                <p className="label">Invited by:</p>
                <p className="invited-by">
                  {invitation.invited_by_name || 'Administrator'}
                </p>
              </div>

              <div className="action-section">
                <p className="instruction">
                  Click below to accept this invitation with your Google account:
                </p>

                {stage === 'accepting' ? (
                  <div className="accepting-state">
                    <div className="spinner-small"></div>
                    <p>Setting up your account...</p>
                  </div>
                ) : (
                  <button 
                    className="btn btn-lg btn-google"
                    onClick={() => handleGoogleLogin()}
                  >
                    <span className="google-icon">🔵</span>
                    Accept with Google
                  </button>
                )}

                <p className="note">
                  Make sure you use the same Google account as the email: <strong>{invitation.email}</strong>
                </p>
              </div>
            </div>
          ) : (
            <div className="no-invitation">
              <p className="label">No invitation found for this link.</p>
              
              <div className="email-entry-form">
                <p>Do you have an invitation?</p>
                <p className="instruction">
                  If you have a pending invitation from your administrator, you can check here:
                </p>

                <input
                  type="email"
                  className="form-control"
                  placeholder="Enter your email address"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                />

                <button
                  className="btn btn-primary"
                  onClick={() => {
                    if (userEmail) {
                      fetchPendingInvitations(userEmail);
                    }
                  }}
                >
                  Check for Invitations
                </button>
              </div>

              <div className="divider">OR</div>

              <div className="google-login-section">
                <p>Sign in with Google and check your pending invitations:</p>
                <button 
                  className="btn btn-lg btn-google"
                  onClick={() => handleGoogleLogin()}
                >
                  <span className="google-icon">🔵</span>
                  Login with Google
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="card-footer">
          <p className="help-text">
            Questions? Contact your organization administrator for assistance.
          </p>
        </div>
      </div>

      <div className="info-section">
        <h4>How This Works</h4>
        <ol>
          <li>You click the link in the invitation email</li>
          <li>You see the details of the invitation</li>
          <li>You click "Accept with Google"</li>
          <li>Your account is automatically created</li>
          <li>You're granted access to the organization</li>
        </ol>
      </div>
    </div>
  );
}

export default AcceptInvitation;
