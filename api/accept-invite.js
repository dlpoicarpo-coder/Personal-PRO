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
      const inviteRes = await fetch(`${SUPABASE_URL}/rest/v1/student_invites?token=eq.${token}&select=*,students(name)&used=eq.false&expires_at=gt.now()`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY
        }
      });
      const inviteData = await inviteRes.json();
      if (!inviteData || inviteData.length === 0) {
        return res.status(404).json({ error: 'Convite inválido ou expirado' });
      }

      return res.status(200).json({
        valid: true,
        email: inviteData[0].email,
        studentId: inviteData[0].student_id,
        studentName: inviteData[0].students?.name
      });
    } catch (err) {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  if (req.method === 'POST') {
    // Processamento do convite (Aceite)
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Missing parameters' });

    try {
      // 1. Validar e consumir token numa transação atômica simulada
      // Tentar marcar como usado imediatamente se as condições baterem
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
        return res.status(400).json({ error: 'Convite inválido, já utilizado ou expirado.' });
      }

      const invite = updatedInvites[0];
      const studentId = invite.student_id;
      const inviteEmail = invite.email;

      // 2. Aplicar regras de segurança (5 a 9)
      
      // Buscar student original
      const studentRes = await fetch(`${SUPABASE_URL}/rest/v1/students?id=eq.${studentId}&select=*`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'apikey': SUPABASE_SERVICE_KEY }
      });
      const studentData = await studentRes.json();
      const student = studentData[0];

      // Regra 7: Validar que e-mail não mudou na ficha no meio do caminho
      if (student.email?.trim().toLowerCase() !== inviteEmail.trim().toLowerCase()) {
        return res.status(400).json({ error: 'O e-mail do aluno foi alterado na ficha pelo treinador. Solicite um novo link.' });
      }

      // Regra 8: Procurar o usuário por email pela Admin API de forma explícita
      // O endpoint de Admin API para buscar usuário por email exige usar query params?
      // O Supabase não suporta list Users por email no Admin API diretamente de forma fácil por REST sem postgrest auth.users
      // MAS, como estamos no Service Role, podemos chamar gerar_link e inspecionar se existe,
      // OU ainda melhor, no auth/v1/invite.
      // Se tentarmos criar o usuário:
      let targetUid = null;

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

      if (createUserRes.ok) {
        // Sucesso: Criou usuário novo!
        targetUid = createData.id;
      } else {
        // Falhou: Email já existe (já que o POST cria).
        if (createData.msg?.includes('already been registered') || createData.message?.includes('already been registered')) {
          
          // Se já existe, buscamos os dados dele
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
          if (!generateData.user) {
             return res.status(500).json({ error: 'Usuário já existe, mas falha ao buscar seus detalhes.' });
          }
          
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

          // Regra 9: O UID está livre ou já pertence a ESTE aluno. Podemos atualizar a senha.
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

        } else {
          return res.status(400).json({ error: 'Erro ao criar conta', details: createData });
        }
      }

      // 3. Vincular Auth UID ao Student
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

      return res.status(200).json({ success: true, message: 'Conta configurada com sucesso!' });
      
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
