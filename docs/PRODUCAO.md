# Plano de produção - Instituto Sentidos

## 1. Preparação local

```bash
npm install
cp .env.example .env
docker compose -f docker-compose.local.yml up -d
npm run prisma:generate
npm run prisma:migrate
npm run db:seed
npm run build:all
npm start
```

URLs locais:

- Site: `http://localhost:4000`
- API: `http://localhost:4000/api/health`
- Vite em desenvolvimento: `http://localhost:3000`

## 2. Variáveis obrigatórias na VPS

```env
NODE_ENV=production
PORT=4000
FRONTEND_URL=https://isentidos.com.br
DATABASE_URL="postgresql://USUARIO:SENHA@HOST:5432/isentidos?schema=public"
ADMIN_EMAIL=admin@isentidos.com.br
ADMIN_PASSWORD=trocar-senha-inicial
JWT_SECRET=gerar-string-longa-e-segura
```

Depois entram SMTP, WhatsApp, GA4, Meta Pixel e armazenamento de arquivos.

Uploads de banners:

- Em desenvolvimento, os arquivos ficam em `public/uploads`.
- Em produção, recomenda-se trocar para Cloudflare R2/S3 e gravar a URL pública no banco.

## 3. Banco PostgreSQL

1. Criar banco `isentidos`.
2. Criar usuário sem privilégios globais.
3. Configurar backup diário.
4. Rodar migrações:

```bash
npm run prisma:deploy
npm run db:seed
```

## 4. Build e PM2

```bash
npm ci
npm run prisma:generate
npm run build:all
npm run prisma:deploy
npm run db:seed
npx pm2 start ecosystem.config.cjs
npx pm2 save
```

## 5. Proxy e SSL

Configurar Traefik ou Nginx para encaminhar:

- `https://isentidos.com.br` -> `http://127.0.0.1:4000`
- `https://www.isentidos.com.br` -> `https://isentidos.com.br`

Ativar SSL com Let's Encrypt.

## 6. Antes do go-live

- Trocar `ADMIN_PASSWORD`.
- Trocar `JWT_SECRET`.
- Validar formulário de pré-matrícula com PostgreSQL ativo.
- Confirmar backup do banco.
- Configurar e testar SMTP.
- Configurar WhatsApp/Evolution API.
- Inserir GA4 e Meta Pixel.
- Criar política de privacidade final.
- Rodar Lighthouse em mobile e desktop.
