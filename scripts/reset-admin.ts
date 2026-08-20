import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const email = args[0] || 'isentidosedu@gmail.com';
  const newPassword = args[1] || 'admin123';

  if (!email || !newPassword) {
    console.log('Uso: npx tsx scripts/reset-admin.ts <email> <nova_senha>');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: 'admin',
      passwordHash,
    },
    create: {
      name: 'Administrador',
      email,
      role: 'admin',
      passwordHash,
    },
  });

  console.log(`\n==================================================`);
  console.log(`✅ Sucesso! O usuário '${user.email}' agora é ADMIN.`);
  console.log(`🔑 Nova Senha definida: '${newPassword}'`);
  console.log(`==================================================\n`);
}

main()
  .catch((e) => {
    console.error('❌ Erro ao redefinir usuário admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
