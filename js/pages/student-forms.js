// ========================================
// PERSONAL PRO — student Form Pages (v2)
// Pre-workout and Post-workout forms via link
// ========================================
import db from '../db.js';
import { notify } from '../components/toast.js';
import { PAIN_REGIONS, painRegionSelector } from '../utils/alerts.js';

// ======================== PRE-WORKOUT FORM ========================

export async function renderPreForm(studentIdRaw) {
  const [studentId, query] = studentIdRaw.split('?');
  const params = new URLSearchParams(query || '');
  const tId = params.get('t') || '';
  const sName = params.get('n') ? decodeURIComponent(params.get('n')) : '';

  let student = await db.get('students', studentId).catch(() => null);
  if (!student && !sName) return `<div class="student-form-page"><div class="empty-state"><div class="empty-icon" style="font-size:2rem">—</div><h3>Aluno não encontrado</h3></div></div>`;

  const displayName = student ? student.name : sName;
  const displayInitial = displayName ? displayName[0] : '?';

  return `
    <div class="student-form-page">
      <div class="form-card">
        <div class="form-card-header">
          <h1 style="margin:8px 0 4px">Personal<strong class="logo-pro">PRO</strong></h1>
    const student = session ? await db.get('students', session.studentId).catch(()=>null) : null;
    const tId = tIdUrl || (student ? (student.trainerId || student.trainer_id) : null);
    if (tId) {
      bfData.trainerId = tId;
      bfData.trainer_id = tId;
    }

    try {
      if (tId) {
        try {
          const { getSupabase } = await import('../utils/auth.js');
          const sb = getSupabase?.();
          if (sb) {
            await sb.from('biofeedback').insert([bfData]);
          } else throw new Error('no sb');
        } catch {
          await db.add('biofeedback', bfData);
        }
      } else {
        await db.add('biofeedback', bfData);
      }
    } catch(err) {
      console.warn('Erro pós form supabase:', err);
    }

    e.target.classList.add('hidden');
    document.getElementById('postSuccess')?.classList.remove('hidden');
  });
}
