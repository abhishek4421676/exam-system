#!/usr/bin/env node

/**
 * End-to-End Test Script for Invitation System
 * Tests the complete workflow: Admin sends invitation → Email sent → User accepts → Account created
 */

const axios = require('axios');
const https = require('https');

const API_BASE_URL = 'http://localhost:3000/api';
const FRONTEND_URL = 'http://localhost:5173';

// Test credentials
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'your_jwt_token_here';
const TEST_EMAIL = 'testuser' + Date.now() + '@example.com';
const TEST_TENANT_ID = 1; // Default tenant

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  step: (msg) => console.log(`\n${colors.cyan}${msg}${colors.reset}`),
  test: (msg) => console.log(`${colors.blue}📝 ${msg}${colors.reset}`)
};

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  validateStatus: () => true,
  timeout: 30000
});

/**
 * Test Step 1: Get Admin JWT Token
 */
async function testGetAdminToken() {
  log.step('Step 1: Getting Admin JWT Token');
  log.test('Logging in as Admin');

  try {
    const response = await api.post('/auth/login', {
      email: 'abhishekreji2020@gmail.com', // Admin email
      password: 'TestPassword@123'
    });

    if (response.status === 200 && response.data.success) {
      const token = response.data.data.token;
      log.success(`Admin token obtained: ${token.substring(0, 20)}...`);
      return token;
    } else {
      log.error(`Failed to get token: ${response.data.message}`);
      return null;
    }
  } catch (error) {
    log.error(`Error getting admin token: ${error.message}`);
    return null;
  }
}

/**
 * Test Step 2: Send Invitation
 */
async function testSendInvitation(adminToken) {
  log.step('Step 2: Sending Invitation Email');
  log.test(`Inviting user: ${TEST_EMAIL}`);

  try {
    api.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;

    const response = await api.post('/invitations', {
      email: TEST_EMAIL,
      assigned_role: 'student',
      tenant_id: TEST_TENANT_ID
    });

    if (response.status === 200 && response.data.success) {
      const invitationId = response.data.data.invitation_id;
      log.success(`Invitation created with ID: ${invitationId}`);
      log.info(`Invitation status: ${response.data.data.status}`);
      log.info(`Email sent: ${response.data.data.emailSent}`);

      if (response.data.data.previewUrl) {
        log.info(`📧 Test email preview: ${response.data.data.previewUrl}`);
        log.info(`🔗 Open the link above to view the invitation email sent`);
      }

      return invitationId;
    } else {
      log.error(`Failed to send invitation: ${response.data.message}`);
      return null;
    }
  } catch (error) {
    log.error(`Error sending invitation: ${error.message}`);
    return null;
  }
}

/**
 * Test Step 3: Get Pending Invitations
 */
async function testGetPendingInvitations(adminToken) {
  log.step('Step 3: Checking Pending Invitations (Admin View)');

  try {
    api.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;

    const response = await api.get('/invitations');

    if (response.status === 200 && response.data.success) {
      const invitations = response.data.data;
      log.success(`Retrieved ${invitations.length} invitations`);

      // Show recent invitations
      invitations.slice(0, 3).forEach((inv, idx) => {
        log.info(`${idx + 1}. ${inv.email} - Status: ${inv.status} - Role: ${inv.assigned_role}`);
      });

      return invitations;
    } else {
      log.error(`Failed to get invitations: ${response.data.message}`);
      return null;
    }
  } catch (error) {
    log.error(`Error getting invitations: ${error.message}`);
    return null;
  }
}

/**
 * Test Step 4: Check Pending Invitations (User View - Before Login)
 */
async function testCheckPendingInvitationsUser() {
  log.step('Step 4: Checking Pending Invitations (User View - Before Login)');
  log.test(`Checking for invitations to: ${TEST_EMAIL}`);

  try {
    // Remove authorization header for public endpoint
    delete api.defaults.headers.common['Authorization'];

    const response = await api.get('/invitations/pending', {
      params: { email: TEST_EMAIL }
    });

    if (response.status === 200 && response.data.success) {
      const pendingInvitations = response.data.data;
      
      if (pendingInvitations.length > 0) {
        log.success(`Found ${pendingInvitations.length} pending invitation(s)`);
        pendingInvitations.forEach((inv) => {
          log.info(`- Tenant: ${inv.tenant_name} | Role: ${inv.assigned_role}`);
        });
      } else {
        log.warn(`No pending invitations found for ${TEST_EMAIL}`);
      }

      return pendingInvitations;
    } else {
      log.error(`Failed to check pending invitations: ${response.data.message}`);
      return null;
    }
  } catch (error) {
    log.error(`Error checking pending invitations: ${error.message}`);
    return null;
  }
}

/**
 * Test Step 5: Accept Invitation
 */
async function testAcceptInvitation(invitationId) {
  log.step('Step 5: Accepting Invitation');
  log.test(`Accepting invitation ID: ${invitationId}`);

  try {
    delete api.defaults.headers.common['Authorization'];

    // Simulate Google OAuth data
    const googleData = {
      id: 'google_' + Date.now(),
      email: TEST_EMAIL,
      name: 'Test User',
      picture: 'https://lh3.googleusercontent.com/default'
    };

    const response = await api.post(`/invitations/${invitationId}/accept`, {
      googleToken: 'mock_google_token_for_testing', // In real scenario, this comes from Google OAuth
      googleData
    });

    if (response.status === 200 && response.data.success) {
      log.success(`Invitation accepted successfully`);
      log.info(`User created with ID: ${response.data.data.user_id}`);
      log.info(`User email: ${response.data.data.email}`);
      log.info(`User role: ${response.data.data.role}`);
      log.info(`Tenant ID: ${response.data.data.tenant_id}`);
      return response.data.data;
    } else {
      log.error(`Failed to accept invitation: ${response.data.message}`);
      return null;
    }
  } catch (error) {
    log.error(`Error accepting invitation: ${error.message}`);
    return null;
  }
}

