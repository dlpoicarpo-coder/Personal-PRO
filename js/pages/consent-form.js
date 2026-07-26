// ========================================
// VETOR — Parental Consent Form Page (LGPD Art. 14)
// Public form for Guardian Authorization (100% Standalone Form)
// ========================================
import { SUPABASE_URL, SUPABASE_KEY } from '../utils/config.js';

// TEXTO PENDENTE DE REVISÃO POR ADVOGADO — não usar em produção sem validar

const CONSENT_CSS = `
.consent-page {
  min-height: 100vh;
  background: var(--bg-main, #0f172a);
  color: var(--text-primary, #f8fafc);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px 16px;
  font-family: system-ui, -apple-system, sans-serif;
}
.consent-card {
  background: var(--bg-card, #1e293b);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  max-width: 620px;
  width: 100%;
  padding: 28px 24px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
}
.consent-header {
  text-align: center;
  margin-bottom: 24px;
}
.consent-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 6px;
}
.consent-subtitle {
  font-size: 0.85rem;
  color: var(--text-muted, #94a3b8);
}
.consent-termo-box {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 16px 18px;
  margin-bottom: 20px;
  font-size: 0.85rem;
  line-height: 1.6;
  color: #cbd5e1;
  max-height: 240px;
  overflow-y: auto;
  white-space: pre-line;
}
.consent-form-group {
  margin-bottom: 16px;
}
.consent-label {
  display: block;
  font-size: 0.82rem;
  font-weight: 600;
  color: #94a3b8;
  margin-bottom: 6px;
}
.consent-input {
  width: 100%;
  padding: 10px 14px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: #fff;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}
.consent-input:focus {
  border-color: #6366f1;
}
.consent-checkbox-group {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 20px 0;
}
.consent-checkbox {
  width: 20px;
  height: 20px;
  accent-color: #10b981;
  cursor: pointer;
  margin-top: 2px;
  flex-shrink: 0;
}
.consent-submit-btn {
  width: 100%;
  padding: 12px 18px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s;
}
.consent-submit-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
`;

export async function renderConsentForm() {
  return `
    <style>${CONSENT_CSS}</style>
    <div class="consent-page">
      <div class="consent-card" id="consentCard">
        <div class="consent-header">
          <div class="consent-title">Termo de Consentimento Parental</div>
          <div class="consent-subtitle">Conformidade LGPD (Art. 14, §1º da Lei 13.709/2018)</div>
        </div>

        <form id="consentForm">
          <div style="font-size:0.85rem;font-weight:700;color:#f8fafc;margin-bottom:12px">1. Identificação das Partes</div>
          
          <div class="consent-form-group">
            <label class="consent-label">Nome do Aluno (Menor de Idade) *</label>
            <input class="consent-input" id="studentName" name="studentName" required placeholder="Nome Completo do Aluno" />
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="consent-form-group">
              <label class="consent-label">Nome do Responsável Legal *</label>
              <input class="consent-input" id="guardianName" name="guardianName" required placeholder="Nome Completo do Responsável" />
            </div>
            <div class="consent-form-group">
              <label class="consent-label">CPF do Responsável *</label>
              <input class="consent-input" id="guardianCpf" name="guardianCpf" required placeholder="000.000.000-00" />
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="consent-form-group">
              <label class="consent-label">E-mail do Responsável *</label>
              <input class="consent-input" id="guardianEmail" name="guardianEmail" type="email" required placeholder="email@responsavel.com" />
            </div>
            <div class="consent-form-group">
              <label class="consent-label">Parentesco *</label>
              <input class="consent-input" id="guardianRelationship" name="guardianRelationship" required placeholder="Ex: Mãe, Pai, Tutor" />
            </div>
          </div>

          <div style="font-size:0.85rem;font-weight:700;color:#f8fafc;margin:18px 0 8px">2. Termo de Autorização</div>

          <div class="consent-termo-box" id="termoText">
TERMO DE CONSENTIMENTO PARA TRATAMENTO DE DADOS DE MENOR DE IDADE

Eu, <strong id="termoGuardianName">[nome do responsável]</strong>, portador(a) do CPF <strong id="termoGuardianCpf">[cpf]</strong>, na qualidade de responsável legal por <strong id="termoStudentName">[nome do aluno]</strong>, DECLARO estar ciente e AUTORIZAR o tratamento de dados pessoais e de saúde do menor acima identificado pelo profissional responsável, nos termos do art. 14, §1º da Lei Geral de Proteção de Dados (Lei 13.709/2018), para as finalidades de: avaliação física, prescrição e acompanhamento de treinos, monitoramento de biofeedback e dados de desempenho esportivo.

Este consentimento pode ser revogado a qualquer momento mediante solicitação ao profissional responsável.
          </div>

          <div class="consent-checkbox-group">
            <input type="checkbox" class="consent-checkbox" id="acceptCheckbox" required />
            <label for="acceptCheckbox" style="font-size:0.85rem;color:#f1f5f9;cursor:pointer;line-height:1.4">
              Li e autorizo o tratamento de dados conforme os termos acima expressos. *
            </label>
          </div>

          <div class="consent-form-group">
            <label class="consent-label">Assinatura Eletrônica (Digite seu Nome Completo) *</label>
            <input class="consent-input" id="typedSignature" name="typedSignature" required placeholder="Digite exatamente seu nome para assinar" />
          </div>

          <button type="submit" id="submitConsentBtn" class="consent-submit-btn" disabled>
            Confirmar Consentimento
          </button>
        </form>

        <div id="consentSuccess" style="display:none;text-align:center;padding:30px 10px">
          <div style="width:56px;height:56px;border-radius:50%;background:rgba(16,185,129,0.15);color:#10b981;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:1.8rem">✓</div>
          <h3 style="color:#fff;margin-bottom:8px">Consentimento Registrado!</h3>
          <p style="color:#94a3b8;font-size:0.9rem;line-height:1.5">
            O termo de autorização foi assinado e armazenado com sucesso para conformidade com a LGPD.<br>
            Você pode fechar esta página.
          </p>
        </div>
      </div>
    </div>
  `;
}

