export enum ModalityType {
  ONLINE = 'ONLINE',
  PRESENTIAL = 'PRESENTIAL',
  HYBRID = 'HYBRID'
}

export enum CourseKindType {
  LIBRE = 'Curso Livre',
  POS = 'Pós-graduação',
  MESTRADO = 'Mestrado EAD',
  DOUTORADO = 'Doutorado EAD',
  PREPARATORIO = 'Preparatório ISP',
  SUPLETIVO_EJA = 'Supletivo EJA'
}

export interface ReferralCodeData {
  id: string;
  code: string;
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  pixKey?: string | null;
  pixKeyType?: string | null;
  createdAt?: string;
}

export interface ReferralData {
  id: string;
  leadName: string;
  leadEmail?: string;
  courseTitle?: string;
  courseType?: string;
  status: string;
  pixRewardValue: number;
  pixStatus: 'pending' | 'approved' | 'capped' | 'paid' | 'rejected';
  pixPaidAt?: string | null;
  pixPaymentProof?: string | null;
  createdAt: string;
}

export interface ReferralSettingsData {
  id?: string;
  isActive: boolean;
  rewardType: 'pix' | 'desconto';
  pixRewardByCategory: Record<string, number>;
  monthlyPixCap: number;
  discountType?: string;
  discountValue?: number;
  eligibleCourseTypes: string[];
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
  mauticFormId?: number | null;
  isSystemRecord?: boolean;
  interestedCount?: number;
}

export interface CourseInterestedStatsData {
  courseId: string;
  title: string;
  category: string;
  kind: string;
  modality: string;
  totalLeads: number;
  lastInterestAt?: string | null;
  isSystemRecord?: boolean;
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



export interface ReferralCodeData {
  id: string;
  studentId: string;
  code: string;
  pixKey?: string | null;
  pixKeyType?: string | null;
  isActive: boolean;
}

export interface ReferralData {
  id: string;
  referralCodeId: string;
  leadId?: string | null;
  status: string;
  pixRewardValue: number;
  pixStatus: 'pending' | 'approved' | 'capped' | 'paid' | 'rejected';
  pixPaidAt?: string | null;
  pixPaymentProof?: string | null;
  createdAt: string;
}

