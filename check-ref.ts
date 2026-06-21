import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.referralCode.findMany({orderBy:{createdAt:'desc'}, take: 2, include: {student: true}}).then(l => console.log(l)).finally(() => prisma.$disconnect());
