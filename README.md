# Instituto Sentidos

Protótipo/MVP do novo site do Instituto Sentidos, guiado pelo PRD em `PRD_Instituto_Sentidos.md`.

## O que já existe

- Home institucional com CTAs para cursos, pré-matrícula e WhatsApp.
- Catálogo de cursos com filtro por tipo, formato e busca por texto.
- Bloco de pré-matrícula com escolha entre pós presencial e pós online ao vivo.
- Seção do programa de indicação com simulação do painel do aluno.
- Áreas iniciais para institucional, blog/materiais e validação de certificados.
- Admin visual funcional com login, métricas, leads e cadastro rápido de pós-graduação.
- Painel admin independente em `/admin`, com módulos para banners, cursos, blog, e-books, eventos, leads e configurações.
- Upload local de imagens para banners via `/api/admin/upload`.
- API Express com endpoints de saúde, cursos, leads, login admin e dashboard.
- Schema Prisma/PostgreSQL com cursos, leads, matrículas, indicações, blog, certificados e e-books.
- Identidade visual baseada no PRD: navy, laranja, azul médio, branco e cinza claro.

## Stack atual

- React 19
- Vite
- TypeScript
- Tailwind CSS 4
- Lucide React
- Express
- Prisma
- PostgreSQL

## Rodar localmente

```bash
npm install
npm run dev
```

O Vite sobe em `http://localhost:3000`.

Para testar a API e o build de produção:

```bash
npm run build:all
npm start
```

O Express sobe em `http://localhost:4000` e também serve o front compilado.

Rotas principais:

- Site público: `http://localhost:4000`
- Admin: `http://localhost:4000/admin`
- Saúde da API: `http://localhost:4000/api/health`

Para banco local:

```bash
docker compose -f docker-compose.local.yml up -d
npm run prisma:migrate
npm run db:seed
```

## Verificações

```bash
npm run lint
npm run build
npm run build:server
```

## Próximos passos técnicos

- Adicionar rotas públicas para páginas individuais de curso.
- Ligar o admin do React aos endpoints reais com JWT.
- Implementar CRUD completo de cursos e leads no painel.
- Integrar SMTP e WhatsApp/Evolution API.
- Criar SSR/rotas SEO para páginas individuais de curso.
- Configurar deploy seguindo `docs/PRODUCAO.md`.