export async function initConsentForm() {
  const hashQuery = window.location.hash.split('?')[1] || '';
  const params = new URLSearchParams(hashQuery);
  const studentId = params.get('student') || '';
  const trainerId = params.get('t') || '';

  const sNameInput = document.getElementById('studentName');
  const gNameInput = document.getElementById('guardianName');
  const gCpfInput = document.getElementById('guardianCpf');
  const gEmailInput = document.getElementById('guardianEmail');
  const gRelInput = document.getElementById('guardianRelationship');
  const checkbox = document.getElementById('acceptCheckbox');
  const typedSig = document.getElementById('typedSignature');
  const submitBtn = document.getElementById('submitConsentBtn');
  const form = document.getElementById('consentForm');

  const updateTermoDynamicFields = () => {
    document.getElementById('termoStudentName').textContent = sNameInput.value.trim() || '[nome do aluno]';
    document.getElementById('termoGuardianName').textContent = gNameInput.value.trim() || '[nome do responsável]';
    document.getElementById('termoGuardianCpf').textContent = gCpfInput.value.trim() || '[cpf]';
  };

  sNameInput.addEventListener('input', updateTermoDynamicFields);
  gNameInput.addEventListener('input', updateTermoDynamicFields);
  gCpfInput.addEventListener('input', updateTermoDynamicFields);

  const checkValidation = () => {
    const hasSName = sNameInput.value.trim().length > 2;
    const hasGName = gNameInput.value.trim().length > 2;
    const hasCpf = gCpfInput.value.trim().length > 5;
    const hasEmail = gEmailInput.value.trim().length > 4;
    const hasRel = gRelInput.value.trim().length > 1;
    const hasSig = typedSig.value.trim().length > 2;
    const isChecked = checkbox.checked;

    submitBtn.disabled = !(hasSName && hasGName && hasCpf && hasEmail && hasRel && hasSig && isChecked);
  };

  [sNameInput, gNameInput, gCpfInput, gEmailInput, gRelInput, typedSig].forEach(inp => {
    inp.addEventListener('input', checkValidation);
  });
  checkbox.addEventListener('change', checkValidation);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';

    const nowISO = new Date().toISOString();

    const consentPayload = {
      id: 'consent_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      student_id: studentId || null,
      trainer_id: trainerId || null,
      consented_by: 'guardian',
      student_name: sNameInput.value.trim(),
      guardian_name: gNameInput.value.trim(),
      guardian_cpf: gCpfInput.value.trim(),
      guardian_email: gEmailInput.value.trim(),
      relationship: gRelInput.value.trim(),
      terms_version: 'v1-menor',
      signature_name: typedSig.value.trim(),
      ip_address: '0.0.0.0',
      user_agent: navigator.userAgent,
      created_at: nowISO
    };

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/legal_consents`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(consentPayload)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error('Falha ao registrar consentimento: ' + errText);
      }

      form.style.display = 'none';
      document.getElementById('consentSuccess').style.display = 'block';

    } catch (err) {
      console.error('[CONSENT SUBMIT ERROR]', err);
      alert(err.message || 'Erro ao enviar consentimento. Verifique sua conexão e tente novamente.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirmar Consentimento';
    }
  });
}
