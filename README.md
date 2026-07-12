# Vetor

Sistema Profissional para Personal Trainers com gestão de alunos, sessões e financeiro.

## Configuração de Ambiente (Supabase)

O projeto foi migrado para utilizar variáveis de ambiente injetadas no build da Vercel. As chaves não estão mais hardcoded no código (por segurança, já que o repositório é compartilhado).

### Rodando Localmente:
1. Copie o arquivo `js/utils/config.example.js` e renomeie para `js/utils/config.js`.
2. Adicione sua URL e CHAVE PUBLICA do Supabase dentro do arquivo gerado (ele está no `.gitignore` para não subir no Github).
3. Utilize um servidor local (ex: Live Server do VSCode) na pasta raiz.

### Deploy na Vercel:
Para rodar na Vercel, o Vercel executará automaticamente o script `node build.js` (pois criamos um `package.json` com o comando `npm run build` apontando para esse arquivo).
Para isso, você precisa ir no painel da sua Vercel:
1. Acesse Settings > Environment Variables
2. Adicione:
   - **`SUPABASE_URL`**: `sua_url_do_projeto.supabase.co`
   - **`SUPABASE_KEY`**: `sua_chave_anon_publishable_do_projeto`

### Rotação da Chave Publishable (Importante!)
Como as chaves hardcoded antigas estão expostas no histórico do Git:
1. Vá até o painel do Supabase.
2. Acesse **Project Settings > API**.
3. Na seção `anon` / `public`, encontre a chave e clique para gerar uma nova (**Rotate Secret / Regenerate**).
4. Volte na Vercel e atualize a variável `SUPABASE_KEY` com o novo valor.
5. Dê um *Redeploy* no seu projeto.
