import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deduplicateLeads() {
  console.log('=== INICIANDO SCRIPT DE DEDUPLICAÇÃO DE LEADS E CRIAÇÃO DO SENTINELA ===');

  // Passo 1: Garantir que o curso sentinela __no_course__ existe no banco
  console.log('\n1. Criando/Verificando curso sentinela "__no_course__"...');
  const sentinelCourse = await prisma.course.upsert({
    where: { id: '__no_course__' },
    update: { isSystemRecord: true, isActive: false },
    create: {
      id: '__no_course__',
      title: 'Contato Geral / Sem Curso',
      slug: 'contato-geral-sem-curso',
      description: 'Registro de sistema para leads sem curso específico',
      type: 'livre',
      modality: 'ead',
      workload: '0h',
      price: 0,
      area: 'Sistema',
      isActive: false,
      isSystemRecord: true,
    },
  });
  console.log('✔ Curso sentinela ok:', sentinelCourse.id, '-', sentinelCourse.title);

  // Passo 2: Converter leads com courseId NULL para __no_course__
  console.log('\n2. Convertendo leads com courseId nulo para "__no_course__"...');
  const nullUpdated = await prisma.lead.updateMany({
    where: { courseId: null },
    data: { courseId: '__no_course__' },
  });
  console.log(`✔ ${nullUpdated.count} leads sem curso foram vinculados ao sentinela "__no_course__".`);

  // Passo 3: Buscar todos os leads para identificar duplicidades por (courseId, email lowercased)
  console.log('\n3. Identificando e consolidando grupos duplicados (courseId + email)...');
  const allLeads = await prisma.lead.findMany({
    orderBy: { createdAt: 'desc' },
  });

  // Agrupar leads por chave (courseId:email)
  const leadGroups = new Map<string, typeof allLeads>();
  for (const lead of allLeads) {
    const key = `${lead.courseId}:${lead.email.toLowerCase().trim()}`;
    if (!leadGroups.has(key)) {
      leadGroups.set(key, []);
    }
    leadGroups.get(key)!.push(lead);
  }

  let totalDuplicatedGroups = 0;
  let totalRemovedLeads = 0;

  for (const [key, leads] of leadGroups.entries()) {
    if (leads.length <= 1) continue;

    totalDuplicatedGroups++;
    const [leadToKeep, ...duplicates] = leads; // O primeiro é o mais recente por conta do orderBy

    console.log(`\nConsolidando grupo '${key}' com ${leads.length} registros...`);
    console.log(`  -> Mantendo o lead mais recente ID ${leadToKeep.id} (Criado em ${leadToKeep.createdAt.toISOString()})`);

    let mergedConsent = leadToKeep.consentLgpd;
    let combinedNotes = leadToKeep.notes || '';

    for (const dup of duplicates) {
      console.log(`  -> Removendo duplicado antigo ID ${dup.id}...`);

      // Regra de OR Lógico para consentLgpd
      if (dup.consentLgpd) {
        mergedConsent = true;
      }

      // Combinar observações se existirem
      if (dup.notes && !combinedNotes.includes(dup.notes)) {
        combinedNotes = combinedNotes ? `${combinedNotes} | ${dup.notes}` : dup.notes;
      }

      // Reassociar indicações (referrals) para o lead mantido
      await prisma.referral.updateMany({
        where: { leadId: dup.id },
        data: { leadId: leadToKeep.id },
      });

      // Excluir o lead duplicado antigo
      await prisma.lead.delete({
        where: { id: dup.id },
      });

      totalRemovedLeads++;
    }

    // Atualizar o lead mantido com consentLgpd unificado e notas combinadas
    await prisma.lead.update({
      where: { id: leadToKeep.id },
      data: {
        consentLgpd: mergedConsent,
        notes: combinedNotes || null,
      },
    });
  }

  console.log(`\n=== DEDUPLICAÇÃO CONCLUÍDA ===`);
  console.log(`Grupos duplicados encontrados: ${totalDuplicatedGroups}`);
  console.log(`Total de registros duplicados removidos: ${totalRemovedLeads}`);
}

deduplicateLeads()
  .catch((e) => {
    console.error('Erro na deduplicação de leads:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
