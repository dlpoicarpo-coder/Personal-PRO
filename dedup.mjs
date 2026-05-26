const supabaseUrl = 'https://vbxedlloesvjpqzunqyv.supabase.co';
const supabaseKey = 'sb_publishable_d4P6mzDj_sSUpFibSGUcdg_2GOsD35E';
const headers = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' };

async function getExercises() {
  const res = await fetch(`${supabaseUrl}/rest/v1/exercises?select=*`, { headers });
  return await res.json();
}

async function deleteExercise(id) {
  await fetch(`${supabaseUrl}/rest/v1/exercises?id=eq.${id}`, { method: 'DELETE', headers });
}

async function addMethod(m) {
  await fetch(`${supabaseUrl}/rest/v1/methods`, { method: 'POST', headers, body: JSON.stringify(m) });
}

async function getMethods() {
  const res = await fetch(`${supabaseUrl}/rest/v1/methods?select=*`, { headers });
  return await res.json();
}

async function run() {
  console.log('Fetching exercises...');
  const exs = await getExercises();
  console.log(`Found ${exs.length} exercises.`);
  const seen = new Map();
  let deleted = 0;
  for (const ex of exs) {
    const name = (ex.name || '').toLowerCase().trim();
    if (!name) continue;
    if (seen.has(name)) {
      const existing = seen.get(name);
      // keep the default one
      if (ex.is_default && !existing.is_default) {
        // delete existing, keep current
        console.log(`Deleting non-default duplicate: ${existing.name} (${existing.id})`);
        await deleteExercise(existing.id);
        seen.set(name, ex);
        deleted++;
      } else if (!ex.is_default && existing.is_default) {
        // delete current
        console.log(`Deleting non-default duplicate: ${ex.name} (${ex.id})`);
        await deleteExercise(ex.id);
        deleted++;
      } else {
        // both are default or both are non-default
        console.log(`Deleting duplicate: ${ex.name} (${ex.id})`);
        await deleteExercise(ex.id);
        deleted++;
      }
    } else {
      seen.set(name, ex);
    }
  }
  console.log(`Deleted ${deleted} duplicate exercises.`);

  const existingMethods = await getMethods();
  if (existingMethods.length === 0) {
    console.log('Restoring default methods...');
    const defaultMethods = [
      { name: 'Drop-set', description: 'Executa até a falha, reduz carga ~20% e continua sem descanso', category: 'Hipertrofia', is_default: true, sets: '3', repsHint: 'Até a falha', restHint: '0s' },
      { name: 'Rest-Pause', description: 'Até a falha, pausa 15-20s, continua até nova falha', category: 'Hipertrofia', is_default: true, sets: '3', repsHint: 'Até a falha', restHint: '15s' },
      { name: 'Cluster', description: '2-3 reps, pausa 10-15s, repetir 5x. Força máxima.', category: 'Força', is_default: true, sets: '5', repsHint: '2-3', restHint: '10-15s' },
      { name: 'Bi-set', description: 'Dois exercícios seguidos sem descanso', category: 'Condicionamento', is_default: true, sets: '3-4', repsHint: '10-15', restHint: '60s' },
      { name: 'Tri-set', description: 'Três exercícios seguidos sem descanso', category: 'Condicionamento', is_default: true, sets: '3-4', repsHint: '10-15', restHint: '60-90s' },
      { name: 'Pirâmide Crescente', description: 'Aumenta a carga e diminui as repetições a cada série', category: 'Hipertrofia', is_default: true, sets: '4', repsHint: '12-10-8-6', restHint: '60-90s' },
      { name: 'FST-7', description: '7 séries do exercício com 30s de descanso no final do treino', category: 'Hipertrofia', is_default: true, sets: '7', repsHint: '10-12', restHint: '30s' },
      { name: 'GVT (10x10)', description: '10 séries de 10 repetições com a mesma carga (60% de 1RM)', category: 'Hipertrofia', is_default: true, sets: '10', repsHint: '10', restHint: '60s' }
    ];
    for (const m of defaultMethods) {
      await addMethod(m);
      console.log(`Added method ${m.name}`);
    }
  } else {
    console.log('Methods already exist.');
  }
}
run().catch(console.error);
