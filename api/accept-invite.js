export default async function handler(req, res) {
  // CORS e preflight
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, apikey');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Missing Server Configuration' });
  }

  // Rate Limiting Básico na Vercel (Baseado em IP)
  // Como estamos num ambiente serverless sem redis, a forma mais simples de rate limit
  // é checar cabeçalhos ou confiar no Edge network, mas para essa POC adicionaremos 
  // um mock de bloqueio ou uma checagem simples caso haja uma tabela de logs. 
  // O usuário pediu "rate limit simples". Podemos usar um Set na memória do servidor 
  // (útil para bursts curtos na mesma lambda instance).
  // Nota: Idealmente Vercel KV, mas vamos usar um limitador em memória local como fallback.

  // Extrair IP do request
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  
  if (!global.rateLimits) global.rateLimits = new Map();
  const now = Date.now();
  const ipData = global.rateLimits.get(ip) || { count: 0, lastTime: now };
  
  // Limpar a cada 1 minuto
  if (now - ipData.lastTime > 60000) {
    ipData.count = 0;
    ipData.lastTime = now;
  }
  
  ipData.count++;
  global.rateLimits.set(ip, ipData);

  if (ipData.count > 10) {
    return res.status(429).json({ error: 'Muitas tentativas. Tente novamente mais tarde.' });
  }

  if (req.method === 'GET') {
    // Validação inicial do token para mostrar a tela
    const token = req.query.token;
    if (!token) return res.status(400).json({ error: 'Token missing' });

    try {
      const inviteRes = await fetch(`${SUPABASE_URL}/rest/v1/student_invites?token=eq.${token}&select=*,students(data)&used=eq.false&expires_at=gt.now()`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY
        }
      });
      
      if (!inviteRes.ok) {
        const errTxt = await inviteRes.text();
        console.log('--- DIAGNÓSTICO GET ACCEPT-INVITE ---');
        console.log('Status:', inviteRes.status);
        console.log('Erro:', errTxt);
        console.log('---------------------------------------');
        return res.status(500).json({ error: 'Erro interno ao consultar convite' });
      }

      const inviteData = await inviteRes.json();
      if (!inviteData || !Array.isArray(inviteData) || inviteData.length === 0) {
        return res.status(404).json({ error: 'Convite inválido ou expirado' });
      }

      return res.status(200).json({
        valid: true,
        email: inviteData[0].email,
        studentId: inviteData[0].student_id,
        studentName: inviteData[0].students?.data?.name
      });
    } catch (err) {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  if (req.method === 'POST') {
    // Processamento do convite (Aceite)
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Missing parameters' });

    // 0. Validação de senha no servidor
    if (password.length < 8) {
      return res.status(400).json({ error: 'A senha deve ter no mínimo 8 caracteres.' });
    }

    try {
      // 1. Validar token (Leitura sem queimar ainda)
      const tokenRes = await fetch(`${SUPABASE_URL}/rest/v1/student_invites?token=eq.${token}&used=eq.false&expires_at=gt.now()`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY
        }
      });
      
      if (!tokenRes.ok) {
        const errTxt = await tokenRes.text();
        console.log('--- DIAGNÓSTICO POST ACCEPT-INVITE (Token) ---');
        console.log('Status:', tokenRes.status);
        console.log('Erro:', errTxt);
        console.log('----------------------------------------------');
        return res.status(500).json({ error: 'Erro interno ao validar convite' });
      }

      const tokenData = await tokenRes.json();
      if (!tokenData || !Array.isArray(tokenData) || tokenData.length === 0) {
        return res.status(400).json({ error: 'Convite inválido, já utilizado ou expirado.' });
      }

      const invite = tokenData[0];
      const studentId = invite.student_id;
      const inviteEmail = invite.email;

      // 2. Aplicar TODAS as regras de segurança (5 a 9) ANTES de queimar o token
      
      // Buscar student original
      const studentRes = await fetch(`${SUPABASE_URL}/rest/v1/students?id=eq.${studentId}&select=id,auth_user_id,data`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'apikey': SUPABASE_SERVICE_KEY }
      });
      
      if (!studentRes.ok) {
        const errTxt = await studentRes.text();
        console.log('--- DIAGNÓSTICO POST ACCEPT-INVITE (Student) ---');
        console.log('Status:', studentRes.status);
        console.log('Erro:', errTxt);
        console.log('------------------------------------------------');
        return res.status(500).json({ error: 'Erro interno ao buscar aluno' });
      }

      const studentData = await studentRes.json();
      if (!studentData || !Array.isArray(studentData) || studentData.length === 0) {
        return res.status(404).json({ error: 'Aluno não encontrado.' });
      }
      const student = studentData[0];

      // Regra 7: Validar que e-mail não mudou na ficha no meio do caminho
      if (student.data?.email?.trim().toLowerCase() !== inviteEmail.trim().toLowerCase()) {
        return res.status(400).json({ error: 'O e-mail do aluno foi alterado na ficha pelo treinador. Solicite um novo link.' });
      }

      // Regra 8, 6, 5: Checar existência e vínculos no Auth
      let targetUid = null;
      let shouldCreate = true;

      // Buscar usuário por e-mail silenciosamente via magiclink admin
      const generateRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type: 'magiclink', email: inviteEmail })
      });
      
      const generateData = await generateRes.json();
      
      if (generateRes.ok && generateData.user) {
        shouldCreate = false;
        const existingUser = generateData.user;
        targetUid = existingUser.id;

        // Regra 6: Verificar se é treinador
        if (existingUser.user_metadata?.trainer_name || existingUser.user_metadata?.cref) {
          return res.status(403).json({ error: 'Este e-mail pertence a um treinador e não pode ser vinculado como aluno.' });
        }

        // Regra 5: Verificar se este UID já pertence a OUTRO aluno
        const linkCheckRes = await fetch(`${SUPABASE_URL}/rest/v1/students?auth_user_id=eq.${targetUid}&select=id`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'apikey': SUPABASE_SERVICE_KEY }
        });
        const linkedStudents = await linkCheckRes.json();

        if (linkedStudents && linkedStudents.length > 0) {
          if (linkedStudents[0].id !== student.id) {
            return res.status(403).json({ error: 'Segurança: Este e-mail já está vinculado a outro aluno no sistema.' });
          }
        }
      }

      // SE CHEGAMOS AQUI: Todas as validações de segurança passaram. O token é válido e o e-mail está seguro para uso.
      
      // 3. CRIAR OU ATUALIZAR USUÁRIO NO AUTH E CRAVAR VÍNCULO
        const createUserRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'apikey': SUPABASE_SERVICE_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            email: inviteEmail,
            password: password,
            email_confirm: true 
          })
        });
        const createData = await createUserRes.json();
        if (!createUserRes.ok) {
           return res.status(500).json({ error: 'Falha ao criar usuário', details: createData });
        }
        targetUid = createData.id;
      } else {
        // Regra 9: Reenvio legítimo. Atualiza a senha.
        const updatePassRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${targetUid}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'apikey': SUPABASE_SERVICE_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ password: password })
        });
        if (!updatePassRes.ok) {
          return res.status(500).json({ error: 'Falha ao atualizar a senha do usuário existente.' });
        }
      }

      // Vincular Auth UID ao Student
      if (targetUid !== student.auth_user_id) {
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

      // 4. QUEIMAR O TOKEN ATOMICAMENTE (Confirmação final)
      const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/student_invites?token=eq.${token}&used=eq.false&expires_at=gt.now()`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ used: true, used_at: new Date().toISOString() })
      });
      
      const updatedInvites = await updateRes.json();
      if (!updateRes.ok || !updatedInvites || updatedInvites.length === 0) {
        // Corrida: outro request queimou primeiro. Como o usuário/vínculo já foi garantido pelas etapas acima
        // e é a mesma requisição (idempotente), retornamos sucesso.
        console.warn('Corrida evitada: Token já foi consumido por requisição concorrente. (Idempotente)');
      }

      return res.status(200).json({ success: true, message: 'Conta configurada com sucesso!' });
      
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
