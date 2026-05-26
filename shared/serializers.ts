import { ModalityType, CourseKindType, LeadStatusType, Course, Banner, BlogPost, Ebook, Event, Lead } from './types.js';

// HTML Sanitizer to prevent XSS
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  let sanitized = html;

  // 1. Remove script tags and their contents
  sanitized = sanitized.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '');

  // 2. Remove HTML comments
  sanitized = sanitized.replace(/<!--[\s\S]*?-->/g, '');

  // 3. Remove javascript: pseudo-protocol in attributes
  sanitized = sanitized.replace(/(href|src)\s*=\s*(['"])\s*javascript:[^'"]*['"]/gi, '$1="#"');

  // 4. Remove all event handlers (onclick, onload, onerror, onmouseover, etc. with any quote or brace style)
  sanitized = sanitized.replace(/\s+on[a-zA-Z]+\s*=\s*("[^"]*"|'[^']*'|{[^}]*}|[^\s>]*)/gi, '');

  // 5. Remove dangerous/suspicious iframes (allow only YouTube and Vimeo embeds)
  sanitized = sanitized.replace(/<iframe([^>]*)>([\s\S]*?)<\/iframe>/gi, (match, attrs) => {
    const isSafe = /src=["']https:\/\/(www\.youtube\.com\/embed\/|player\.vimeo\.com\/)/i.test(attrs);
    if (isSafe) {
      const safeAttrs = attrs.replace(/\s+on[a-zA-Z]+\s*=\s*("[^"]*"|'[^']*'|{[^}]*}|[^\s>]*)/gi, '');
      return `<iframe${safeAttrs}></iframe>`;
    }
    return ''; // Remove unsafe iframe
  });

  return sanitized;
}

// Modality normalization (retrocompatible)
export function mapDatabaseModality(m: string): ModalityType {
  const norm = String(m || '').trim().toLowerCase();
  if (norm === 'online_ao_vivo' || norm === 'ead' || norm === 'online') {
    return ModalityType.ONLINE;
  }
  if (norm === 'internacional' || norm === 'hibrido' || norm === 'hybrid') {
    return ModalityType.HYBRID;
  }
  return ModalityType.PRESENTIAL;
}

export function mapModalityToDatabase(m: ModalityType, type?: string): string {
  if (m === ModalityType.ONLINE) {
    const typeNorm = String(type || '').toLowerCase();
    if (typeNorm.includes('ead') || typeNorm.includes('mes') || typeNorm.includes('dou')) {
      return 'ead';
    }
    return 'online_ao_vivo';
  }
  if (m === ModalityType.HYBRID) {
    return 'internacional';
  }
  return 'presencial';
}

export function translateModality(m: ModalityType | string): string {
  if (m === ModalityType.ONLINE || m === 'ONLINE') return 'Online ao vivo';
  if (m === ModalityType.HYBRID || m === 'HYBRID') return 'Internacional';
  return 'Presencial';
}

function normalizeCourseTypeValue(value: string): string {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');
}

export function normalizeCourseTypeToDatabase(type: string | CourseKindType | undefined, modality: ModalityType = ModalityType.PRESENTIAL): string {
  const norm = normalizeCourseTypeValue(String(type || ''));
  if (['livre', 'curso_livre', 'free_course'].includes(norm)) return 'livre';
  if (['mestrado_ead', 'master_ead'].includes(norm) || norm.includes('mestrado')) return 'mestrado_ead';
  if (['doutorado_ead', 'doctorate_ead'].includes(norm) || norm.includes('doutorado')) return 'doutorado_ead';
  if (['pos_online', 'postgraduate_online', 'postgraduate_ead'].includes(norm)) return 'pos_online';
  if (['pos_presencial', 'pos', 'pos_graduacao', 'postgraduate', 'posgraduacao'].includes(norm)) {
    return modality === ModalityType.ONLINE ? 'pos_online' : 'pos_presencial';
  }
  return modality === ModalityType.ONLINE ? 'pos_online' : 'pos_presencial';
}

export function normalizeCourseTypeFromDatabase(type: string, modality: string = ''): CourseKindType {
  const norm = normalizeCourseTypeValue(type);
  if (['livre', 'curso_livre', 'free_course'].includes(norm)) return CourseKindType.LIBRE;
  if (['mestrado_ead', 'master_ead'].includes(norm) || norm.includes('mestrado')) return CourseKindType.MESTRADO;
  if (['doutorado_ead', 'doctorate_ead'].includes(norm) || norm.includes('doutorado')) return CourseKindType.DOUTORADO;
  return CourseKindType.POS;
}

// Course Kind normalization
export function mapDatabaseCourseType(type: string, modality: string): CourseKindType {
  return normalizeCourseTypeFromDatabase(type, modality);
}

export function mapCourseKindToDatabase(kind: CourseKindType, m: ModalityType): string {
  return normalizeCourseTypeToDatabase(kind, m);
}

// Lead Status normalization
export function mapDatabaseLeadStatus(s: string): LeadStatusType {
  const norm = String(s || '').toLowerCase();
  if (norm === 'novo') return LeadStatusType.NOVO;
  if (norm === 'em_atendimento') return LeadStatusType.EM_ATENDIMENTO;
  if (norm === 'matriculado') return LeadStatusType.MATRICULADO;
  return LeadStatusType.PERDIDO;
}

export function mapLeadStatusToDatabase(s: LeadStatusType): string {
  return s;
}

// Single Course Serializer
export function serializeCourse(c: any): Course {
  return {
    id: String(c.id),
    title: c.title || '',
    slug: c.slug || '',
    kind: mapDatabaseCourseType(c.type || '', c.modality || ''),
    modality: mapDatabaseModality(c.modality || ''),
    area: c.area || '',
    workload: c.workload || '',
    investment: c.price ? `R$ ${Number(c.price).toFixed(2)}` : 'Consulte',
    summary: c.description || '',
    featured: c.isFeatured ?? c.is_featured ?? false,
    active: c.isActive ?? c.is_active ?? true,
    videoUrl: c.videoUrl || '',
    about: sanitizeHtml(c.about || ''),
    benefits: c.benefits ? (typeof c.benefits === 'string' ? c.benefits : JSON.stringify(c.benefits, null, 2)) : '',
    modules: c.modules ? (typeof c.modules === 'string' ? c.modules : JSON.stringify(c.modules, null, 2)) : '',
    teachers: c.teachers ? (typeof c.teachers === 'string' ? c.teachers : JSON.stringify(c.teachers, null, 2)) : '',
    testimonials: c.testimonials ? (typeof c.testimonials === 'string' ? c.testimonials : JSON.stringify(c.testimonials, null, 2)) : '',
    enrollmentFee: c.enrollmentFee ? Number(c.enrollmentFee) : 0,
    installmentValue: c.installmentValue ? Number(c.installmentValue) : 0,
    maxInstallments: c.maxInstallments ? Number(c.maxInstallments) : 1,
    createdAt: c.createdAt || c.created_at || '',
    leadConnectorFormId: c.leadConnectorFormId || '',
    syllabus: sanitizeHtml(c.syllabus || ''),
    coverImageUrl: c.coverImageUrl || c.cover_image_url || '',
  };
}

// Single Banner Serializer
export function serializeBanner(b: any): Banner {
  return {
    id: String(b.id),
    title: b.title || '',
    subtitle: sanitizeHtml(b.subtitle || ''),
    ctaLabel: b.ctaLabel ?? b.cta_label ?? 'Saiba mais',
    ctaUrl: b.ctaUrl ?? b.cta_url ?? '#cursos',
    imageUrl: b.imageUrl ?? b.image_url ?? '',
    active: b.isActive ?? b.is_active ?? true,
  };
}

// Single BlogPost Serializer
export function serializeBlogPost(p: any): BlogPost {
  return {
    id: String(p.id),
    title: p.title || '',
    slug: p.slug || '',
    excerpt: p.excerpt || '',
    content: sanitizeHtml(p.content || ''),
    category: p.category || 'Geral',
    tags: p.tags || [],
    coverImageUrl: p.coverImageUrl ?? p.cover_image_url ?? '',
    published: p.isPublished ?? p.is_published ?? false,
    publishedAt: p.publishedAt || p.published_at || '',
  };
}

// Single Ebook Serializer
export function serializeEbook(e: any): Ebook {
  return {
    id: String(e.id),
    title: e.title || '',
    description: sanitizeHtml(e.description || ''),
    category: e.category || 'Livro Digital',
    coverUrl: e.coverUrl ?? e.cover_url ?? '',
    fileUrl: e.fileUrl ?? e.file_url ?? '',
    mauticFormId: e.mauticFormId ?? e.mautic_form_id ?? null,
    pages: e.pages || '',
    year: e.year || '',
    position: e.position ?? 0,
    active: e.isActive ?? e.is_active ?? true,
  };
}

// Single Event Serializer
export function serializeEvent(ev: any): Event {
  return {
    id: String(ev.id),
    title: ev.title || '',
    slug: ev.slug || '',
    description: sanitizeHtml(ev.description || ''),
    modality: mapDatabaseModality(ev.modality || ''),
    startsAt: ev.startsAt || ev.starts_at || null,
    price: ev.price ? Number(ev.price) : 0,
    coverUrl: ev.coverUrl ?? ev.cover_url ?? '',
    link: ev.link || '',
    active: ev.isActive ?? ev.is_active ?? true,
  };
}

// Single Lead Serializer
export function serializeLead(lead: any): Lead {
  return {
    id: String(lead.id),
    name: lead.name || '',
    email: lead.email || '',
    phone: lead.phone || '',
    interest: lead.course?.title ?? lead.notes ?? '',
    modality: mapDatabaseModality(lead.preferredFormat || lead.modality || ''),
    referralCode: lead.referralCode || null,
    status: mapDatabaseLeadStatus(lead.status || ''),
    origin: lead.source ?? 'Site',
    notes: sanitizeHtml(lead.notes || ''),
  };
}
