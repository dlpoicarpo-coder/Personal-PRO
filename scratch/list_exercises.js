const SUPABASE_URL = 'https://vbxedlloesvjpqzunqyv.supabase.co';
const SUPABASE_ANON = 'sb_publishable_d4P6mzDj_sSUpFibSGUcdg_2GOsD35E';

async function listExercises() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/exercises?select=id,name,muscleGroup,is_default`, {
      method: 'GET',
      headers: {
        'apikey':        SUPABASE_ANON,
        'Authorization': `Bearer ${SUPABASE_ANON}`,
        'Content-Type':  'application/json',
      },
    });
    console.log('Status:', res.status);
    if (res.status === 200) {
      const data = await res.json();
      console.log('JSON_START');
      console.log(JSON.stringify(data, null, 2));
      console.log('JSON_END');
    } else {
      console.log('Response:', await res.text());
    }
  } catch(e) {
    console.error('Fetch error:', e);
  }
}

listExercises();
