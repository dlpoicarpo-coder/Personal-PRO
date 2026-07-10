export default async function handler(req, res) {
  // CORS e preflight
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, apikey');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Missing Authorization header. JWT required.' });
    }

    const { studentId, email } = req.body;
    if (!studentId || !email) {
      return res.status(400).json({ error: 'Missing studentId or email' });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || SUPABASE_SERVICE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ error: 'Missing Server Configuration' });
    }

    // 1. VALIDAÇÃO DE POSSE E AUTENTICAÇÃO (CRÍTICO)
    // Fazemos uma requisição à tabela de alunos USANDO O JWT DO TREINADOR.
    const checkOwnershipRes = await fetch(`${SUPABASE_URL}/rest/v1/students?id=eq.${studentId}&select=id,auth_user_id,email`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'apikey': SUPABASE_ANON_KEY
      }
    });

    if (!checkOwnershipRes.ok) {
      return res.status(401).json({ error: 'Invalid JWT or unauthorized' });
    }

    const students = await checkOwnershipRes.json();
    if (!students || students.length === 0) {
      return res.status(403).json({ error: 'Forbidden: Student not found or does not belong to you' });
    }

    const student = students[0];
    const inputEmail = email.trim().toLowerCase();

    // Regra 3: Validar que o email do convite bate com a ficha
    if (!student.email || student.email.trim().toLowerCase() !== inputEmail) {
      return res.status(403).json({ error: 'O e-mail do convite não corresponde ao e-mail cadastrado na ficha do aluno.' });
    }

    let targetUid = student.auth_user_id;
    let shouldLink = false;
    let shouldSendMagicLink = false;

    // 2. CONVIDAR ALUNO (Tratando casos de borda)
    let inviteRes = await fetch(`${SUPABASE_URL}/auth/v1/invite`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: inputEmail })
    });

    let inviteData = await inviteRes.json();

    if (!inviteRes.ok) {
      const errorMsg = inviteData.msg || inviteData.message || '';
      
      if (errorMsg.toLowerCase().includes('already registered')) {
        // Obtém o usuário silenciosamente via Admin API para inspeção
        const generateRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'apikey': SUPABASE_SERVICE_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ type: 'magiclink', email: inputEmail })
        });
        
        const generateData = await generateRes.json();
        if (!generateRes.ok || !generateData.user) {
          return res.status(500).json({ error: 'Failed to retrieve existing user ID', details: generateData });
        }
        
        const existingUser = generateData.user;
        targetUid = existingUser.id;

        // Regra 2: Impedir vínculo com conta de Treinador
        const isTrainer = existingUser.user_metadata?.trainer_name || existingUser.user_metadata?.cref;
        if (isTrainer) {
          return res.status(403).json({ error: 'Este e-mail pertence a um treinador. Não pode ser vinculado como aluno.' });
        }

        // Regra 1: Verificar se este UID já está vinculado a outro aluno
        const linkCheckRes = await fetch(`${SUPABASE_URL}/rest/v1/students?auth_user_id=eq.${targetUid}&select=id`, {
          method: 'GET',
          headers: {
             'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
             'apikey': SUPABASE_SERVICE_KEY
          }
        });
        const linkedStudents = await linkCheckRes.json();

        if (linkedStudents && linkedStudents.length > 0) {
          if (linkedStudents[0].id !== student.id) {
            // Regra 1: Sequestro detectado. O email pertence a outro aluno!
            return res.status(403).json({ error: 'Este e-mail já está vinculado a outro aluno no sistema.' });
          } else {
            // Regra 5: Reenvio legítimo (O aluno já é deste perfil)
            shouldSendMagicLink = true;
            shouldLink = false; 
          }
        } else {
          // Usuário existe no banco, não é treinador e está livre.
          shouldSendMagicLink = true;
          shouldLink = true;
        }

      } else {
        return res.status(400).json({ error: 'Invite failed', details: inviteData });
      }
    } else {
      // Convite disparado com sucesso para usuário novo
      targetUid = inviteData.id || inviteData.user?.id;
      shouldLink = true;
    }

    // 3. ENVIO DE MAGIC LINK (Se for caso de borda legítimo)
    if (shouldSendMagicLink) {
      await fetch(`${SUPABASE_URL}/auth/v1/magiclink`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: inputEmail })
      });
    }

    // 4. VÍNCULO SEGURO E IRREVOGÁVEL
    if (shouldLink && targetUid && targetUid !== student.auth_user_id) {
      await fetch(`${SUPABASE_URL}/rest/v1/students?id=eq.${studentId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ auth_user_id: targetUid })
      });
    }

    return res.status(200).json({ success: true, auth_user_id: targetUid, message: 'Invite processed successfully' });
  } catch (error) {
    console.error('API Error /invite-student:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
