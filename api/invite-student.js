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
    const SUPABASE_KEY = process.env.SUPABASE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_KEY) {
      return res.status(500).json({ error: 'Missing Server Configuration' });
    }

    // 1. VALIDAÇÃO DE POSSE E AUTENTICAÇÃO (CRÍTICO)
    // Fazemos uma requisição à tabela de alunos USANDO O JWT DO TREINADOR.
    const checkOwnershipRes = await fetch(`${SUPABASE_URL}/rest/v1/students?id=eq.${studentId}&select=id,auth_user_id,data`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'apikey': SUPABASE_KEY
      }
    });

    if (!checkOwnershipRes.ok) {
      const errorText = await checkOwnershipRes.text();
      console.log('--- DIAGNÓSTICO DE AUTH ---');
      console.log('1. Authorization Header chegou?', !!authHeader);
      console.log('2. Começa com Bearer?', authHeader?.startsWith('Bearer '));
      console.log('3. Status do Supabase:', checkOwnershipRes.status);
      console.log('4. Resposta do Supabase:', errorText);
      console.log('---------------------------');
      
      if (checkOwnershipRes.status === 401 || checkOwnershipRes.status === 403) {
        return res.status(401).json({ error: 'Invalid JWT or unauthorized' });
      }
      return res.status(500).json({ error: 'Erro interno ao consultar banco de dados' });
    }

    const students = await checkOwnershipRes.json();
    if (!students || students.length === 0) {
      return res.status(403).json({ error: 'Forbidden: Student not found or does not belong to you' });
    }

    const student = students[0];
    const inputEmail = email.trim().toLowerCase();

    // Regra 3: Validar que o email do convite bate com a ficha
    if (!student.data?.email || student.data.email.trim().toLowerCase() !== inputEmail) {
      return res.status(403).json({ error: 'O e-mail do convite não corresponde ao e-mail cadastrado na ficha do aluno.' });
    }

    // 2. INVALIDAR TOKENS ANTERIORES PARA ESTE ALUNO (Service Role)
    await fetch(`${SUPABASE_URL}/rest/v1/student_invites?student_id=eq.${studentId}&used=eq.false`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ used: true })
    });

    // 3. GERAR NOVO TOKEN SEGURO COM 48H DE VALIDADE (Service Role)
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/student_invites`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        student_id: studentId,
        email: inputEmail,
        expires_at: expiresAt,
        used: false
      })
    });

    const insertData = await insertRes.json();
    if (!insertRes.ok || !insertData || insertData.length === 0) {
      return res.status(500).json({ error: 'Falha ao gerar token de convite', details: insertData });
    }

    const token = insertData[0].token;

    // Retorna o token para o frontend montar a URL do WhatsApp
    return res.status(200).json({ 
      success: true, 
      token: token, 
      message: 'Invite token generated successfully' 
    });
  } catch (error) {
    console.error('API Error /invite-student:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
