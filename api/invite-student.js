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

    const { studentId, email, guardianEmail } = req.body;
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

    // Regra LGPD: Verificar menor de idade
    let isMinor = false;
    if (student.data.birthDate) {
      const bd = new Date(student.data.birthDate);
      const ageDifMs = Date.now() - bd.getTime();
      const ageDate = new Date(ageDifMs);
      const age = Math.abs(ageDate.getUTCFullYear() - 1970);
      isMinor = age < 18;
    }

    if (isMinor) {
      if (!guardianEmail) {
        return res.status(400).json({ error: 'E-mail do responsável é obrigatório para gerar convite de menores de idade.' });
      }
      const guardianEmailTrimmed = guardianEmail.trim().toLowerCase();
      if (!student.data.guardian?.email || student.data.guardian.email.trim().toLowerCase() !== guardianEmailTrimmed) {
        return res.status(403).json({ error: 'O e-mail do responsável informado diverge do e-mail cadastrado na ficha do aluno.' });
      }
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
    const inviteSentTo = isMinor ? guardianEmail.trim().toLowerCase() : inputEmail;
    
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
        used: false,
        invite_sent_to: inviteSentTo
      })
    });

    const insertData = await insertRes.json();
    if (!insertRes.ok || !insertData || insertData.length === 0) {
      return res.status(500).json({ error: 'Falha ao gerar token de convite', details: insertData });
    }

    const token = insertData[0].token;

    // 4. SE MENOR, ENVIAR EMAIL VIA RESEND DIRETAMENTE (Não devolver o token)
    if (isMinor) {
      const RESEND_API_KEY = process.env.RESEND_API_KEY;
      const RESEND_FROM = process.env.RESEND_FROM || 'onboarding@resend.dev';
      
      if (!RESEND_API_KEY) {
        // Queimar o token recém gerado antes de abortar
        await fetch(`${SUPABASE_URL}/rest/v1/student_invites?token=eq.${token}`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'apikey': SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ used: true })
        });
        return res.status(500).json({ error: 'Erro de configuração: Chave da API do Resend não configurada.' });
      }

      const baseUrl = req.headers.origin || 'https://personal-pro-v3.vercel.app';
      const inviteLink = `${baseUrl}/#/convite?token=${token}`;
      
      const emailBody = {
        from: `Vetor <${RESEND_FROM}>`,
        to: [inviteSentTo],
        subject: 'Convite para acesso ao Vetor (Responsável Legal)',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #0a0e17; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
              <div style="display: inline-block; text-align: center;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                  <tr>
                    <td style="font-size: 24px; font-weight: bold; color: #ffffff; letter-spacing: -0.5px; padding-right: 8px;">Vetor</td>
                    <td><div style="width: 12px; height: 12px; background: #10b981; transform: rotate(45deg); border-radius: 2px; margin-top: 4px;"></div></td>
                  </tr>
                </table>
              </div>
            </div>
            <div style="background: #ffffff; padding: 30px 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
              <h2 style="color: #0a0e17; margin-top: 0;">Olá, Responsável Legal!</h2>
              <p style="color: #333; line-height: 1.5;">O treinador convidou seu menor para utilizar o aplicativo <strong>Vetor</strong>.</p>
              <p style="color: #333; line-height: 1.5;">Para garantir a segurança e a conformidade com a LGPD, o acesso só será liberado mediante sua configuração e consentimento expresso.</p>
              <p style="color: #333; line-height: 1.5;">Por favor, clique no link abaixo para revisar os termos, conceder as permissões legais obrigatórias e definir a senha de acesso da conta do aluno:</p>
              <div style="margin: 30px 0; text-align: center;">
                <a href="${inviteLink}" style="background-color: #10b981; color: #fff; padding: 14px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Configurar Acesso Seguro</a>
              </div>
              <p style="color: #666; font-size: 0.9em; text-align: center; margin-bottom: 0;">Este link é único e expira em 48 horas.</p>
            </div>
          </div>
        `
      };

      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailBody)
      });

      if (!resendRes.ok) {
        const resendErr = await resendRes.text();
        console.error('--- ERRO RESEND ---');
        console.error(resendRes.status, resendErr);
        
        // Excluir ou queimar o token, pois o envio falhou e seria um orfão inútil
        await fetch(`${SUPABASE_URL}/rest/v1/student_invites?token=eq.${token}`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'apikey': SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ used: true })
        });

        return res.status(500).json({ error: 'Falha ao enviar convite ao responsável — verifique se o email é válido ou se o limite foi atingido.' });
      }

      console.log(`[invite-student] Convite enviado via e-mail (Resend) para ${inviteSentTo}`);

      // Retorna sucesso SEM O TOKEN para segurança
      return res.status(200).json({ 
        success: true, 
        viaEmail: true,
        emailTo: inviteSentTo,
        message: 'Convite enviado com segurança para o e-mail do responsável.' 
      });
    }

    // Se adulto, retorna o token para o frontend montar a URL do WhatsApp
    return res.status(200).json({ 
      success: true, 
      token: token, 
      viaEmail: false,
      message: 'Invite token generated successfully' 
    });
  } catch (error) {
    console.error('API Error /invite-student:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
