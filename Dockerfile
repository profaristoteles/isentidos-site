# Stage 1: Build base
FROM node:20-alpine AS builder
WORKDIR /app

# Copia dependências e schema prisma
COPY package*.json ./
COPY prisma ./prisma/

# Instala todas as dependências (incluindo devDependencies)
RUN npm ci

# Copia todos os fontes
COPY . .

# Compila o frontend e o backend
RUN npm run build:all

# Gera o cliente Prisma explicitamente
RUN npx prisma generate

# Remove dependências de desenvolvimento para economizar espaço
RUN npm prune --production

# Stage 2: Runtime
FROM node:20-alpine AS runner
WORKDIR /app

# Define ambiente de produção
ENV NODE_ENV=production
ENV PORT=4000

# Copia os arquivos necessários do builder
COPY package*.json ./
COPY prisma ./prisma/
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server-dist ./server-dist
COPY --from=builder /app/node_modules ./node_modules

# Garante que a pasta de uploads local exista para os arquivos estáticos de upload
RUN mkdir -p public/uploads

# Expõe a porta interna da aplicação
EXPOSE 4000

# Executa a sincronização do banco (cria tabelas) e inicia a API Express
CMD npx prisma db push --accept-data-loss && npm run start

