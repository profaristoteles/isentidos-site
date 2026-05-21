# PRD — Novo Site Instituto Sentidos
**Product Requirements Document**  
**Versão:** 1.0  
**Data:** Maio de 2026  
**Responsável:** Instituto Sentidos / Aristóteles Meneses Lima  
**Stack:** Node.js · PostgreSQL · Painel Administrativo · Programa de Indicação

---

## 1. Visão Geral

O Instituto Sentidos necessita migrar sua presença digital do WordPress para uma solução proprietária em Node.js, com painel administrativo completo, banco de dados relacional e um programa de indicação com bonificação em descontos nas mensalidades. A nova plataforma deve consolidar os quatro pilares de negócio — Cursos Livres, Pós-Graduação Lato Sensu e Programas Internacionais (Ivy Enber University)  — em um único sistema escalável e independente de terceiros.

---

## 2. Objetivos do Produto

- Eliminar dependência do WordPress e plugins pagos
- Ter controle total sobre dados, SEO e performance
- Aumentar conversão por meio de páginas de curso otimizadas
- Criar canal de aquisição orgânico via programa de indicação com desconto em mensalidades
- Centralizar gestão de cursos, alunos, leads e indicações em um único painel administrativo

---

## 3. Personas

| Persona | Descrição | Objetivo Principal |
|---|---|---|
| Visitante/Lead | Professores, servidores públicos, recém-graduados | Conhecer cursos, preços e se inscrever |
| Aluno Ativo | Matriculado em curso livre ou pós-graduação | Indicar amigos, acompanhar desconto acumulado |
| Indicado | Recebe o link de indicação | Conhecer o curso e se matricular com desconto |
| Admin | Equipe do Instituto Sentidos | Gerenciar tudo pelo painel |
| Consultor/Comercial | Atende leads via WhatsApp/presencial | Visualizar leads e status de indicações |

---

## 4. Arquitetura Técnica

### 4.1 Stack Recomendada

```
Backend:     Node.js + Express.js (ou Fastify)
Template:    EJS ou Handlebars (SSR para SEO) + React para painel admin
Banco:       PostgreSQL (principal) + Redis (cache de sessão e filas)
ORM:         Prisma
Autenticação: JWT + bcrypt (admin) · magic link ou OAuth (aluno)
Upload:      Multer + armazenamento em S3/Cloudflare R2
Email:       Nodemailer + SMTP (Brevo/SendGrid)
WhatsApp:    Integração via API Oficial ou Evolution API (para Isis)
Deploy:      VPS (Hetzer) + PM2 + traefik + SSL (Let's Encrypt)
SEO:         SSR nativo, sitemap.xml automático, meta tags dinâmicas
```

### 4.2 Estrutura de Módulos

```
instituto-sentidos/
├── src/
│   ├── modules/
│   │   ├── courses/        # Cadastro e exibição de cursos
│   │   ├── leads/          # Captura e gestão de leads
│   │   ├── enrollments/    # Pré-matrícula e matrículas
│   │   ├── referral/       # Programa de indicação
│   │   ├── blog/           # Artigos e conteúdo
│   │   ├── certificates/   # Validação de certificados
│   │   └── admin/          # Painel administrativo
│   ├── views/              # Templates SSR (EJS)
│   ├── public/             # Assets estáticos
│   └── config/             # Env, DB, email
├── prisma/
│   └── schema.prisma
└── package.json
```

---

## 5. Módulos Funcionais

### 5.1 Site Público

**Páginas obrigatórias:**
- Home com hero, destaques de cursos, depoimentos, CTA para WhatsApp/Inscrição
- Listagem de cursos com filtros por: Tipo (Livre / Pós / Preparatório / Internacional), Área, Modalidade (Presencial / On-line ao Vivo / EAD)
- Página de curso individual com: ementa, carga horária, valor, parcelamento, corpo docente, depoimentos, botão de inscrição e botão de indicação
- Pré-matrícula (Pós-Graduação Presencial e Online)
- Página institucional: sobre, equipe, parceiros (FAEPI, Ivy Enber University)
- Apostilas e E-books (catálogo para venda/download)
- Validação de certificado (campo público)
- Blog / Artigos
- Política de Privacidade e LGPD
- Contato e WhatsApp flutuante

### 5.2 Painel Administrativo (`/admin`)

**Dashboard:**
- Total de leads (semana, mês, acumulado)
- Inscrições por curso
- Indicações ativas e convertidas
- Receita estimada por turma

**Gestão de Cursos:**
- CRUD completo de cursos (título, descrição, ementa, carga horária, modalidade, valor, parcelamento, turmas, datas, vagas, imagem de capa)
- Ativação/desativação de cursos
- Ordenação e destaque na home
- Associação com categorias e tags

