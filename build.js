const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'js', 'utils', 'config.js');

// O fallback serve apenas para ambiente de desenvolvimento local caso não tenha .env rodando
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vbxedlloesvjpqzunqyv.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_d4P6mzDj_sSUpFibSGUcdg_2GOsD35E';

const configContent = `// Auto-gerado pelo build.js
export const SUPABASE_URL = '${SUPABASE_URL}';
export const SUPABASE_KEY = '${SUPABASE_KEY}';
`;

fs.writeFileSync(configPath, configContent);
console.log('✅ Configuração injetada gerada com sucesso em js/utils/config.js');
