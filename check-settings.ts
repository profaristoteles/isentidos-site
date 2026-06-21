import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.systemSetting.findUnique({where: {id: 'default'}}).then(s => console.log(s)).finally(() => prisma.$disconnect());
