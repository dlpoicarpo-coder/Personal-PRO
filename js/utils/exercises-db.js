// ========================================
// VETOR â€” Exercise Database (PT-BR)
// ========================================

const MUSCLE_GROUPS = [
  'Peito', 'Costas', 'Ombros', 'BÃ­ceps', 'TrÃ­ceps', 'AntebraÃ§o',
  'QuadrÃ­ceps', 'Posterior', 'GlÃºteos', 'Panturrilha', 'AbdÃ´men', 'Core',
  'Corpo Inteiro', 'Cardio'
];

const CATEGORIES = ['MusculaÃ§Ã£o', 'Funcional', 'Cardio', 'Alongamento', 'Mobilidade'];

const DEFAULT_EXERCISES = [
  // PEITO
  { name: 'Supino Reto com Barra', muscleGroup: 'Peito', category: 'MusculaÃ§Ã£o', equipment: 'Barra' },
  { name: 'Supino Inclinado com Halteres', muscleGroup: 'Peito', category: 'MusculaÃ§Ã£o', equipment: 'Halteres' },
  { name: 'Supino Declinado com Barra', muscleGroup: 'Peito', category: 'MusculaÃ§Ã£o', equipment: 'Barra' },
  { name: 'Crucifixo Reto', muscleGroup: 'Peito', category: 'MusculaÃ§Ã£o', equipment: 'Halteres' },
  { name: 'Crucifixo Inclinado', muscleGroup: 'Peito', category: 'MusculaÃ§Ã£o', equipment: 'Halteres' },
  { name: 'Peck Deck (Voador)', muscleGroup: 'Peito', category: 'MusculaÃ§Ã£o', equipment: 'MÃ¡quina' },
  { name: 'Cross Over', muscleGroup: 'Peito', category: 'MusculaÃ§Ã£o', equipment: 'Cabo' },
  { name: 'FlexÃ£o de BraÃ§os', muscleGroup: 'Peito', category: 'Funcional', equipment: 'Peso corporal' },
  { name: 'Supino na MÃ¡quina', muscleGroup: 'Peito', category: 'MusculaÃ§Ã£o', equipment: 'MÃ¡quina' },
  // COSTAS
  { name: 'Puxada Frontal', muscleGroup: 'Costas', category: 'MusculaÃ§Ã£o', equipment: 'Cabo' },
  { name: 'Puxada AtrÃ¡s da Nuca', muscleGroup: 'Costas', category: 'MusculaÃ§Ã£o', equipment: 'Cabo' },
  { name: 'Remada Curvada com Barra', muscleGroup: 'Costas', category: 'MusculaÃ§Ã£o', equipment: 'Barra' },
  { name: 'Remada Unilateral com Halter', muscleGroup: 'Costas', category: 'MusculaÃ§Ã£o', equipment: 'Halteres' },
  { name: 'Remada Cavalinho', muscleGroup: 'Costas', category: 'MusculaÃ§Ã£o', equipment: 'MÃ¡quina' },
  { name: 'Remada Baixa (Sentado)', muscleGroup: 'Costas', category: 'MusculaÃ§Ã£o', equipment: 'Cabo' },
  { name: 'Pullover no Cabo', muscleGroup: 'Costas', category: 'MusculaÃ§Ã£o', equipment: 'Cabo' },
  { name: 'Barra Fixa (Pull-up)', muscleGroup: 'Costas', category: 'Funcional', equipment: 'Peso corporal' },
  { name: 'Remada na MÃ¡quina', muscleGroup: 'Costas', category: 'MusculaÃ§Ã£o', equipment: 'MÃ¡quina' },
  { name: 'Levantamento Terra', muscleGroup: 'Costas', category: 'MusculaÃ§Ã£o', equipment: 'Barra' },
  // OMBROS
  { name: 'Desenvolvimento com Halteres', muscleGroup: 'Ombros', category: 'MusculaÃ§Ã£o', equipment: 'Halteres' },
  { name: 'Desenvolvimento com Barra', muscleGroup: 'Ombros', category: 'MusculaÃ§Ã£o', equipment: 'Barra' },
  { name: 'ElevaÃ§Ã£o Lateral', muscleGroup: 'Ombros', category: 'MusculaÃ§Ã£o', equipment: 'Halteres' },
  { name: 'ElevaÃ§Ã£o Frontal', muscleGroup: 'Ombros', category: 'MusculaÃ§Ã£o', equipment: 'Halteres' },
  { name: 'Crucifixo Invertido', muscleGroup: 'Ombros', category: 'MusculaÃ§Ã£o', equipment: 'Halteres' },
  { name: 'Remada Alta', muscleGroup: 'Ombros', category: 'MusculaÃ§Ã£o', equipment: 'Barra' },
  { name: 'Face Pull', muscleGroup: 'Ombros', category: 'MusculaÃ§Ã£o', equipment: 'Cabo' },
  { name: 'Arnold Press', muscleGroup: 'Ombros', category: 'MusculaÃ§Ã£o', equipment: 'Halteres' },
  { name: 'ElevaÃ§Ã£o Lateral no Cabo', muscleGroup: 'Ombros', category: 'MusculaÃ§Ã£o', equipment: 'Cabo' },
  // BÃCEPS
  { name: 'Rosca Direta com Barra', muscleGroup: 'BÃ­ceps', category: 'MusculaÃ§Ã£o', equipment: 'Barra' },
  { name: 'Rosca Alternada com Halteres', muscleGroup: 'BÃ­ceps', category: 'MusculaÃ§Ã£o', equipment: 'Halteres' },
  { name: 'Rosca Martelo', muscleGroup: 'BÃ­ceps', category: 'MusculaÃ§Ã£o', equipment: 'Halteres' },
  { name: 'Rosca Scott', muscleGroup: 'BÃ­ceps', category: 'MusculaÃ§Ã£o', equipment: 'Barra' },
  { name: 'Rosca Concentrada', muscleGroup: 'BÃ­ceps', category: 'MusculaÃ§Ã£o', equipment: 'Halteres' },
  { name: 'Rosca no Cabo', muscleGroup: 'BÃ­ceps', category: 'MusculaÃ§Ã£o', equipment: 'Cabo' },
  { name: 'Rosca 21', muscleGroup: 'BÃ­ceps', category: 'MusculaÃ§Ã£o', equipment: 'Barra' },
  // TRÃCEPS
  { name: 'TrÃ­ceps Pulley', muscleGroup: 'TrÃ­ceps', category: 'MusculaÃ§Ã£o', equipment: 'Cabo' },
  { name: 'TrÃ­ceps Testa', muscleGroup: 'TrÃ­ceps', category: 'MusculaÃ§Ã£o', equipment: 'Barra' },
  { name: 'TrÃ­ceps FrancÃªs', muscleGroup: 'TrÃ­ceps', category: 'MusculaÃ§Ã£o', equipment: 'Halteres' },
  { name: 'TrÃ­ceps Coice', muscleGroup: 'TrÃ­ceps', category: 'MusculaÃ§Ã£o', equipment: 'Halteres' },
  { name: 'Mergulho no Banco', muscleGroup: 'TrÃ­ceps', category: 'Funcional', equipment: 'Peso corporal' },
  { name: 'Mergulho nas Barras Paralelas', muscleGroup: 'TrÃ­ceps', category: 'Funcional', equipment: 'Peso corporal' },
  { name: 'TrÃ­ceps Corda', muscleGroup: 'TrÃ­ceps', category: 'MusculaÃ§Ã£o', equipment: 'Cabo' },
  // QUADRÃCEPS
  { name: 'Agachamento Livre com Barra', muscleGroup: 'QuadrÃ­ceps', category: 'MusculaÃ§Ã£o', equipment: 'Barra' },
  { name: 'Agachamento no Smith', muscleGroup: 'QuadrÃ­ceps', category: 'MusculaÃ§Ã£o', equipment: 'MÃ¡quina' },
  { name: 'Leg Press 45Â°', muscleGroup: 'QuadrÃ­ceps', category: 'MusculaÃ§Ã£o', equipment: 'MÃ¡quina' },
  { name: 'Cadeira Extensora', muscleGroup: 'QuadrÃ­ceps', category: 'MusculaÃ§Ã£o', equipment: 'MÃ¡quina' },
  { name: 'Hack Squat', muscleGroup: 'QuadrÃ­ceps', category: 'MusculaÃ§Ã£o', equipment: 'MÃ¡quina' },
  { name: 'Passada (AvanÃ§o)', muscleGroup: 'QuadrÃ­ceps', category: 'MusculaÃ§Ã£o', equipment: 'Halteres' },
  { name: 'Agachamento BÃºlgaro', muscleGroup: 'QuadrÃ­ceps', category: 'MusculaÃ§Ã£o', equipment: 'Halteres' },
  { name: 'Agachamento Goblet', muscleGroup: 'QuadrÃ­ceps', category: 'MusculaÃ§Ã£o', equipment: 'Halteres' },
  { name: 'Sissy Squat', muscleGroup: 'QuadrÃ­ceps', category: 'Funcional', equipment: 'Peso corporal' },
  // POSTERIOR DE COXA
  { name: 'Mesa Flexora', muscleGroup: 'Posterior', category: 'MusculaÃ§Ã£o', equipment: 'MÃ¡quina' },
  { name: 'Cadeira Flexora', muscleGroup: 'Posterior', category: 'MusculaÃ§Ã£o', equipment: 'MÃ¡quina' },
  { name: 'Stiff com Barra', muscleGroup: 'Posterior', category: 'MusculaÃ§Ã£o', equipment: 'Barra' },
  { name: 'Stiff com Halteres', muscleGroup: 'Posterior', category: 'MusculaÃ§Ã£o', equipment: 'Halteres' },
  { name: 'Bom Dia (Good Morning)', muscleGroup: 'Posterior', category: 'MusculaÃ§Ã£o', equipment: 'Barra' },
  { name: 'FlexÃ£o NÃ³rdica', muscleGroup: 'Posterior', category: 'Funcional', equipment: 'Peso corporal' },
  // GLÃšTEOS
  { name: 'Hip Thrust', muscleGroup: 'GlÃºteos', category: 'MusculaÃ§Ã£o', equipment: 'Barra' },
  { name: 'ElevaÃ§Ã£o PÃ©lvica', muscleGroup: 'GlÃºteos', category: 'Funcional', equipment: 'Peso corporal' },
  { name: 'AbduÃ§Ã£o na MÃ¡quina', muscleGroup: 'GlÃºteos', category: 'MusculaÃ§Ã£o', equipment: 'MÃ¡quina' },
  { name: 'AbduÃ§Ã£o no Cabo', muscleGroup: 'GlÃºteos', category: 'MusculaÃ§Ã£o', equipment: 'Cabo' },
  { name: 'ExtensÃ£o de Quadril no Cabo', muscleGroup: 'GlÃºteos', category: 'MusculaÃ§Ã£o', equipment: 'Cabo' },
  { name: 'Agachamento SumÃ´', muscleGroup: 'GlÃºteos', category: 'MusculaÃ§Ã£o', equipment: 'Halteres' },
  // PANTURRILHA
  { name: 'Panturrilha em PÃ© na MÃ¡quina', muscleGroup: 'Panturrilha', category: 'MusculaÃ§Ã£o', equipment: 'MÃ¡quina' },
  { name: 'Panturrilha Sentado', muscleGroup: 'Panturrilha', category: 'MusculaÃ§Ã£o', equipment: 'MÃ¡quina' },
  { name: 'Panturrilha no Leg Press', muscleGroup: 'Panturrilha', category: 'MusculaÃ§Ã£o', equipment: 'MÃ¡quina' },
  { name: 'Panturrilha Unilateral', muscleGroup: 'Panturrilha', category: 'Funcional', equipment: 'Peso corporal' },
  // ABDÃ”MEN / CORE
  { name: 'Abdominal Crunch', muscleGroup: 'AbdÃ´men', category: 'MusculaÃ§Ã£o', equipment: 'Peso corporal' },
  { name: 'Abdominal Infra', muscleGroup: 'AbdÃ´men', category: 'MusculaÃ§Ã£o', equipment: 'Peso corporal' },
  { name: 'Abdominal OblÃ­quo', muscleGroup: 'AbdÃ´men', category: 'MusculaÃ§Ã£o', equipment: 'Peso corporal' },
  { name: 'Prancha Frontal', muscleGroup: 'Core', category: 'Funcional', equipment: 'Peso corporal' },
  { name: 'Prancha Lateral', muscleGroup: 'Core', category: 'Funcional', equipment: 'Peso corporal' },
  { name: 'Abdominal na Roda', muscleGroup: 'Core', category: 'Funcional', equipment: 'Roda abdominal' },
  { name: 'Russian Twist', muscleGroup: 'Core', category: 'Funcional', equipment: 'Peso corporal' },
  { name: 'Pallof Press', muscleGroup: 'Core', category: 'Funcional', equipment: 'Cabo' },
  { name: 'Abdominal no Cabo (Rope Crunch)', muscleGroup: 'AbdÃ´men', category: 'MusculaÃ§Ã£o', equipment: 'Cabo' },
  { name: 'Mountain Climber', muscleGroup: 'Core', category: 'Funcional', equipment: 'Peso corporal' },
  // CORPO INTEIRO / FUNCIONAL
  { name: 'Burpee', muscleGroup: 'Corpo Inteiro', category: 'Funcional', equipment: 'Peso corporal' },
  { name: 'Kettlebell Swing', muscleGroup: 'Corpo Inteiro', category: 'Funcional', equipment: 'Kettlebell' },
  { name: 'Clean and Press', muscleGroup: 'Corpo Inteiro', category: 'MusculaÃ§Ã£o', equipment: 'Barra' },
  { name: 'Turkish Get-up', muscleGroup: 'Corpo Inteiro', category: 'Funcional', equipment: 'Kettlebell' },
  { name: 'Farmer Walk', muscleGroup: 'Corpo Inteiro', category: 'Funcional', equipment: 'Halteres' },
  { name: 'Battle Rope', muscleGroup: 'Corpo Inteiro', category: 'Funcional', equipment: 'Corda naval' },
  // CARDIO
  { name: 'Esteira - Caminhada', muscleGroup: 'Cardio', category: 'Cardio', equipment: 'Esteira' },
  { name: 'Esteira - Corrida', muscleGroup: 'Cardio', category: 'Cardio', equipment: 'Esteira' },
  { name: 'Bicicleta ErgomÃ©trica', muscleGroup: 'Cardio', category: 'Cardio', equipment: 'Bicicleta' },
  { name: 'ElÃ­ptico / Transport', muscleGroup: 'Cardio', category: 'Cardio', equipment: 'ElÃ­ptico' },
  { name: 'Remo ErgomÃ©trico', muscleGroup: 'Cardio', category: 'Cardio', equipment: 'Remo' },
  { name: 'Escada / Stepper', muscleGroup: 'Cardio', category: 'Cardio', equipment: 'Escada' },
  { name: 'Pular Corda', muscleGroup: 'Cardio', category: 'Cardio', equipment: 'Corda' },
  { name: 'HIIT GenÃ©rico', muscleGroup: 'Cardio', category: 'Cardio', equipment: 'Variado' },
  // ALONGAMENTO / MOBILIDADE
  { name: 'Alongamento de Peito na Parede', muscleGroup: 'Peito', category: 'Alongamento', equipment: 'Nenhum' },
  { name: 'Alongamento de Posterior', muscleGroup: 'Posterior', category: 'Alongamento', equipment: 'Nenhum' },
  { name: 'Alongamento de QuadrÃ­ceps', muscleGroup: 'QuadrÃ­ceps', category: 'Alongamento', equipment: 'Nenhum' },
  { name: 'Mobilidade de Tornozelo', muscleGroup: 'Panturrilha', category: 'Mobilidade', equipment: 'Nenhum' },
  { name: 'Mobilidade de Quadril', muscleGroup: 'GlÃºteos', category: 'Mobilidade', equipment: 'Nenhum' },
  { name: 'RotaÃ§Ã£o TorÃ¡cica', muscleGroup: 'Core', category: 'Mobilidade', equipment: 'Nenhum' },
  { name: 'Foam Rolling', muscleGroup: 'Corpo Inteiro', category: 'Mobilidade', equipment: 'Rolo' },
  { name: 'Alongamento de Ombro', muscleGroup: 'Ombros', category: 'Alongamento', equipment: 'Nenhum' },
];

export { DEFAULT_EXERCISES, MUSCLE_GROUPS, CATEGORIES };

