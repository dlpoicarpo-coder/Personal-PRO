const fetch = require('node-fetch'); // wait, is node-fetch available? Or we can use global fetch if node is >= 18.
// Let's use native fetch, which is available in modern Node.js versions.

const SUPABASE_URL = 'https://vbxedlloesvjpqzunqyv.supabase.co';
const SUPABASE_ANON = 'sb_publishable_d4P6mzDj_sSUpFibSGUcdg_2GOsD35E';

async function testPost() {
  const table = 'biofeedback';
  const row = {
    id: 'test_bf_' + Date.now(),
    trainer_id: null,
    data: { test: true },
    studentId: '24cca414-a515-4f41-b8fa-2bf6220788fd',
    sleep: 7,
  };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'apikey':        SUPABASE_ANON,
        'Authorization': `Bearer ${SUPABASE_ANON}`,
        'Content-Type':  'application/json',
        'Prefer':        'return=representation',
      },
      body: JSON.stringify(row),
    });
    console.log('Status:', res.status);
    console.log('Response:', await res.text());
  } catch(e) {
    console.error('Fetch error:', e);
  }
}

testPost();
