import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle responses
api.interceptors.response.use(
  (response) => response.data.data || response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

// Invitation APIs
export const invitationAPI = {
  // Admin: Send invitation
  sendInvitation: (data) => api.post('/invitations', data),
  
  // Admin: Get all invitations for tenant
  getInvitations: () => api.get('/invitations'),
  
  // Admin: Revoke invitation
  revokeInvitation: (id) => api.delete(`/invitations/${id}`),
  
  // Public: Get pending invitations for email
  getPendingInvitations: (email) => api.get(`/invitations/pending?email=${email}`),

  // Public: Get invitation details for a specific invite link
  getInvitationDetails: (invitationId) => api.get(`/invitations/${invitationId}/details`),
  
  // Public: Accept invitation via email link
  acceptInvitation: (invitationId, googleTokenOrData) => 
    api.post(`/invitations/${invitationId}/accept`, 
      typeof googleTokenOrData === 'string' 
        ? { googleToken: googleTokenOrData }
        : { googleData: googleTokenOrData }
    )
};
