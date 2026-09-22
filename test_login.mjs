async function testLogin() {
  try {
    const res = await fetch('http://localhost:3001/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@koshkskate.com', password: 'Koshk@12345' })
    })
    const data = await res.json()
    console.log('Status:', res.status)
    console.log('Data:', data)
  } catch (e) {
    console.error('Error:', e)
  }
}
testLogin()
