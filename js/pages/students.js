// ========================================
// PERSONAL PRO — Students Page (Cloud Ready v2)
// ========================================
import db from '../db.js';
import { openModal, closeModal } from '../components/modal.js';
import { notify } from '../components/toast.js';

export async function renderStudents() {
  return `
    <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h2><i class="fas fa-users"></i> Gestão de Alunos</h2>
      <button id="addStudentBtn" class="btn btn-primary" style="background: var(--primary); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold;">
        + Adicionar Aluno
      </button>
    </div>
    
    <div class="card" style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      <div class="table-responsive">
        <table class="table" id="studentsTable" style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="border-bottom: 2px solid #eee;">
              <th style="padding: 12px 8px;">Nome do Aluno</th>
              <th style="padding: 12px 8px;">Objetivo</th>
              <th style="padding: 12px 8px;">Status</th>
              <th style="padding: 12px 8px;">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr><td colspan="4" style="text-align: center; padding: 20px; color: #666;">A carregar a tua equipa...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

export async function initStudents() {
  await loadStudents();

  const addBtn = document.getElementById('addStudentBtn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      openAddStudentModal();
    });
  }
}

async function loadStudents() {
  const tbody = document.querySelector('#studentsTable tbody');
  
  try {
    const studentsList = await db.getAll('students');
    
    if (!studentsList || studentsList.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; padding: 30px; color: #666;">
            <strong>Ainda não tens alunos registados na Nuvem.</strong><br>
            Clica no botão azul "+ Adicionar Aluno" para começares!
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = studentsList.map(student => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 12px 8px;"><strong>${student.data.nome || 'Aluno Sem Nome'}</strong></td>
        <td style="padding: 12px 8px;">${student.data.objetivo || 'Não definido'}</td>
        <td style="padding: 12px 8px;"><span style="background: #dcfce3; color: #16a34a; padding: 4px 8px; border-radius: 12px; font-size: 0.85rem; font-weight: bold;">Ativo</span></td>
        <td style="padding: 12px 8px;">
          <button style="background: none; border: none; color: var(--primary); cursor: pointer; font-size: 1.1rem;"><i class="fas fa-eye"></i></button>
        </td>
      </tr>
    `).join('');
    
  } catch (err) {
    console.error("Erro ao carregar alunos:", err);
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: red;">Erro ao ligar à base de dados.</td></tr>`;
  }
}

function openAddStudentModal() {
  const formHtml = `
    <form id="addStudentForm" style="display: flex; flex-direction: column; gap: 15px; margin-top: 15px;">
      <div>
        <label style="font-weight: bold; margin-bottom: 5px; display: block;">Nome Completo</label>
        <input type="text" id="stuName" class="form-control" required placeholder="Ex: Maria Silva" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #ccc;">
      </div>
      <div>
        <label style="font-weight: bold; margin-bottom: 5px; display: block;">Objetivo Principal</label>
        <select id="stuObjective" class="form-control" required style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #ccc;">
          <option value="Emagrecimento">Emagrecimento</option>
          <option value="Hipertrofia">Hipertrofia</option>
          <option value="Saúde e Qualidade de Vida">Saúde / Qualidade de Vida</option>
          <option value="Performance Desportiva">Performance Desportiva</option>
        </select>
      </div>
      <button type="submit" class="btn btn-primary" style="margin-top: 15px; background: var(--primary); color: white; border: none; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer;">
        Guardar Aluno na Nuvem
      </button>
    </form>
  `;

  openModal('Adicionar Novo Aluno', formHtml);

  document.getElementById('addStudentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('stuName').value;
    const objetivo = document.getElementById('stuObjective').value;
    const btn = e.target.querySelector('button');
    
    btn.innerText = 'A guardar...';
    btn.disabled = true;

    // Cria o pacote de dados do aluno
    const novoAluno = {
      data: {
        nome: nome,
        objetivo: objetivo,
        dataCadastro: new Date().toISOString()
      }
    };

    try {
      await db.add('students', novoAluno); // Envia para o Supabase!
      closeModal();
      if(typeof notify === 'function') notify('Aluno guardado com sucesso na Nuvem!', 'success');
      await loadStudents(); // Recarrega a tabela para mostrar o novo aluno
    } catch (error) {
      console.error(error);
      if(typeof notify === 'function') notify('Erro ao guardar aluno.', 'error');
      btn.innerText = 'Tentar Novamente';
      btn.disabled = false;
    }
  });
}
