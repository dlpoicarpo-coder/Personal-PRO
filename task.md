# Tarefas Fase 4

- [x] 4.1 **reports.js** / PDF geral: Incluir anotações de PDF dossier reports.
- [x] 4.2 **CSS (style.css/index.css)**: Aprimorar layout mobile (1 coluna para charts), micro-interações, etc.
- [x] 4.3 **dashboard.js** / **workouts.js**: Adicionar gráfico de "Densidade", Seletor de Macrociclo na UI (se faltar), garantir `cycleFilter` try/catch seguro.
- [x] 4.4 **Visão de Treino**: Corrigir a visualização de um treino antigo com o novo treino (ignorar datas e semanas diferentes, canalizar nome do aluno, treino e macrociclo em andamento).
- [x] Implement local tombstones & deletion sync in `js/db.js`
  - [x] Add `_getTombstones`, `_saveTombstones`, `_addTombstone`, `_removeTombstone`, `_pruneTombstones`
  - [x] Modify `delete()` to record tombstones
  - [x] Modify `put()` to remove tombstones for recreated items
  - [x] Modify `syncBothWays()` to retry remote deletes and filter out deleted/synced items
  - [x] Modify `syncStudentData()` to retry remote deletes and filter out deleted/synced items
- [x] Add new default training method "Unilateral" to database seeding and trigger updates
- [x] Auto-populate sets, reps, and rest on template method selection (Workout Templates & Periodization Builder)
- [x] Query and display training method explanation in exercise details modal on student portal
- [x] Fix checkout notification date parsing bug when sessions have ISO timestamps (`js/pages/student-portal.js`)
- [x] Fix ReferenceError: html is not defined when opening the checkout modal from the notification banner (`js/pages/student-portal.js`)
