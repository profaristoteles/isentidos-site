import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.lead.findMany({orderBy:{createdAt:'desc'}, take: 5}).then(l => console.log(l)).finally(() => prisma.$disconnect());