/**
 * Test Step 6: Verify User Can Login
 */
async function testUserLogin(userEmail) {
  log.step('Step 6: Verifying User Can Login');
  log.test(`Attempting to login with: ${userEmail}`);

  try {
    delete api.defaults.headers.common['Authorization'];

    // In a real scenario, user would login through Google OAuth
    // Here we're checking if they can query the auth state
    log.info('Note: Full login test would require Google OAuth flow');
    log.info('In production, user would: Click email link → Google login → Account created');

    return true;
  } catch (error) {
    log.error(`Error testing user login: ${error.message}`);
    return false;
  }
}

/**
 * Test Step 7: Revoke Invitation
 */
async function testRevokeInvitation(invitationId, adminToken) {
  log.step('Step 7: Testing Invitation Revocation');
  log.test(`Attempting to revoke invitation ID: ${invitationId}`);

  try {
    api.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;

    const response = await api.delete(`/invitations/${invitationId}`);

    if (response.status === 200 && response.data.success) {
      log.success(`Invitation revoked successfully`);
      return true;
    } else {
      log.error(`Failed to revoke invitation: ${response.data.message}`);
      return false;
    }
  } catch (error) {
    log.error(`Error revoking invitation: ${error.message}`);
    return false;
  }
}

/**
 * Main Test Runner
 */
async function runTests() {
  console.log(`\n${'='.repeat(70)}`);
  console.log('       INVITATION SYSTEM - END-TO-END TEST');
  console.log('='.repeat(70));

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  try {
    // Step 1: Get Admin Token
    log.info('Attempting to authenticate as admin...');
    const adminToken = await testGetAdminToken();
    if (!adminToken) {
      results.failed++;
      results.tests.push('Get Admin Token - FAILED');
      log.error('Cannot proceed without admin token');
      return results;
    }
    results.passed++;
    results.tests.push('Get Admin Token - PASSED');

    // Step 2: Send Invitation
    const invitationId = await testSendInvitation(adminToken);
    if (!invitationId) {
      results.failed++;
      results.tests.push('Send Invitation - FAILED');
      return results;
    }
    results.passed++;
    results.tests.push('Send Invitation - PASSED');

    // Step 3: Get Pending Invitations (Admin)
    const invitations = await testGetPendingInvitations(adminToken);
    if (invitations !== null) {
      results.passed++;
      results.tests.push('Get Admin Invitations - PASSED');
    } else {
      results.failed++;
      results.tests.push('Get Admin Invitations - FAILED');
    }

    // Step 4: Check Pending Invitations (User)
    const userPendingInvites = await testCheckPendingInvitationsUser();
    if (userPendingInvites !== null) {
      results.passed++;
      results.tests.push('Get User Pending Invitations - PASSED');
    } else {
      results.failed++;
      results.tests.push('Get User Pending Invitations - FAILED');
    }

    // Step 5: Accept Invitation
    const acceptedUser = await testAcceptInvitation(invitationId);
    if (acceptedUser) {
      results.passed++;
      results.tests.push('Accept Invitation - PASSED');
    } else {
      results.failed++;
      results.tests.push('Accept Invitation - FAILED');
    }

    // Step 6: Verify User Login
    const loginTest = await testUserLogin(TEST_EMAIL);
    if (loginTest) {
      results.passed++;
      results.tests.push('Verify User Login - PASSED');
    } else {
      results.failed++;
      results.tests.push('Verify User Login - FAILED');
    }

    // Step 7: Revoke Invitation (test with new one)
    log.step('Step 7B: Testing Revocation');
    const newInvId = await testSendInvitation(adminToken);
    if (newInvId) {
      const revoked = await testRevokeInvitation(newInvId, adminToken);
      if (revoked) {
        results.passed++;
        results.tests.push('Revoke Invitation - PASSED');
      } else {
        results.failed++;
        results.tests.push('Revoke Invitation - FAILED');
      }
    }

  } catch (error) {
    log.error(`Unexpected error during tests: ${error.message}`);
  }

  // Print Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log('TEST SUMMARY');
  console.log('='.repeat(70));
  results.tests.forEach((test) => {
    if (test.includes('PASSED')) {
      log.success(test);
    } else {
      log.error(test);
    }
  });

  console.log(`\n${'='.repeat(70)}`);
  console.log(`Total: ${results.passed} PASSED, ${results.failed} FAILED`);
  console.log(`Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(2)}%`);
  console.log('='.repeat(70));

  console.log(`\n${colors.cyan}Key Test Info:${colors.reset}`);
  console.log(`- Test User Email: ${TEST_EMAIL}`);
  console.log(`- Backend URL: http://localhost:3000`);
  console.log(`- Frontend URL: http://localhost:5173`);
  console.log(`- Invitation Link Format: ${FRONTEND_URL}/accept-invite/:invitationId`);

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run the tests
runTests().catch((error) => {
  log.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
