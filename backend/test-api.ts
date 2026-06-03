import jwt from 'jsonwebtoken';

async function main() {
  const token = jwt.sign({ userId: 1 }, 'super-secret-key', { expiresIn: '1h' });
  
  try {
    const res = await fetch('http://localhost:4000/api/posts/stats', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const text = await res.text();
    console.log('STATUS:', res.status);
    console.log('BODY:', text);
  } catch (err: any) {
    console.error('ERROR:', err);
  }
}
main();
