const axios = require('axios');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your_super_secret_jwt_key_change_in_production_12345';

function generateTestToken(userId = 5, role = 'admin') {
  const payload = {
    user_id: userId,
    role,
    tenant_id: 1,
    email: 'abhishekreji2020@gmail.com'
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

async function testRevoke() {
  try {
    const token = generateTestToken();
    
    const response = await axios.delete('http://localhost:3000/api/invitations/6', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✓ Delete successful:', response.data);
  } catch (error) {
    console.error('✗ Delete failed:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
  }
}

testRevoke();