**Gestão de Leads:**
- Visualização de leads capturados (nome, e-mail, telefone, curso de interesse, origem, data)
- Filtro por status: Novo, Em Atendimento, Matriculado, Perdido
- Exportação CSV
- Encaminhamento para WhatsApp com um clique

**Gestão de Alunos:**
- Cadastro de alunos ativos
- Associação com curso e turma
- Controle de mensalidades (valor base, desconto de indicação aplicado, status de pagamento)
- Histórico de indicações feitas e recebidas

**Gestão de Indicações (ver Módulo 6 abaixo)**

**Gestão de Blog:**
- CRUD de artigos com editor rico (TipTap ou Quill)
- Categorias, tags, slug, meta SEO, imagem de destaque
- Publicar / Despublicar / Agendar

**Configurações Gerais:**
- Dados institucionais (CNPJ, endereço, telefone, redes sociais)
- Configurações de e-mail e SMTP
- Pixel do Facebook e Google Analytics (campos livres de código)
- Gestão de usuários admin (nome, e-mail, perfil: Super Admin, Comercial, Conteúdo)

---

## 6. Programa de Indicação

### 6.1 Conceito
Inspirado no modelo do vcindica.com.br, porém a bonificação não é em dinheiro — é em **desconto progressivo nas mensalidades** dos cursos Livres e Pós-Graduação Lato Sensu. O programa é configurado inteiramente pelo admin.

### 6.2 Fluxo do Programa

```
[Aluno Ativo]
    │
    ▼ Acessa "Meu Painel de Indicações"
    │
    ├─ Gera link único: isentidos.com.br/i/CODIGO123
    ├─ Compartilha via WhatsApp, Instagram, e-mail
    │
    ▼ [Indicado acessa o link]
    │
    ├─ Landing page personalizada: "Fulano indica você para o Instituto Sentidos"
    ├─ Formulário de interesse (nome, e-mail, telefone, curso desejado)
    │
    ▼ [Indicado se matricula]
    │
    ├─ Sistema detecta conversão e vincula ao código do indicador
    ▼
[Desconto aplicado na próxima mensalidade do aluno indicador]
```

### 6.3 Configurações pelo Admin

O admin configura o programa em `/admin/referral/settings`:

| Configuração | Descrição | Exemplo |
|---|---|---|
| Status do programa | Ativo / Inativo | Ativo |
| Desconto por indicação convertida | Percentual ou valor fixo | 10% ou R$ 30,00 |
| Desconto máximo acumulável | Teto do desconto total | 50% da mensalidade |
| Desconto acumulativo | Soma a cada indicação ou substitui | Cumulativo |
| Cursos elegíveis para desconto | Quais cursos podem receber desconto | Todos os Lato Sensu |
| Prazo de validade do link | Dias até expirar | Sem prazo / 90 dias |
| Mínimo de indicações para ativar | Quantas indicações para o desconto valer | 1 |
| Mensagem da landing page de indicação | Texto personalizável | "Seu amigo acredita em você..." |
| E-mail de confirmação ao indicador | Template editável | Sim |
| E-mail de confirmação ao indicado | Template editável | Sim |

### 6.4 Regras de Negócio

- O link de indicação é único por aluno e não expira por padrão (configurável)
- Um indicado só pode ser vinculado a um único indicador (primeiro a indicar vence)
- O desconto é aplicado automaticamente na próxima cobrança após confirmação da matrícula do indicado
- O admin pode aprovar manualmente a conversão antes do desconto ser liberado (configurável: automático ou manual)
- Desconto não é transferível nem cumulativo entre alunos
- O histórico de indicações fica disponível no painel do aluno e do admin

### 6.5 Painel do Aluno (portal simplificado)

Acesso via link enviado por e-mail (magic link) ou cadastro com CPF/e-mail:
- Resumo: "Você indicou X pessoas. Desconto acumulado: Y%"
- Status de cada indicação: Pendente / Matriculado / Expirado
- Botão de compartilhamento rápido (WhatsApp, copiar link)
- Histórico de descontos aplicados nas mensalidades

---

## 7. Modelo de Dados (Banco PostgreSQL)

