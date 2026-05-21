import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const courses = await prisma.course.findMany();
  console.log(`Found ${courses.length} courses in database!`);
  for (const c of courses) {
    console.log(` - [${c.type}] ${c.title} (${c.slug}): Modality: ${c.modality}, Price: ${c.price}, workload: ${c.workload}`);
  }
}

run()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    prisma.$disconnect();
  });
