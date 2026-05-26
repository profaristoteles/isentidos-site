export enum ModalityType {
  ONLINE = 'ONLINE',
  PRESENTIAL = 'PRESENTIAL',
  HYBRID = 'HYBRID'
}

export enum CourseKindType {
  LIBRE = 'Curso Livre',
  POS = 'Pós-graduação',
  MESTRADO = 'Mestrado EAD',
  DOUTORADO = 'Doutorado EAD'
}

export enum UserRoleType {
  ADMIN = 'admin',
  STUDENT = 'student',
  CONSULTANT = 'consultant'
}

export enum LeadStatusType {
  NOVO = 'novo',
  EM_ATENDIMENTO = 'em_atendimento',
  MATRICULADO = 'matriculado',
  PERDIDO = 'perdido'
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  cpf?: string | null;
  role: UserRoleType;
  createdAt?: string;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  kind: CourseKindType;
  modality: ModalityType;
  area: string;
  workload: string;
  investment: string;
  summary: string;
  featured: boolean;
  active: boolean;
  videoUrl?: string;
  about?: string;
  benefits?: string;
  modules?: string;
  teachers?: string;
  testimonials?: string;
  enrollmentFee?: number;
  installmentValue?: number;
  maxInstallments?: number;
  createdAt?: string;
  leadConnectorFormId?: string;
  syllabus?: string;
  coverImageUrl?: string;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaUrl: string;
  imageUrl: string;
  active: boolean;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  coverImageUrl: string;
  published: boolean;
  publishedAt?: string;
}

export interface Ebook {
  id: string;
  title: string;
  description: string;
  category: string;
  coverUrl: string;
  fileUrl: string;
  mauticFormId?: number | null;
  pages?: string;
  year?: string;
  position: number;
  active: boolean;
}

export interface Event {
  id: string;
  title: string;
  slug: string;
  description: string;
  modality: ModalityType;
  startsAt?: string | null;
  price: number;
  coverUrl: string;
  link?: string;
  active: boolean;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  interest: string;
  modality: ModalityType;
  referralCode?: string | null;
  status: LeadStatusType;
  origin: string;
  notes?: string;
}
