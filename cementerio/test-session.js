const { getSession } = require('@/lib/sesion/sesion');

async function testSession() {
  try {
    const session = await getSession();
    console.log('Session:', session);
  } catch (error) {
    console.error('Error getting session:', error.message);
  }
}

testSession();
