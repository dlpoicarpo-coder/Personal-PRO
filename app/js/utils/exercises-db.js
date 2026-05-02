// ========================================
// PERSONAL PRO — Exercise Database (PT-BR)
// ========================================

const MUSCLE_GROUPS = [
  'Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Antebraço',
  'Quadríceps', 'Posterior', 'Glúteos', 'Panturrilha', 'Abdômen', 'Core',
  'Corpo Inteiro', 'Cardio'
];

const CATEGORIES = ['Musculação', 'Funcional', 'Cardio', 'Alongamento', 'Mobilidade'];

const DEFAULT_EXERCISES = [
  // PEITO
  { name: 'Supino Reto com Barra', muscleGroup: 'Peito', category: 'Musculação', equipment: 'Barra' },
  { name: 'Supino Inclinado com Halteres', muscleGroup: 'Peito', category: 'Musculação', equipment: 'Halteres' },
  { name: 'Supino Declinado com Barra', muscleGroup: 'Peito', category: 'Musculação', equipment: 'Barra' },
  { name: 'Crucifixo Reto', muscleGroup: 'Peito', category: 'Musculação', equipment: 'Halteres' },
  { name: 'Crucifixo Inclinado', muscleGroup: 'Peito', category: 'Musculação', equipment: 'Halteres' },
  { name: 'Peck Deck (Voador)', muscleGroup: 'Peito', category: 'Musculação', equipment: 'Máquina' },
  { name: 'Cross Over', muscleGroup: 'Peito', category: 'Musculação', equipment: 'Cabo' },
  { name: 'Flexão de Braços', muscleGroup: 'Peito', category: 'Funcional', equipment: 'Peso corporal' },
  { name: 'Supino na Máquina', muscleGroup: 'Peito', category: 'Musculação', equipment: 'Máquina' },
  // COSTAS
  { name: 'Puxada Frontal', muscleGroup: 'Costas', category: 'Musculação', equipment: 'Cabo' },
  { name: 'Puxada Atrás da Nuca', muscleGroup: 'Costas', category: 'Musculação', equipment: 'Cabo' },
  { name: 'Remada Curvada com Barra', muscleGroup: 'Costas', category: 'Musculação', equipment: 'Barra' },
  { name: 'Remada Unilateral com Halter', muscleGroup: 'Costas', category: 'Musculação', equipment: 'Halteres' },
  { name: 'Remada Cavalinho', muscleGroup: 'Costas', category: 'Musculação', equipment: 'Máquina' },
  { name: 'Remada Baixa (Sentado)', muscleGroup: 'Costas', category: 'Musculação', equipment: 'Cabo' },
  { name: 'Pullover no Cabo', muscleGroup: 'Costas', category: 'Musculação', equipment: 'Cabo' },
  { name: 'Barra Fixa (Pull-up)', muscleGroup: 'Costas', category: 'Funcional', equipment: 'Peso corporal' },
  { name: 'Remada na Máquina', muscleGroup: 'Costas', category: 'Musculação', equipment: 'Máquina' },
  { name: 'Levantamento Terra', muscleGroup: 'Costas', category: 'Musculação', equipment: 'Barra' },
  // OMBROS
  { name: 'Desenvolvimento com Halteres', muscleGroup: 'Ombros', category: 'Musculação', equipment: 'Halteres' },
  { name: 'Desenvolvimento com Barra', muscleGroup: 'Ombros', category: 'Musculação', equipment: 'Barra' },
  { name: 'Elevação Lateral', muscleGroup: 'Ombros', category: 'Musculação', equipment: 'Halteres' },
  { name: 'Elevação Frontal', muscleGroup: 'Ombros', category: 'Musculação', equipment: 'Halteres' },
  { name: 'Crucifixo Invertido', muscleGroup: 'Ombros', category: 'Musculação', equipment: 'Halteres' },
  { name: 'Remada Alta', muscleGroup: 'Ombros', category: 'Musculação', equipment: 'Barra' },
  { name: 'Face Pull', muscleGroup: 'Ombros', category: 'Musculação', equipment: 'Cabo' },
  { name: 'Arnold Press', muscleGroup: 'Ombros', category: 'Musculação', equipment: 'Halteres' },
  { name: 'Elevação Lateral no Cabo', muscleGroup: 'Ombros', category: 'Musculação', equipment: 'Cabo' },
  // BÍCEPS
  { name: 'Rosca Direta com Barra', muscleGroup: 'Bíceps', category: 'Musculação', equipment: 'Barra' },
  { name: 'Rosca Alternada com Halteres', muscleGroup: 'Bíceps', category: 'Musculação', equipment: 'Halteres' },
  { name: 'Rosca Martelo', muscleGroup: 'Bíceps', category: 'Musculação', equipment: 'Halteres' },
  { name: 'Rosca Scott', muscleGroup: 'Bíceps', category: 'Musculação', equipment: 'Barra' },
  { name: 'Rosca Concentrada', muscleGroup: 'Bíceps', category: 'Musculação', equipment: 'Halteres' },
  { name: 'Rosca no Cabo', muscleGroup: 'Bíceps', category: 'Musculação', equipment: 'Cabo' },
  { name: 'Rosca 21', muscleGroup: 'Bíceps', category: 'Musculação', equipment: 'Barra' },
  // TRÍCEPS
  { name: 'Tríceps Pulley', muscleGroup: 'Tríceps', category: 'Musculação', equipment: 'Cabo' },
  { name: 'Tríceps Testa', muscleGroup: 'Tríceps', category: 'Musculação', equipment: 'Barra' },
  { name: 'Tríceps Francês', muscleGroup: 'Tríceps', category: 'Musculação', equipment: 'Halteres' },
  { name: 'Tríceps Coice', muscleGroup: 'Tríceps', category: 'Musculação', equipment: 'Halteres' },
  { name: 'Mergulho no Banco', muscleGroup: 'Tríceps', category: 'Funcional', equipment: 'Peso corporal' },
  { name: 'Mergulho nas Barras Paralelas', muscleGroup: 'Tríceps', category: 'Funcional', equipment: 'Peso corporal' },
  { name: 'Tríceps Corda', muscleGroup: 'Tríceps', category: 'Musculação', equipment: 'Cabo' },
  // QUADRÍCEPS
  { name: 'Agachamento Livre com Barra', muscleGroup: 'Quadríceps', category: 'Musculação', equipment: 'Barra' },
  { name: 'Agachamento no Smith', muscleGroup: 'Quadríceps', category: 'Musculação', equipment: 'Máquina' },
  { name: 'Leg Press 45°', muscleGroup: 'Quadríceps', category: 'Musculação', equipment: 'Máquina' },
  { name: 'Cadeira Extensora', muscleGroup: 'Quadríceps', category: 'Musculação', equipment: 'Máquina' },
  { name: 'Hack Squat', muscleGroup: 'Quadríceps', category: 'Musculação', equipment: 'Máquina' },
  { name: 'Passada (Avanço)', muscleGroup: 'Quadríceps', category: 'Musculação', equipment: 'Halteres' },
  { name: 'Agachamento Búlgaro', muscleGroup: 'Quadríceps', category: 'Musculação', equipment: 'Halteres' },
  { name: 'Agachamento Goblet', muscleGroup: 'Quadríceps', category: 'Musculação', equipment: 'Halteres' },
  { name: 'Sissy Squat', muscleGroup: 'Quadríceps', category: 'Funcional', equipment: 'Peso corporal' },
  // POSTERIOR DE COXA
  { name: 'Mesa Flexora', muscleGroup: 'Posterior', category: 'Musculação', equipment: 'Máquina' },
  { name: 'Cadeira Flexora', muscleGroup: 'Posterior', category: 'Musculação', equipment: 'Máquina' },
  { name: 'Stiff com Barra', muscleGroup: 'Posterior', category: 'Musculação', equipment: 'Barra' },
  { name: 'Stiff com Halteres', muscleGroup: 'Posterior', category: 'Musculação', equipment: 'Halteres' },
  { name: 'Bom Dia (Good Morning)', muscleGroup: 'Posterior', category: 'Musculação', equipment: 'Barra' },
  { name: 'Flexão Nórdica', muscleGroup: 'Posterior', category: 'Funcional', equipment: 'Peso corporal' },
  // GLÚTEOS
  { name: 'Hip Thrust', muscleGroup: 'Glúteos', category: 'Musculação', equipment: 'Barra' },
  { name: 'Elevação Pélvica', muscleGroup: 'Glúteos', category: 'Funcional', equipment: 'Peso corporal' },
  { name: 'Abdução na Máquina', muscleGroup: 'Glúteos', category: 'Musculação', equipment: 'Máquina' },
  { name: 'Abdução no Cabo', muscleGroup: 'Glúteos', category: 'Musculação', equipment: 'Cabo' },
  { name: 'Extensão de Quadril no Cabo', muscleGroup: 'Glúteos', category: 'Musculação', equipment: 'Cabo' },
  { name: 'Agachamento Sumô', muscleGroup: 'Glúteos', category: 'Musculação', equipment: 'Halteres' },
  // PANTURRILHA
  { name: 'Panturrilha em Pé na Máquina', muscleGroup: 'Panturrilha', category: 'Musculação', equipment: 'Máquina' },
  { name: 'Panturrilha Sentado', muscleGroup: 'Panturrilha', category: 'Musculação', equipment: 'Máquina' },
  { name: 'Panturrilha no Leg Press', muscleGroup: 'Panturrilha', category: 'Musculação', equipment: 'Máquina' },
  { name: 'Panturrilha Unilateral', muscleGroup: 'Panturrilha', category: 'Funcional', equipment: 'Peso corporal' },
  // ABDÔMEN / CORE
  { name: 'Abdominal Crunch', muscleGroup: 'Abdômen', category: 'Musculação', equipment: 'Peso corporal' },
  { name: 'Abdominal Infra', muscleGroup: 'Abdômen', category: 'Musculação', equipment: 'Peso corporal' },
  { name: 'Abdominal Oblíquo', muscleGroup: 'Abdômen', category: 'Musculação', equipment: 'Peso corporal' },
  { name: 'Prancha Frontal', muscleGroup: 'Core', category: 'Funcional', equipment: 'Peso corporal' },
  { name: 'Prancha Lateral', muscleGroup: 'Core', category: 'Funcional', equipment: 'Peso corporal' },
  { name: 'Abdominal na Roda', muscleGroup: 'Core', category: 'Funcional', equipment: 'Roda abdominal' },
  { name: 'Russian Twist', muscleGroup: 'Core', category: 'Funcional', equipment: 'Peso corporal' },
  { name: 'Pallof Press', muscleGroup: 'Core', category: 'Funcional', equipment: 'Cabo' },
  { name: 'Abdominal no Cabo (Rope Crunch)', muscleGroup: 'Abdômen', category: 'Musculação', equipment: 'Cabo' },
  { name: 'Mountain Climber', muscleGroup: 'Core', category: 'Funcional', equipment: 'Peso corporal' },
  // CORPO INTEIRO / FUNCIONAL
  { name: 'Burpee', muscleGroup: 'Corpo Inteiro', category: 'Funcional', equipment: 'Peso corporal' },
  { name: 'Kettlebell Swing', muscleGroup: 'Corpo Inteiro', category: 'Funcional', equipment: 'Kettlebell' },
  { name: 'Clean and Press', muscleGroup: 'Corpo Inteiro', category: 'Musculação', equipment: 'Barra' },
  { name: 'Turkish Get-up', muscleGroup: 'Corpo Inteiro', category: 'Funcional', equipment: 'Kettlebell' },
  { name: 'Farmer Walk', muscleGroup: 'Corpo Inteiro', category: 'Funcional', equipment: 'Halteres' },
  { name: 'Battle Rope', muscleGroup: 'Corpo Inteiro', category: 'Funcional', equipment: 'Corda naval' },
  // CARDIO
  { name: 'Esteira - Caminhada', muscleGroup: 'Cardio', category: 'Cardio', equipment: 'Esteira' },
  { name: 'Esteira - Corrida', muscleGroup: 'Cardio', category: 'Cardio', equipment: 'Esteira' },
  { name: 'Bicicleta Ergométrica', muscleGroup: 'Cardio', category: 'Cardio', equipment: 'Bicicleta' },
  { name: 'Elíptico / Transport', muscleGroup: 'Cardio', category: 'Cardio', equipment: 'Elíptico' },
  { name: 'Remo Ergométrico', muscleGroup: 'Cardio', category: 'Cardio', equipment: 'Remo' },
  { name: 'Escada / Stepper', muscleGroup: 'Cardio', category: 'Cardio', equipment: 'Escada' },
  { name: 'Pular Corda', muscleGroup: 'Cardio', category: 'Cardio', equipment: 'Corda' },
  { name: 'HIIT Genérico', muscleGroup: 'Cardio', category: 'Cardio', equipment: 'Variado' },
  // ALONGAMENTO / MOBILIDADE
  { name: 'Alongamento de Peito na Parede', muscleGroup: 'Peito', category: 'Alongamento', equipment: 'Nenhum' },
  { name: 'Alongamento de Posterior', muscleGroup: 'Posterior', category: 'Alongamento', equipment: 'Nenhum' },
  { name: 'Alongamento de Quadríceps', muscleGroup: 'Quadríceps', category: 'Alongamento', equipment: 'Nenhum' },
  { name: 'Mobilidade de Tornozelo', muscleGroup: 'Panturrilha', category: 'Mobilidade', equipment: 'Nenhum' },
  { name: 'Mobilidade de Quadril', muscleGroup: 'Glúteos', category: 'Mobilidade', equipment: 'Nenhum' },
  { name: 'Rotação Torácica', muscleGroup: 'Core', category: 'Mobilidade', equipment: 'Nenhum' },
  { name: 'Foam Rolling', muscleGroup: 'Corpo Inteiro', category: 'Mobilidade', equipment: 'Rolo' },
  { name: 'Alongamento de Ombro', muscleGroup: 'Ombros', category: 'Alongamento', equipment: 'Nenhum' },
];

export { DEFAULT_EXERCISES, MUSCLE_GROUPS, CATEGORIES };
