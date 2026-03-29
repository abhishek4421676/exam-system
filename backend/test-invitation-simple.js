#!/usr/bin/env node

/**
 * Simplified End-to-End Test for Invitation System
 * Using direct API calls with mocked authentication
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');

const API_BASE_URL = 'http://localhost:3000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_in_production_12345';

// Test data
const TEST_EMAIL = 'testuser' + Date.now() + '@example.com';
const TEST_ADMIN_ID = 5; // Known admin user from database
const TEST_TENANT_ID = 1; // Default tenant

// Colors for console output
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
};

const api = axios.create({
  baseURL: API_BASE_URL,
  validateStatus: () => true,
  timeout: 30000
});

/**
 * Generate a valid JWT token for testing
 */
function generateTestToken(userId = TEST_ADMIN_ID, role = 'admin', tenantId = TEST_TENANT_ID) {
  const payload = {
    user_id: userId,
    role,
    tenant_id: tenantId,
    email: 'abhishekreji2020@gmail.com'
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
  return token;
}

/**
 * Test 1: Send Invitation
 */
async function testSendInvitation(adminToken) {
  log.step('📧 Test 1: Sending Invitation Email');
  log.info(`Inviting: ${TEST_EMAIL}`);

  try {
    api.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;

    const response = await api.post('/invitations', {
      email: TEST_EMAIL,
      assigned_role: 'student',
      tenant_id: TEST_TENANT_ID
    });

    if ((response.status === 200 || response.status === 201) && response.data.success) {
      const { invitation_id, emailSent, previewUrl } = response.data.data;
      log.success(`Invitation created (ID: ${invitation_id})`);
      log.info(`Email sent: ${emailSent}`);

      if (previewUrl) {
        log.info(`\n📧 Test Email Preview URL:`);
        log.info(`   ${previewUrl}`);
        log.info(`   👆 Click above to view the invitation email\n`);
      }

      return invitation_id;
    } else {
      log.error(`Failed: ${response.data.message || response.status}`);
      return null;
    }
  } catch (error) {
    log.error(`Exception: ${error.message}`);
    return null;
  }
}

/**
 * Test 2: List Invitations
 */
async function testListInvitations(adminToken) {
  log.step('📋 Test 2: Listing Pending Invitations (Admin View)');

  try {
    api.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;

    const response = await api.get('/invitations');

    if (response.status === 200 && response.data.success) {
      const invitations = response.data.data;
      log.success(`Retrieved ${invitations.length} invitations`);

      const pendingCount = invitations.filter(i => i.status === 'pending').length;
      const acceptedCount = invitations.filter(i => i.status === 'accepted').length;

      log.info(`   Pending: ${pendingCount} | Accepted: ${acceptedCount}`);

      // Show a few recent ones
      invitations.slice(0, 2).forEach((inv) => {
        const status = inv.status === 'pending' ? '⏳' : '✓';
        log.info(`   ${status} ${inv.email} (${inv.assigned_role})`);
      });

      return invitations;
    } else {
      log.error(`Failed: ${response.data.message}`);
      return null;
    }
  } catch (error) {
    log.error(`Exception: ${error.message}`);
    return null;
  }
}

/**
 * Test 3: Check Pending Invitations (Public Endpoint)
 */
async function testCheckPendingInvitations() {
  log.step('🔍 Test 3: Checking Pending Invitations (Public - Before Login)');
  log.info(`Email: ${TEST_EMAIL}`);

  try {
    delete api.defaults.headers.common['Authorization'];

    const response = await api.get('/invitations/pending', {
      params: { email: TEST_EMAIL }
    });

    if (response.status === 200 && response.data.success) {
      const invitations = response.data.data;
      log.success(`Found ${invitations.length} invitation(s)`);

      invitations.forEach((inv) => {
        log.info(`   • Tenant: ${inv.tenant_name} | Role: ${inv.assigned_role}`);
      });

      return invitations;
    } else {
      log.error(`Failed: ${response.data.message}`);
      return null;
    }
  } catch (error) {
    log.error(`Exception: ${error.message}`);
    return null;
  }
}

/**
 * Test 4: Accept Invitation
 */
async function testAcceptInvitation(invitationId) {
  log.step('✅ Test 4: Accepting Invitation');
  log.info(`Invitation ID: ${invitationId}`);
  log.info(`Simulating Google OAuth with email: ${TEST_EMAIL}`);

  try {
    delete api.defaults.headers.common['Authorization'];

    const mockGoogleData = {
      id: 'google_' + Math.random().toString(36).substring(7),
      email: TEST_EMAIL,
      name: 'Test User ' + Date.now(),
      picture: 'https://lh3.googleusercontent.com/a/default-user'
    };

    const response = await api.post(`/invitations/${invitationId}/accept`, {
      googleToken: 'test_token_' + Math.random(),
      googleData: mockGoogleData
    });

    if (response.status === 200 && response.data.success) {
      const { user_id, role, tenant_id } = response.data.data;
      log.success(`Invitation accepted! Account created.`);
      log.info(`   User ID: ${user_id}`);
      log.info(`   Email: ${TEST_EMAIL}`);
      log.info(`   Role: ${role}`);
      log.info(`   Tenant: ${tenant_id}`);
      return { user_id, role, tenant_id };
    } else {
      log.error(`Failed: ${response.data.message}`);
      return null;
    }
  } catch (error) {
    log.error(`Exception: ${error.message}`);
    return null;
  }
}

/**
 * Test 5: Verify Account Not Duplicate
 */
async function testVerifyAcceptanceBlocked(invitationId) {
  log.step('🚫 Test 5: Verify Invitation Can Only Be Used Once');
  log.info(`Attempting to reuse invitation ID: ${invitationId}`);

  try {
    delete api.defaults.headers.common['Authorization'];

    const response = await api.post(`/invitations/${invitationId}/accept`, {
      googleToken: 'test_token_' + Math.random(),
      googleData: {
        id: 'google_' + Math.random(),
        email: TEST_EMAIL,
        name: 'Duplicate User',
        picture: 'https://lh3.googleusercontent.com/a/default'
      }
    });

    if (response.status !== 200 || !response.data.success) {
      log.success(`Correctly rejected duplicate acceptance: ${response.data.message}`);
      return true;
    } else {
      log.error(`Should have rejected duplicate invitation acceptance!`);
      return false;
    }
  } catch (error) {
    log.error(`Exception: ${error.message}`);
    return false;
  }
}

/**
 * Test 6: Revoke Invitation
 */
async function testRevokeInvitation(invitationId, adminToken) {
  log.step('🔓 Test 6: Revoking an Invitation');
  log.info(`Invitation ID: ${invitationId}`);

  try {
    api.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;

    const response = await api.delete(`/invitations/${invitationId}`);

    if (response.status === 200 && response.data.success) {
      log.success(`Invitation revoked successfully`);
      return true;
    } else {
      log.error(`Failed: ${response.data.message}`);
      return false;
    }
  } catch (error) {
    log.error(`Exception: ${error.message}`);
    return false;
  }
}

/**
 * Main Test Execution
 */
async function runTests() {
  console.log(`\n${'='.repeat(75)}`);
  console.log('           🎓 INVITATION SYSTEM - COMPLETE END-TO-END TEST');
  console.log('='.repeat(75));

  const results = {
    passed: [],
    failed: [],
    warnings: []
  };

  // Generate admin token for testing
  log.info('Generating test JWT token for admin user...');
  const adminToken = generateTestToken();
  log.success('Test token generated (ID: user_id=5, role=admin)');

  try {
    // Test 1: Send Invitation
    const invitationId = await testSendInvitation(adminToken);
    if (invitationId) {
      results.passed.push('Send Invitation Email');
    } else {
      results.failed.push('Send Invitation Email');
      return results;
    }

    // Test 2: List Invitations
    const invitations = await testListInvitations(adminToken);
    if (invitations !== null) {
      results.passed.push('List Pending Invitations');
    } else {
      results.failed.push('List Pending Invitations');
    }

    // Test 3: Check Pending (Public)
    const pendingInvites = await testCheckPendingInvitations();
    if (pendingInvites !== null) {
      results.passed.push('Check Pending Invitations (Public)');
    } else {
      results.failed.push('Check Pending Invitations (Public)');
    }

    // Test 4: Accept Invitation
    const acceptedUser = await testAcceptInvitation(invitationId);
    if (acceptedUser) {
      results.passed.push('Accept Invitation & Create Account');
    } else {
      results.failed.push('Accept Invitation & Create Account');
      return results;
    }

    // Test 5: Verify No Duplicate
    const noDuplicate = await testVerifyAcceptanceBlocked(invitationId);
    if (noDuplicate) {
      results.passed.push('Prevent Duplicate Invitation Use');
    } else {
      results.failed.push('Prevent Duplicate Invitation Use');
    }

    // Test 6: Revoke (new invitation)
    const newInvId = await testSendInvitation(adminToken);
    if (newInvId) {
      const revoked = await testRevokeInvitation(newInvId, adminToken);
      if (revoked) {
        results.passed.push('Revoke Pending Invitation');
      } else {
        results.failed.push('Revoke Pending Invitation');
      }
    } else {
      results.warnings.push('Could not test revocation (failed to create invitation)');
    }

  } catch (error) {
    log.error(`Unexpected error: ${error.message}`);
  }

  // Print Results
  console.log(`\n${'='.repeat(75)}`);
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(75));

  if (results.passed.length > 0) {
    console.log(`\n${colors.green}✓ PASSED (${results.passed.length}):${colors.reset}`);
    results.passed.forEach(test => log.info(`  ✓ ${test}`));
  }

  if (results.failed.length > 0) {
    console.log(`\n${colors.red}✗ FAILED (${results.failed.length}):${colors.reset}`);
    results.failed.forEach(test => log.error(`  ✗ ${test}`));
  }

  if (results.warnings.length > 0) {
    console.log(`\n${colors.yellow}⚠ WARNINGS (${results.warnings.length}):${colors.reset}`);
    results.warnings.forEach(test => log.warn(`  ⚠ ${test}`));
  }

  console.log(`\n${'='.repeat(75)}`);
  const total = results.passed.length + results.failed.length;
  const percentage = total > 0 ? ((results.passed.length / total) * 100).toFixed(2) : 0;
  console.log(`📈 Overall: ${results.passed.length}/${total} tests passed (${percentage}%)`);
  console.log('='.repeat(75));

  console.log(`\n${colors.cyan}📌 Test Information:${colors.reset}`);
  console.log(`   Backend URL: http://localhost:3000`);
  console.log(`   Frontend URL: http://localhost:5173`);
  console.log(`   Test Email: ${TEST_EMAIL}`);
  console.log(`   Invitation Link: http://localhost:5173/accept-invite/:invitationId`);

  console.log(`\n${colors.cyan}📝 Important Notes:${colors.reset}`);
  console.log(`   1. This test uses a generated JWT token for authentication`);
  console.log(`   2. The invitation email preview link (marked 📧 above) shows`);
  console.log(`      the actual email content that would be sent to the user`);
  console.log(`   3. In production, users click the email link to accept invitations`);
  console.log(`   4. Email service uses Ethereal (test service) in development`);

  process.exit(results.failed.length > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  log.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
