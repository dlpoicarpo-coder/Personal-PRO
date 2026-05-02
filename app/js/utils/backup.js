// ========================================
// PERSONAL PRO — Backup & Restore
// ========================================

import db from '../db.js';
import { notify } from '../components/toast.js';

export async function exportBackup() {
  try {
    const data = await db.exportAll();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PersonalPRO_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify.success('Backup exportado com sucesso!');
  } catch (e) {
    notify.error('Erro ao exportar: ' + e.message);
  }
}

export async function importBackup(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data._version) throw new Error('Arquivo inválido');
        await db.importAll(data);
        notify.success('Backup importado com sucesso! Recarregando...');
        setTimeout(() => location.reload(), 1500);
        resolve();
      } catch (err) {
        notify.error('Erro ao importar: ' + err.message);
        reject(err);
      }
    };
    reader.readAsText(file);
  });
}

export async function exportCSV(storeName) {
  try {
    const data = await db.getAll(storeName);
    if (!data.length) { notify.warning('Sem dados para exportar'); return; }
    const headers = Object.keys(data[0]);
    const csv = [headers.join(','), ...data.map(row => headers.map(h => `"${(row[h] ?? '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PersonalPRO_${storeName}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify.success('CSV exportado!');
  } catch (e) {
    notify.error('Erro: ' + e.message);
  }
}
