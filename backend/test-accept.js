const axios = require('axios');

async function testAccept() {
  try {
    const response = await axios.post('http://localhost:3000/api/invitations/8/accept', {
      googleData: {
        id: 'test_google_' + Date.now(),
        email: 'geronimotricks@gmail.com',
        name: 'Test User',
        picture: 'https://example.com/pic.jpg'
      }
    });
    
    console.log('✓ Accept successful:', response.data);
  } catch (error) {
    console.error('✗ Accept failed:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    console.error('Full error:', error);
  }
}

testAccept();