```sql
-- Principais entidades

users (id, name, email, phone, cpf, role, password_hash, created_at)
-- role: admin | student | consultant

courses (id, title, slug, description, syllabus, type, modality,
         workload, price, max_installments, area, partner_institution,
         is_active, is_featured, cover_image_url, created_at)
-- type: livre | pos_presencial | pos_online | preparatorio | internacional

course_classes (id, course_id, start_date, end_date, vacancies,
                available_vacancies, status)

leads (id, name, email, phone, course_id, source, referral_code,
       status, created_at, notes)

enrollments (id, student_id, course_id, class_id, status,
             base_price, discount_amount, discount_origin,
             enrolled_at)

referral_codes (id, student_id, code, created_at, expires_at, is_active)

referrals (id, referral_code_id, lead_id, enrollment_id,
           status, discount_applied, created_at, converted_at)
-- status: pending | converted | expired

referral_settings (id, is_active, discount_type, discount_value,
                   max_discount_percent, is_cumulative, eligible_course_types,
                   auto_approve, link_expiry_days, updated_at)

blog_posts (id, title, slug, content, excerpt, category, tags,
            cover_image_url, is_published, published_at, author_id)

certificates (id, student_id, course_id, issued_at, verification_code)

ebooks (id, title, description, price, file_url, cover_url, is_active)
```

---

## 8. Integrações Externas

| Serviço | Finalidade | Prioridade |
|---|---|---|
| WhatsApp (Evolution API) | Agente Isis + notificações | Alta |
| Brevo / SendGrid | Disparo de e-mails transacionais | Alta |
| Mercado Pago ou Asaas | Pagamento de inscrições e mensalidades | Alta |
| Google Analytics 4 | Análise de tráfego | Média |
| Meta Pixel | Campanhas pagas | Média |
| AVA (Moodle isentidos.net.br) | SSO ou link direto para área do aluno | Média |
| Cloudflare R2 | Armazenamento de imagens e arquivos | Alta |
| SIGA (Enber University) | Link externo de matrícula internacional | Baixa |

---

## 9. Requisitos Não-Funcionais

- **Performance:** Páginas públicas com SSR para tempo de carregamento < 2s e indexação completa no Google
- **SEO:** Sitemap.xml automático, canonical tags, Open Graph para cada curso e artigo
- **LGPD:** Consentimento de cookies, política de privacidade, exclusão de dados pelo usuário
- **Acessibilidade:** Mínimo WCAG 2.1 nível AA (relevante para o público-alvo da Educação Especial)
- **Segurança:** Rate limiting, sanitização de inputs, HTTPS obrigatório, variáveis de ambiente para credenciais
- **Escalabilidade:** Estrutura modular para adicionar novos tipos de curso ou integrações sem refatoração

---

## 10. Identidade Visual (diretrizes para o dev)

Paleta atual do Instituto Sentidos:
- Azul escuro (navy): `#0D1B3E`
- Laranja: `#F26522`
- Azul médio: `#1A6EBD`
- Branco: `#FFFFFF`
- Cinza claro (fundos): `#F5F5F5`

Manter a identidade visual já estabelecida. O painel admin pode adotar uma paleta mais neutra (cinza escuro + laranja como acento).

---

## 11. Fases de Desenvolvimento

### Fase 1 — MVP (8-10 semanas)
- [ ] Configuração do projeto Node.js + PostgreSQL + Prisma
- [ ] Site público: Home, Listagem de Cursos, Página de Curso, Pré-matrícula, Institucional
- [ ] Captura de leads com notificação por e-mail e WhatsApp
- [ ] Painel Admin: Gestão de Cursos e Leads
- [ ] SEO básico + sitemap + Google Analytics
- [ ] Deploy em VPS com domínio isentidos.com.br

### Fase 2 — Programa de Indicação (3-4 semanas após Fase 1)
- [ ] Módulo de Indicação completo (geração de links, landing page, rastreamento)
- [ ] Painel do Aluno (magic link)
- [ ] Configurações do programa pelo Admin
- [ ] E-mails transacionais de indicação

### Fase 3 — Expansão (4-6 semanas após Fase 2)
- [ ] Blog com editor rico
- [ ] E-books (catálogo e compra)
- [ ] Validação de certificados
- [ ] Integração com gateway de pagamento
- [ ] Relatórios avançados no Admin

---

## 12. Critérios de Aceitação

- Site indexado no Google em até 30 dias após o go-live
- Formulários de leads gerando notificação no WhatsApp em < 1 minuto
- Links de indicação rastreando corretamente 100% das conversões no ambiente de testes
- Painel admin acessível em dispositivos móveis sem perda funcional
- Tempo de carregamento da Home < 2 segundos em conexão 4G (medido no Lighthouse)
- Score Lighthouse Performance > 80, Acessibilidade > 90

---

## 13. Fora do Escopo (desta versão)

- App mobile nativo
- Portal do aluno completo com progresso de curso (isso fica no AVA Moodle)
- Sistema de cobrança recorrente automatizado (fase futura)
- Área de transmissão ao vivo própria

---

*Documento elaborado com base na análise de isentidos.com.br, referência de estrutura bsspce.com.br e referência de programa de indicação vcindica.com.br.*
