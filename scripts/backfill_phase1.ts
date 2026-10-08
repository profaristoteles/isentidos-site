import { PrismaClient, FunnelStatus } from '@prisma/client';

const prisma = new PrismaClient();

function normalizePhone(phone: string): string {
  let cleanNumber = String(phone || '').replace(/\D/g, '');
  if (cleanNumber.length >= 10 && !cleanNumber.startsWith('55')) {
    cleanNumber = '55' + cleanNumber;
  }
  return cleanNumber;
}

async function main() {
  console.log('--- Starting Fase 1 Backfill ---');

  // 1. Configure Pilot Courses
  console.log('\nConfiguring Pilot 1 (Presencial)...');
  const p1 = await prisma.course.updateMany({
    where: { slug: 'pos-graduacao-em-educacao-infantil-e-anos-iniciais-do-ensino-fundamental' },
    data: {
      courseCode: 'POS-EI-PRES',
      minStudentsToConfirm: 15,
      lowAvailabilityThreshold: 5,
      showCohortProgress: true,
      eyebrow: 'Pós-Graduação Presencial — Caxias-MA',
      ctaPrimaryText: 'Fazer Pré-Matrícula Gratuita',
      ctaSecondaryText: 'Falar com Consultor no WhatsApp'
    }
  });
  console.log(`Pilot 1 updated: ${p1.count} record(s)`);

  console.log('\nConfiguring Pilot 2 (Online ao Vivo)...');
  const p2 = await prisma.course.updateMany({
    where: { slug: 'pos-graduacao-em-atendimento-educacional-especializado-aee-2' },
    data: {
      courseCode: 'POS-AEE-LIVE',
      minStudentsToConfirm: 15,
      lowAvailabilityThreshold: 5,
      showCohortProgress: true,
      eyebrow: 'Pós-Graduação Ao Vivo — Aulas em Tempo Real',
      ctaPrimaryText: 'Fazer Pré-Matrícula Gratuita',
      ctaSecondaryText: 'Tirar Dúvidas no WhatsApp'
    }
  });
  console.log(`Pilot 2 updated: ${p2.count} record(s)`);

  // 2. Backfill Contacts & Leads
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: 'asc' }
  });
  console.log(`\nFound ${leads.length} leads to backfill.`);

  let createdContacts = 0;
  let linkedLeads = 0;

  for (const lead of leads) {
    const phoneNorm = normalizePhone(lead.phone);
    const emailNorm = lead.email ? lead.email.toLowerCase().trim() : null;

    // Search existing contact by normalized phone first
    let contact = await prisma.contact.findFirst({
      where: { phoneNormalized: phoneNorm }
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          name: lead.name.trim(),
          email: emailNorm,
          phone: lead.phone.trim(),
          phoneNormalized: phoneNorm,
          notes: 'Migrado automaticamente na Fase 1'
        }
      });
      createdContacts++;
    }

    // Map lead status to FunnelStatus
    let targetFunnelStatus: FunnelStatus = FunnelStatus.NEW;
    if (lead.status === 'matriculado') {
      targetFunnelStatus = FunnelStatus.STUDENT;
    } else if (lead.status === 'perdido') {
      targetFunnelStatus = FunnelStatus.DROPPED;
    } else if (lead.status === 'em_atendimento') {
      targetFunnelStatus = FunnelStatus.CONTACTED;
    } else {
      targetFunnelStatus = FunnelStatus.NEW;
    }

    // Update lead
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        contactId: contact.id,
        funnelStatus: targetFunnelStatus
      }
    });
    linkedLeads++;

    // Add status history record if none exists
    const historyCount = await prisma.leadStatusHistory.count({
      where: { leadId: lead.id }
    });
    if (historyCount === 0) {
      await prisma.leadStatusHistory.create({
        data: {
          leadId: lead.id,
          fromStatus: null,
          toStatus: targetFunnelStatus,
          reason: 'Backfill inicial Fase 1',
          changedBy: 'system_migration'
        }
      });
    }
  }

  console.log(`\nBackfill Summary:`);
  console.log(`- Total Leads Processed: ${linkedLeads}`);
  console.log(`- Contacts Created: ${createdContacts}`);

  const totalContacts = await prisma.contact.count();
  const leadsWithContact = await prisma.lead.count({ where: { contactId: { not: null } } });
  console.log(`- Total Contacts in DB: ${totalContacts}`);
  console.log(`- Leads with linked Contact: ${leadsWithContact} / ${leads.length}`);

  console.log('\n--- Fase 1 Backfill Complete Successfully ---');
}

main()
  .catch((e) => {
    console.error('Error in backfill:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
