import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import {
  Award,
  AlertCircle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileText,
  Gift,
  GraduationCap,
  ImagePlus,
  LayoutDashboard,
  LibraryBig,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Newspaper,
  Pencil,
  Phone,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Users,
  X,
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  Twitter,
  Eye,
  EyeOff,
} from 'lucide-react';

import AccessibilityWidget from './components/AccessibilityWidget';
import RichTextEditor from './components/RichTextEditor';

// ── Error Boundary ────────────────────────────────────────────────────────────
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-navy text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-2xl w-full rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-md">
            <X className="mx-auto h-12 w-12 text-orange-primary mb-4" />
            <h1 className="font-display text-2xl font-bold mb-2">Ops! Algo deu errado.</h1>
            <p className="text-white/70 text-sm mb-6">
              Ocorreu um erro inesperado nesta página. Nós já fomos notificados e estamos trabalhando para corrigir.
            </p>
            {import.meta.env.DEV && (
              <div className="mb-6 text-left bg-black/30 p-4 rounded-lg overflow-auto text-xs text-red-300 font-mono">
                <p className="font-bold mb-2">{this.state.error?.toString()}</p>
                <pre>{this.state.error?.stack}</pre>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl bg-orange-primary px-6 py-3 font-bold text-white transition hover:bg-orange-600 shadow-md shadow-orange-primary/20"
            >
              Recarregar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ── Types & Shared Imports ───────────────────────────────────────────────────
import { ModalityType, CourseKindType, LeadStatusType } from '../shared/types';
import type { Course, Banner, BlogPost, Ebook, Event, Lead } from '../shared/types';
import {
  sanitizeHtml,
  mapDatabaseModality,
  mapModalityToDatabase,
  translateModality,
  mapDatabaseCourseType,
  normalizeCourseTypeToDatabase,
  mapDatabaseLeadStatus,
  mapLeadStatusToDatabase,
  serializeCourse,
  serializeBanner,
  serializeBlogPost,
  serializeEbook,
  serializeEvent,
  serializeLead
} from '../shared/serializers';

export type CourseKind = 'Curso Livre' | 'Pós-graduação' | 'Mestrado EAD' | 'Doutorado EAD';
export type Modality = 'Presencial' | 'Online ao vivo' | 'EAD';
export type LeadStatus = 'Novo' | 'Em atendimento' | 'Matriculado' | 'Perdido';

export interface EventItem extends Event {
  date?: string;
}

interface ReferralCode {
  id: number | string;
  code: string;
  studentName: string;
  studentEmail: string;
  conversions: number;
  isActive: boolean;
}

export function parseModalityUI(value: string): ModalityType {
  const norm = String(value || '').trim().toLowerCase();
  if (norm === 'online ao vivo' || norm === 'ead' || norm === 'online' || norm === 'online_ao_vivo') {
    return ModalityType.ONLINE;
  }
  if (norm === 'internacional' || norm === 'hibrido' || norm === 'hybrid') {
    return ModalityType.HYBRID;
  }
  return ModalityType.PRESENTIAL;
}

export function getModalityLabel(modality: ModalityType, kind?: string): string {
  if (modality === ModalityType.ONLINE) {
    if (kind?.toLowerCase().includes('ead') || kind?.toLowerCase().includes('mestrado') || kind?.toLowerCase().includes('doutorado')) {
      return 'EAD';
    }
    return 'Online ao vivo';
  }
  if (modality === ModalityType.HYBRID) return 'Internacional';
  return 'Presencial';
}

// ── Constants ─────────────────────────────────────────────────────────────────

const WHATSAPP =
  'https://wa.me/5599319993940?text=Ol%C3%A1%2C%20quero%20saber%20mais%20sobre%20os%20cursos%20do%20Instituto%20Sentidos.';

const SITE_LOGO = '/logo-isentidos-laranja.png';

const initialBanners: Banner[] = [];
const initialCourses: Course[] = [];
const initialLeads: Lead[] = [];
const initialPosts: BlogPost[] = [];
const initialEbooks: Ebook[] = [];
const initialEvents: EventItem[] = [];

const courseKinds: Array<'Todos' | CourseKind> = ['Todos', 'Curso Livre', 'Pós-graduação', 'Mestrado EAD', 'Doutorado EAD'];
const modalities: Array<'Todos' | Modality> = ['Todos', 'Presencial', 'Online ao vivo', 'EAD'];

const navItems = [
  ['Cursos', '/cursos'],
  ['Blog', '/blog'],
  ['E-books', '/ebooks'],
  ['Eventos', '/eventos'],
  ['Cadastro de Indicador', '/indique-e-ganhe'],
  ['Contato', '/#contato'],
];

interface PublicSettings {
  whatsapp: string;
  siteName: string;
  domain?: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  youtube?: string;
  twitter?: string;
}

const defaultPublicSettings: PublicSettings = {
  whatsapp: '(99) 3199-93940',
  siteName: 'Instituto Sentidos',
  domain: 'isentidos.com.br',
  instagram: '',
  facebook: '',
  linkedin: '',
  youtube: '',
  twitter: '',
};

const renderSocialIcons = (settings: PublicSettings, className = "flex items-center gap-3", iconClass = "text-white/70 hover:text-white transition-colors") => {
  const icons = [
    { key: 'instagram', url: settings.instagram, icon: Instagram, color: 'hover:text-pink-500' },
    { key: 'facebook', url: settings.facebook, icon: Facebook, color: 'hover:text-blue-600' },
    { key: 'linkedin', url: settings.linkedin, icon: Linkedin, color: 'hover:text-blue-500' },
    { key: 'youtube', url: settings.youtube, icon: Youtube, color: 'hover:text-red-600' },
    { key: 'twitter', url: settings.twitter, icon: Twitter, color: 'hover:text-sky-400' },
  ];

  const activeIcons = icons.filter(i => i.url);
  if (activeIcons.length === 0) return null;

  return (
    <div className={className}>
      {activeIcons.map(({ key, url, icon: Icon, color }) => (
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`${iconClass} ${color}`}
          aria-label={key}
        >
          <Icon className="h-5 w-5" />
        </a>
      ))}
    </div>
  );
};

function buildWhatsappUrl(value?: string, text = 'Ola, quero saber mais sobre o Instituto Sentidos.') {
  if (!value) return WHATSAPP;
  if (/^https?:\/\//i.test(value)) return value;
  const digits = value.replace(/\D/g, '');
  const phone = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

function defaultMenuItems() {
  return navItems.map(([label, href], index) => ({
    id: `default-${index}`,
    label,
    href,
    isButton: false,
    isActive: true,
    position: index,
  }));
}

const MobileSubmenu: ComponentType<{ item: any; setMenuOpen: (o: boolean) => void }> = ({ item, setMenuOpen }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between py-2 text-left text-lg font-semibold text-navy focus:outline-none"
      >
        <span>{item.label}</span>
        <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="ml-4 flex flex-col gap-3 border-l-2 border-slate-100 pl-4 py-2">
          {item.children.map((child: any) => (
            <a
              key={child.id}
              href={child.href}
              onClick={() => setMenuOpen(false)}
              className="text-base text-slate-600 hover:text-orange-primary transition-colors"
            >
              {child.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [settings, setSettings] = useState<PublicSettings>(defaultPublicSettings);

  useEffect(() => {
    fetch('/api/site-content')
      .then((r) => r.json())
      .then((data) => {
        const items = data.data?.menuItems || data.menuItems;
        const fetchedSettings = data.data?.settings || data.settings;
        if (fetchedSettings) setSettings({ ...defaultPublicSettings, ...fetchedSettings });
        setMenuItems(items?.length ? items : defaultMenuItems());
      })
      .catch(() => {
        setMenuItems(defaultMenuItems());
      });
  }, []);

  const rootItems = useMemo(() => {
    const roots = menuItems.filter((item) => item.isActive && !item.isButton && !item.parentId);
    return roots.map((root) => ({
      ...root,
      children: menuItems.filter((child) => child.isActive && !child.isButton && child.parentId === root.id),
    }));
  }, [menuItems]);

  const buttonItems = useMemo(() => {
    return menuItems.filter((item) => item.isActive && item.isButton);
  }, [menuItems]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-navy text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-8">
          <a href="/" className="flex items-center gap-3">
            <img src={SITE_LOGO} alt={settings.siteName} className="h-11 w-auto max-w-[220px] object-contain" />
          </a>
          <nav className="hidden items-center gap-7 lg:flex">
            {rootItems.map((item) => {
              if (item.children && item.children.length > 0) {
                return (
                  <div key={item.id} className="group relative py-2">
                    <button className="flex items-center gap-1 text-sm font-semibold text-white/80 transition hover:text-orange-primary focus:outline-none">
                      {item.label}
                      <ChevronDown className="h-4 w-4 transition-transform duration-200 group-hover:rotate-180" />
                    </button>
                    <div className="invisible absolute left-0 top-full z-50 mt-1 w-48 origin-top-left rounded-lg bg-navy border border-white/10 p-2 opacity-0 shadow-xl transition-all duration-200 group-hover:visible group-hover:opacity-100">
                      {item.children.map((child: any) => (
                        <a
                          key={child.id}
                          href={child.href}
                          className="block rounded-md px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-orange-primary hover:text-white"
                        >
                          {child.label}
                        </a>
                      ))}
                    </div>
                  </div>
                );
              }
              return (
                <a key={item.id} href={item.href} className="text-sm font-semibold text-white/80 transition hover:text-orange-primary">{item.label}</a>
              );
            })}
          </nav>
          <div className="hidden items-center gap-3 lg:flex">
            {renderSocialIcons(settings, "flex items-center gap-3 mr-4 border-r border-white/20 pr-4", "text-white/70 hover:text-white transition-colors")}
            {buttonItems.map((item) => (
              <a key={item.id} href={item.href} className="rounded-lg bg-orange-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600">{item.label}</a>
            ))}
          </div>
          <button className="rounded-lg p-2 lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Abrir menu"><Menu /></button>
        </div>
      </header>
      {menuOpen && (
        <div className="fixed inset-0 z-[60] bg-white p-5 text-navy lg:hidden flex flex-col justify-between">
          <div>
            <div className="mb-10 flex items-center justify-between">
              <strong className="font-display text-xl">Instituto Sentidos</strong>
              <button onClick={() => setMenuOpen(false)} className="rounded-lg p-2" aria-label="Fechar menu"><X /></button>
            </div>
            <div className="flex flex-col gap-5 text-lg font-semibold">
              {rootItems.map((item) => {
                if (item.children && item.children.length > 0) {
                  return <MobileSubmenu key={item.id} item={item} setMenuOpen={setMenuOpen} />;
                }
                return (
                  <a key={item.id} href={item.href} onClick={() => setMenuOpen(false)}>{item.label}</a>
                );
              })}
              {buttonItems.map((item) => (
                <a key={item.id} href={item.href} onClick={() => setMenuOpen(false)} className="text-orange-primary">{item.label}</a>
              ))}
            </div>
          </div>
          <div className="pt-6 border-t border-slate-100 flex flex-col gap-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Redes Sociais</span>
            {renderSocialIcons(settings, "flex items-center gap-5 text-navy/70", "text-navy/70 hover:text-navy transition-colors")}
          </div>
        </div>
      )}
    </>
  );
}

function SiteFooter() {
  const [settings, setSettings] = useState<PublicSettings>(defaultPublicSettings);

  useEffect(() => {
    fetch('/api/site-content')
      .then((r) => r.json())
      .then((data) => {
        const fetchedSettings = data.data?.settings || data.settings;
        if (fetchedSettings) setSettings({ ...defaultPublicSettings, ...fetchedSettings });
      })
      .catch(() => {});
  }, []);

  const whatsappUrl = buildWhatsappUrl(settings.whatsapp);

  return (
    <footer className="bg-navy py-10 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <img src={SITE_LOGO} alt={settings.siteName} className="h-10 w-auto max-w-[220px] object-contain" />
          <p className="mt-2 text-sm text-white/55">© {new Date().getFullYear()} {settings.siteName}. CNPJ 28.335.828/0001-10.</p>
          <div className="mt-2 flex gap-4 text-xs text-white/55">
            <a href="/politica-de-privacidade" className="hover:text-orange-primary hover:underline transition">Política de Privacidade</a>
            <span>•</span>
            <a href="/termos-de-uso" className="hover:text-orange-primary hover:underline transition">Termos de Uso</a>
          </div>
        </div>
        {renderSocialIcons(settings, "flex items-center gap-4 py-2 border-y border-white/10 lg:border-none lg:py-0")}

        <div className="flex flex-col gap-3 text-sm text-white/70 sm:flex-row sm:items-center">
          <span className="inline-flex items-center gap-2"><Phone className="h-4 w-4 text-orange-primary" /> {settings.whatsapp}</span>
          <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-orange-primary" /> Caxias, MA</span>
          <a className="inline-flex items-center gap-2 text-green-300 transition hover:text-green-400" href={whatsappUrl}><MessageCircle className="h-4 w-4" /> WhatsApp</a>
        </div>
      </div>
    </footer>
  );
}

// ── Public site ───────────────────────────────────────────────────────────────
// ── Public site ───────────────────────────────────────────────────────────────

function PublicSite() {
  const [banners, setBanners] = useState<Banner[]>(initialBanners);
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [posts, setPosts] = useState<BlogPost[]>(initialPosts);
  const [ebooks, setEbooks] = useState<Ebook[]>(initialEbooks);
  const [events, setEvents] = useState<EventItem[]>(initialEvents);
  const [publicSettings, setPublicSettings] = useState<PublicSettings>(defaultPublicSettings);

  const [leadMessage, setLeadMessage] = useState('');
  const [kindFilter, setKindFilter] = useState('Todos');
  const [modalityFilter, setModalityFilter] = useState('Todos');
  const [query, setQuery] = useState('');
  const [preEnrollInterest, setPreEnrollInterest] = useState('');

  // Rotating banner state
  const activeBanners = banners.filter((b) => b.active);
  const [bannerIdx, setBannerIdx] = useState(0);

  useEffect(() => {
    fetch('/api/site-content')
      .then((r) => r.json())
      .then(({ data }) => {
        if (data?.banners?.length) setBanners(data.banners.map(mapApiBanner));
        if (data?.courses?.length) setCourses(data.courses.map(mapApiCourse));
        if (data?.posts?.length) setPosts(data.posts.map((p: any) => ({ id: p.id, title: p.title, category: p.category, excerpt: p.excerpt, published: p.isPublished, publishedAt: p.publishedAt, slug: p.slug })));
        if (data?.ebooks?.length) setEbooks(data.ebooks.map((e: any) => ({ id: e.id, title: e.title, description: e.description, category: e.category ?? 'Livro Digital', coverUrl: e.coverUrl ?? '', mauticFormId: e.mauticFormId ?? null, pages: e.pages ?? '', year: e.year ?? '', position: e.position ?? 0, active: e.isActive })));
        if (data?.events?.length) setEvents(data.events.map((ev: any) => ({ id: String(ev.id), title: ev.title, modality: parseModalityUI(ev.modality), date: ev.startsAt ? new Date(ev.startsAt).toLocaleDateString('pt-BR') : '', description: ev.description, active: ev.isActive })));
        if (data?.settings) setPublicSettings({ ...defaultPublicSettings, ...data.settings });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const t = setInterval(() => setBannerIdx((i) => (i + 1) % activeBanners.length), 5000);
    return () => clearInterval(t);
  }, [activeBanners.length]);

  const heroFallback: Banner = {
    id: 'default-hero',
    title: 'Instituto Sentidos',
    subtitle: 'Formação continuada, pós-graduação, programas EAD e eventos de aperfeiçoamento.',
    ctaLabel: 'Ver cursos',
    ctaUrl: '#cursos',
    imageUrl: 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=1400&q=80',
    active: true
  };
  const hero = activeBanners[bannerIdx] ?? heroFallback;

  const activeCourses = courses.filter((c) => c.active);
  const currentInterest = preEnrollInterest || (activeCourses[0]?.title ?? '');
  const featuredCourses = [...activeCourses].sort((a, b) => Number(b.featured) - Number(a.featured)).slice(0, 3);
  const featuredEbooks = ebooks.filter((e) => e.active).slice(0, 3);
  const whatsappUrl = buildWhatsappUrl(publicSettings.whatsapp);

  const homeCourses = useMemo(() => {
    return [...courses]
      .filter((c) => c.active)
      .sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        const idA = Number(a.id) || 0;
        const idB = Number(b.id) || 0;
        return idB - idA;
      })
      .slice(0, 4);
  }, [courses]);

  const homePosts = useMemo(() => {
    return [...posts]
      .filter((p) => p.published)
      .sort((a, b) => {
        if (a.publishedAt && b.publishedAt) {
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        }
        const idA = Number(a.id) || 0;
        const idB = Number(b.id) || 0;
        return idB - idA;
      })
      .slice(0, 4);
  }, [posts]);

  const homeEvents = useMemo(() => {
    return [...events]
      .filter((e) => e.active)
      .slice(0, 4);
  }, [events]);

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      if (!c.active) return false;
      if (kindFilter !== 'Todos' && c.kind !== kindFilter) return false;
      if (modalityFilter !== 'Todos' && c.modality !== modalityFilter) return false;
      if (query.trim() !== '') {
        const q = query.toLowerCase();
        if (
          !(c.title?.toLowerCase().includes(q)) &&
          !(c.summary?.toLowerCase().includes(q)) &&
          !(c.area?.toLowerCase().includes(q))
        ) {
          return false;
        }
      }
      return true;
    });
  }, [courses, kindFilter, modalityFilter, query]);

  // detect referral code from URL search params
  const urlParams = new URLSearchParams(window.location.search);
  const referralCodeParam = urlParams.get('ref') ?? '';

  async function handleLeadSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLeadMessage('Recebemos sua solicitação. Um consultor entrará em contato pelo WhatsApp.');
    event.currentTarget.reset();
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: String(form.get('name')),
          email: String(form.get('email')),
          phone: String(form.get('phone')),
          courseSlug: slugify(String(form.get('interest'))),
          preferredFormat: String(form.get('modality')) === 'Online ao vivo' ? 'online_ao_vivo' : String(form.get('modality')) === 'Presencial' ? 'presencial' : undefined,
          source: 'site',
          referralCode: String(form.get('referralCode')) || undefined,
          notes: `Interesse: ${form.get('interest')} | Modalidade: ${form.get('modality')}`,
          consentLgpd: true,
        }),
      });
    } catch { /* continua sem API */ }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SiteHeader />
      <main>
        {/* ── Hero banner carousel ── */}
        <section className="relative overflow-hidden bg-navy text-white">
          {activeBanners.map((banner, idx) => (
            <div
              key={banner.id}
              className={`absolute inset-0 transition-opacity duration-700 ${idx === bannerIdx ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
            >
              <img src={banner.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />
              <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(13,27,62,.96),rgba(13,27,62,.72)),linear-gradient(70deg,rgba(242,101,34,.28),transparent_48%)]" />
            </div>
          ))}

          <div className="relative z-20 mx-auto grid max-w-7xl gap-12 px-4 py-16 lg:grid-cols-[1fr_.9fr] lg:px-8 lg:py-24">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-orange-primary/40 bg-orange-primary/10 px-4 py-2 text-sm font-bold text-orange-100">
                <Sparkles className="h-4 w-4 text-orange-primary" aria-hidden />
                Formação continuada, pós, programas EAD e eventos
              </span>
              <h1 className="mt-7 font-display text-4xl font-bold leading-tight md:text-6xl">{hero.title}</h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/78">{hero.subtitle}</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a href={hero.ctaUrl} className="rounded-lg bg-orange-primary px-7 py-4 text-center font-bold text-white transition hover:bg-orange-600">{hero.ctaLabel}</a>
                <a href="#prematricula" className="rounded-lg border border-white/25 px-7 py-4 text-center font-bold text-white transition hover:bg-white/10">Fazer pré-matrícula</a>
              </div>

              {/* Carousel dots */}
              {activeBanners.length > 1 && (
                <div className="mt-8 flex items-center gap-3">
                  <button onClick={() => setBannerIdx((i) => (i - 1 + activeBanners.length) % activeBanners.length)} className="rounded-full border border-white/30 p-2 transition hover:bg-white/10" aria-label="Banner anterior">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {activeBanners.map((_, i) => (
                    <button key={i} onClick={() => setBannerIdx(i)} className={`h-2 rounded-full transition-all ${i === bannerIdx ? 'w-8 bg-orange-primary' : 'w-2 bg-white/30'}`} aria-label={`Banner ${i + 1}`} />
                  ))}
                  <button onClick={() => setBannerIdx((i) => (i + 1) % activeBanners.length)} className="rounded-full border border-white/30 p-2 transition hover:bg-white/10" aria-label="Próximo banner">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="self-end rounded-lg bg-white p-5 text-navy shadow-2xl">
              <p className="text-sm font-bold uppercase tracking-wide text-orange-primary">Escolha o caminho ideal</p>
              <div className="mt-5 grid gap-3">
                <PathItem icon={GraduationCap} title="Pós-graduação lato sensu" text="Turmas presenciais e online ao vivo." />
                <PathItem icon={LibraryBig} title="Mestrado e Doutorado EAD" text="Programas acadêmicos com orientação consultiva." />
                <PathItem icon={CalendarDays} title="Eventos e cursos livres" text="Aperfeiçoamento rápido, encontros e imersões." />
              </div>
            </div>
          </div>
        </section>

        <section id="cursos" className="bg-bg-light py-16">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <SectionHeader eyebrow="Cursos" title="Escolha o curso ideal para consolidar sua carreira" text="Explore nossas especializações e capacitações de curto e longo prazo desenvolvidas por especialistas." />
            
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {homeCourses.length > 0 ? (
                homeCourses.map((course) => (
                  <article key={course.id} className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft">
                    {course.coverImageUrl ? (
                      <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                        <img src={course.coverImageUrl} alt={course.title} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="relative h-44 w-full bg-gradient-to-br from-navy to-blue-action flex items-center justify-center">
                        <GraduationCap className="h-12 w-12 text-white/30" />
                      </div>
                    )}
                    <div className="p-5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="rounded-md bg-orange-primary/10 px-3 py-1 text-xs font-bold uppercase text-orange-primary">{course.kind}</span>
                        {course.featured && <Star className="h-5 w-5 fill-orange-primary text-orange-primary" aria-label="Destaque" />}
                      </div>
                      <h3 className="mt-4 font-display text-xl font-bold text-navy line-clamp-2 min-h-[3.5rem]">{course.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-slate-600 line-clamp-3">{course.summary}</p>
                    </div>
                    <div className="mt-auto px-5 pb-5 text-sm space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <InfoBlock label="Área" value={course.area} />
                        <InfoBlock label="Modalidade" value={getModalityLabel(course.modality, course.kind)} />
                      </div>
                      {course.installmentValue && course.installmentValue > 0 ? (
                        <div className="rounded-lg bg-slate-50 p-2 border border-slate-100/50">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">Investimento</span>
                          <div className="text-navy text-xs mt-0.5 leading-relaxed font-semibold">
                            {course.enrollmentFee && course.enrollmentFee > 0 && (
                              <span>Matrícula: <strong className="text-orange-primary">R$ {Number(course.enrollmentFee).toFixed(2)}</strong> + </span>
                            )}
                            <span><strong className="text-navy">{course.maxInstallments || 1}x</strong> de <strong className="text-navy font-bold text-sm">R$ {Number(course.installmentValue).toFixed(2)}</strong></span>
                          </div>
                        </div>
                      ) : (
                        <InfoBlock label="Investimento" value={course.investment} />
                      )}
                    </div>
                    <div className="flex gap-2 border-t border-slate-100 p-5 mt-2">
                      <a href={`/cursos/${course.slug}`} className="flex-1 rounded-lg bg-orange-primary px-3 py-2.5 text-center text-sm font-bold text-white transition hover:bg-orange-600">Ver detalhes</a>
                      <a href={WHATSAPP} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-bold text-navy transition hover:border-blue-action hover:text-blue-action">WhatsApp</a>
                    </div>
                  </article>
                ))
              ) : (
                <div className="col-span-full text-center py-12 bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
                  <GraduationCap className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-lg font-bold text-navy">Nenhum curso disponível no momento.</p>
                  <p className="text-slate-500 mt-2">Por favor, volte mais tarde ou entre em contato conosco.</p>
                </div>
              )}
            </div>

            <div className="mt-12 text-center">
              <a href="/cursos" className="inline-flex items-center gap-2 rounded-full bg-orange-primary px-8 py-4 text-center text-lg font-bold text-white shadow-lg shadow-orange-primary/30 transition hover:-translate-y-0.5 hover:bg-orange-600">
                Ver todos os cursos <ChevronRight className="h-5 w-5" />
              </a>
            </div>
          </div>
        </section>

        {/* Section: Academic Partners / Credenciamento */}
        <section id="parcerias" className="py-16 bg-white border-t border-b border-slate-100">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <SectionHeader 
              eyebrow="Credenciamento & Parcerias" 
              title="Instituições parceiras e certificadoras" 
              text="Nossos cursos de pós-graduação e programas stricto sensu são ofertados em cooperação técnica com instituições renomadas e devidamente regularizadas." 
            />
            
            <div className="mt-10 grid gap-8 md:grid-cols-2">
              {/* FAEPI Card */}
              <div className="rounded-3xl border border-slate-100 bg-bg-light p-8 shadow-sm transition-all hover:shadow-md flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-primary/10 text-orange-primary">
                      <Award className="h-6 w-6" />
                    </span>
                    <div>
                      <h3 className="font-display text-xl font-bold text-navy">FAEPI</h3>
                      <p className="text-xs text-slate-500 font-semibold uppercase">Faculdade de Educação do Piauí</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Parceira acadêmica autorizada do Instituto Sentidos na oferta de cursos de <strong>pós-graduação lato sensu (especializações)</strong> nas modalidades presencial e online ao vivo. Todos os certificados são emitidos pela FAEPI, instituição devidamente credenciada pelo Ministério da Educação (MEC).
                  </p>
                </div>
                <div className="mt-8 border-t border-slate-200/60 pt-6">
                  <a 
                    href="https://emec.mec.gov.br/emec/consulta-cadastro/detalhes-ies/d96957f455f6405d14c6542552b0f6eb/MjgyNw==" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="inline-flex items-center gap-2 text-sm font-bold text-orange-primary hover:text-orange-600 transition"
                  >
                    Verificar cadastro no e-MEC <ChevronRight className="h-4 w-4" />
                  </a>
                </div>
              </div>

              {/* Ivy Enber Card */}
              <div className="rounded-3xl border border-slate-100 bg-bg-light p-8 shadow-sm transition-all hover:shadow-md flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-action/10 text-blue-action">
                      <GraduationCap className="h-6 w-6" />
                    </span>
                    <div>
                      <h3 className="font-display text-xl font-bold text-navy">Ivy Enber University</h3>
                      <p className="text-xs text-slate-500 font-semibold uppercase">Parceria Internacional</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Parceira internacional na oferta de programas online de <strong>mestrado, doutorado e pós-doutorado</strong>. Os diplomas estrangeiros não possuem reconhecimento automático pelo MEC no Brasil; quando necessário, o reconhecimento de títulos de mestrado e doutorado deve ser solicitado pelo interessado por meio da <strong>Plataforma Carolina Bori</strong>, conforme as regras brasileiras aplicáveis.
                  </p>
                </div>
                <div className="mt-8 border-t border-slate-200/60 pt-6">
                  <a
                    href="https://carolinabori.mec.gov.br/?pagina=plataforma"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-bold text-blue-action hover:text-navy transition"
                  >
                    Consultar Plataforma Carolina Bori <ChevronRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="blog" className="py-16">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <SectionHeader eyebrow="Blog" title="Conteúdos para quem educa e inclui" text="Artigos para fortalecer autoridade, SEO e relacionamento com futuros alunos." />
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {homePosts.length > 0 ? (
                homePosts.map((post) => (
                  <article key={post.id} className="flex flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
                    <Newspaper className="h-7 w-7 text-orange-primary" aria-hidden />
                    <p className="mt-4 text-xs font-bold uppercase text-blue-action">{post.category}</p>
                    <h3 className="mt-2 font-display text-lg font-bold text-navy line-clamp-2 min-h-[3rem]">{post.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600 line-clamp-3 mb-4">{post.excerpt}</p>
                    <a href={`/blog/${post.slug}`} className="mt-auto inline-flex items-center gap-2 text-sm font-bold text-orange-primary transition hover:text-orange-600">
                      Ler artigo <ChevronRight className="h-4 w-4" />
                    </a>
                  </article>
                ))
              ) : (
                <div className="col-span-full text-center py-12 bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
                  <Newspaper className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-lg font-bold text-navy">Nenhuma postagem no blog disponível.</p>
                  <p className="text-slate-500 mt-2">Fique ligado, novidades serão publicadas em breve!</p>
                </div>
              )}
            </div>
            <div className="mt-12 text-center">
              <a href="/blog" className="inline-flex items-center gap-2 rounded-full border-2 border-orange-primary px-8 py-3.5 text-center text-base font-bold text-orange-primary hover:bg-orange-primary/10 transition hover:-translate-y-0.5">
                Ver todos os artigos <ChevronRight className="h-5 w-5" />
              </a>
            </div>
          </div>
        </section>

        <section id="ebooks" className="bg-bg-light py-16">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <SectionHeader eyebrow="E-books" title="Materiais para divulgar e capturar leads" text="Catálogo de e-books gratuitos ou pagos para fortalecer campanhas, captação e relacionamento." />
            
            <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {ebooks.filter((e) => e.active).slice(0, 3).map((ebook) => (
                <article key={ebook.id} className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
                  <div className={`relative flex h-64 items-center justify-center overflow-hidden bg-gradient-to-br ${
                    ebookCategoryGradients[ebook.category] || 'from-navy to-blue-action'
                  }`}>
                    {ebook.coverUrl ? (
                      <img
                        src={ebook.coverUrl}
                        alt={ebook.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <BookOpen className="h-16 w-16 text-white/40" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute left-3 top-3 rounded-full bg-black/40 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
                      {ebook.category}
                    </div>
                    <div className="absolute right-3 top-3 rounded-full bg-green-500 px-3 py-1 text-xs font-bold text-white shadow">
                      GRÁTIS
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="mb-3 font-display text-lg font-bold leading-snug text-navy line-clamp-2 min-h-[3rem]">
                      {ebook.title}
                    </h3>
                    <p className="mb-5 flex-1 text-sm leading-relaxed text-slate-600 line-clamp-3">
                      {ebook.description}
                    </p>
                    <a
                      href="/ebooks"
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-primary py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-orange-600 active:scale-95"
                    >
                      <Download className="h-4 w-4" />
                      Fazer Download Grátis
                    </a>
                  </div>
                </article>
              ))}
            </div>
            
            <div className="mt-12 text-center">
              <a href="/ebooks" className="inline-flex items-center gap-2 rounded-full border-2 border-orange-primary px-8 py-3.5 text-center text-base font-bold text-orange-primary hover:bg-orange-primary/10 transition hover:-translate-y-0.5">
                Ver todos os e-books <ChevronRight className="h-5 w-5" />
              </a>
            </div>
          </div>
        </section>

        <section id="eventos" className="py-16">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <SectionHeader eyebrow="Eventos" title="Encontros presenciais e online ao vivo" text="Aulas abertas, imersões e eventos de relacionamento para aproximar alunos e professores." />
            <div className="mt-8 grid gap-5 md:grid-cols-2">
              {homeEvents.length > 0 ? (
                homeEvents.map((ev) => (
                  <article key={ev.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase text-orange-primary">{translateModality(ev.modality)}</p>
                        <h3 className="mt-2 font-display text-2xl font-bold text-navy">{ev.title}</h3>
                      </div>
                      <CalendarDays className="h-8 w-8 text-blue-action" aria-hidden />
                    </div>
                    <p className="mt-4 text-slate-600">{ev.description}</p>
                    <p className="mt-5 font-bold text-navy">{ev.date}</p>
                  </article>
                ))
              ) : (
                <div className="col-span-full text-center py-12 bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
                  <CalendarDays className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-lg font-bold text-navy">Nenhum evento agendado no momento.</p>
                  <p className="text-slate-500 mt-2">Novos eventos e encontros presenciais ou virtuais serão anunciados aqui.</p>
                </div>
              )}
            </div>
            <div className="mt-12 text-center">
              <a href="/eventos" className="inline-flex items-center gap-2 rounded-full border-2 border-orange-primary px-8 py-3.5 text-center text-base font-bold text-orange-primary hover:bg-orange-primary/10 transition hover:-translate-y-0.5">
                Ver todos os eventos <ChevronRight className="h-5 w-5" />
              </a>
            </div>
          </div>
        </section>

        <section className="bg-navy py-16 text-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 lg:grid-cols-[.9fr_1.1fr] lg:px-8">
            <div>
              <SectionHeader dark eyebrow="Institucional" title="O conhecimento abre novas possibilidades" text="O Instituto Sentidos atua na formação de professores, gestores e profissionais que trabalham com educação, inclusão e desenvolvimento humano." />
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <DarkFeature icon={Award} title="Parceiros acadêmicos" />
                <DarkFeature icon={Users} title="Professores experientes" />
                <DarkFeature icon={ShieldCheck} title="Atendimento consultivo" />
              </div>
            </div>
            <form id="prematricula" onSubmit={handleLeadSubmit} className="rounded-lg bg-white p-6 text-navy shadow-2xl">
              <p className="font-bold uppercase tracking-wide text-orange-primary">Pré-matrícula</p>
              <h2 className="mt-2 font-display text-3xl font-bold">Fale com um consultor</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Field label="Nome completo" name="name" placeholder="Seu nome" required />
                <Field label="WhatsApp" name="phone" placeholder="(99) 99999-9999" required />
                <Field label="E-mail" name="email" placeholder="voce@email.com" type="email" required />
                <label className="block">
                  <span className="text-sm font-bold text-navy">Interesse</span>
                  <select
                    name="interest"
                    value={currentInterest}
                    onChange={(e) => setPreEnrollInterest(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none ring-orange-primary/20 transition focus:ring-4"
                  >
                    {activeCourses.map((c) => (
                      <option key={c.id} value={c.title}>{c.title}</option>
                    ))}
                  </select>
                </label>
                <label className="block md:col-span-2">
                  <span className="text-sm font-bold text-navy">Modalidade desejada</span>
                  <select name="modality" className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none ring-orange-primary/20 transition focus:ring-4">
                    <option>Presencial</option>
                    <option>Online ao vivo</option>
                  </select>
                </label>
                <label className="block md:col-span-2">
                  <span className="text-sm font-bold text-navy">Código de indicação (opcional)</span>
                  <input name="referralCode" defaultValue={referralCodeParam} placeholder="Deixe em branco se não possui" className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 outline-none ring-orange-primary/20 transition focus:ring-4" />
                </label>
              </div>
              <label className="mt-4 flex items-start gap-3 text-sm text-slate-600">
                <input required type="checkbox" className="mt-1 h-4 w-4 accent-orange-primary" />
                Autorizo o contato do Instituto Sentidos e o tratamento dos meus dados.
              </label>
              <button className="mt-6 w-full rounded-lg bg-navy px-5 py-4 font-bold text-white transition hover:bg-blue-action">Enviar solicitação</button>
              {leadMessage && <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm font-semibold text-green-700">{leadMessage}</p>}
            </form>
          </div>
        </section>

        <section id="contato" className="bg-bg-light py-16">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 md:grid-cols-3 lg:px-8">
            <ContactCard icon={MessageCircle} title="WhatsApp" text="Atendimento rápido para cursos e matrículas." />
            <ContactCard icon={Mail} title="Newsletter" text="Receba conteúdos, eventos e materiais do Instituto." />
            <ContactCard icon={FileText} title="Certificados" text="Valide documentos e acompanhe futuras emissões." />
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

// ── Referral landing page ─────────────────────────────────────────────────────

function ReferralPage({ referralCode }: { referralCode: string }) {
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [selectedInterest, setSelectedInterest] = useState('');
  const [selectedModality, setSelectedModality] = useState('Presencial');

  useEffect(() => {
    fetch('/api/courses')
      .then((r) => r.json())
      .then((body) => {
        if (body.data?.length) {
          setCourses(body.data.map(mapApiCourse));
        }
      })
      .catch(() => {});
  }, []);

  const activeCourses = courses.filter((c) => c.active);

  const availableModalities = useMemo(() => {
    const mods = new Set<string>();
    activeCourses.forEach((c) => {
      const label = getModalityLabel(c.modality, c.kind);
      if (label) mods.add(label);
    });
    return Array.from(mods);
  }, [activeCourses]);

  useEffect(() => {
    if (availableModalities.length > 0 && !availableModalities.includes(selectedModality)) {
      setSelectedModality(availableModalities[0]);
    }
  }, [availableModalities, selectedModality]);

  const filteredCourses = activeCourses.filter((c) => getModalityLabel(c.modality, c.kind) === selectedModality);
  const currentInterest = selectedInterest || (filteredCourses[0]?.title ?? '');
  const selectedCourse = filteredCourses.find(c => c.title === currentInterest);

  useEffect(() => {
    if (!referralCode) { setLoadError(true); return; }
    fetch(`/api/referral/${referralCode}`)
      .then((r) => r.json())
      .then((body) => {
        if (body.data?.studentName) setReferrerName(body.data.studentName);
        else setLoadError(true);
      })
      .catch(() => setLoadError(true));
  }, [referralCode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    const form = new FormData(event.currentTarget);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: String(form.get('name')),
          email: String(form.get('email')),
          phone: String(form.get('phone')),
          courseSlug: selectedCourse?.slug || slugify(currentInterest),
          preferredFormat: selectedModality === 'Online ao vivo' ? 'online_ao_vivo' : selectedModality === 'Presencial' ? 'presencial' : 'ead',
          source: 'indicacao',
          referralCode,
          notes: `Indicação pelo código ${referralCode}. Interesse: ${currentInterest} | Modalidade: ${selectedModality}`,
          consentLgpd: true,
        }),
      });
      if (res.ok) setSent(true);
    } catch { /* silently ignore */ }
    setSending(false);
  }

  return (
    <div className="min-h-screen bg-navy text-white">
      <header className="border-b border-white/10 px-4 py-5">
        <div className="mx-auto flex max-w-2xl items-center">
          <a href="/">
            <img src={SITE_LOGO} alt="Instituto Sentidos" className="h-10 w-auto object-contain" />
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-12">
        {loadError ? (
          <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
            <X className="mx-auto h-10 w-10 text-orange-primary" />
            <h1 className="mt-4 font-display text-2xl font-bold">Link de indicação inválido</h1>
            <p className="mt-3 text-white/70">Este link pode ter expirado ou estar incorreto.</p>
            <a href="/" className="mt-6 inline-block rounded-lg bg-orange-primary px-6 py-3 font-bold text-white">Acessar o site</a>
          </div>
        ) : sent ? (
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-400" />
            <h1 className="mt-4 font-display text-2xl font-bold">Cadastro recebido!</h1>
            <p className="mt-3 text-white/80">Um consultor do Instituto Sentidos vai entrar em contato pelo WhatsApp em breve.</p>
            <a href="/" className="mt-6 inline-block rounded-lg bg-orange-primary px-6 py-3 font-bold text-white">Conhecer os cursos</a>
          </div>
        ) : (
          <>
            {/* Referral banner */}
            <div className="mb-8 rounded-lg border border-orange-primary/30 bg-orange-primary/10 p-5">
              <div className="flex items-center gap-3">
                <Gift className="h-7 w-7 text-orange-primary" aria-hidden />
                <div>
                  {referrerName ? (
                    <>
                      <p className="font-bold text-white"><span className="text-orange-primary">{referrerName}</span> te indicou o Instituto Sentidos!</p>
                      <p className="mt-1 text-sm text-white/70">Preencha o formulário e receba um atendimento personalizado.</p>
                    </>
                  ) : (
                    <p className="font-bold text-white">Você foi indicado ao Instituto Sentidos!</p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-white p-7 text-navy shadow-2xl">
              <p className="font-bold uppercase tracking-wide text-orange-primary">Cadastro gratuito</p>
              <h1 className="mt-2 font-display text-3xl font-bold">Fale com um consultor</h1>
              <p className="mt-2 text-sm text-slate-500">Sem compromisso. Um consultor entrará em contato para apresentar as opções ideais para você.</p>

              <div className="mt-6 grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-bold text-navy">Modalidade desejada</span>
                    <select
                      name="modality"
                      value={selectedModality}
                      onChange={(e) => {
                        setSelectedModality(e.target.value);
                        setSelectedInterest('');
                      }}
                      className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none ring-orange-primary/20 transition focus:ring-4 text-navy"
                    >
                      {availableModalities.map((mod) => (
                        <option key={mod} value={mod}>
                          {mod}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-bold text-navy">O que você quer estudar?</span>
                    <select
                      name="interest"
                      value={currentInterest}
                      onChange={(e) => setSelectedInterest(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none ring-orange-primary/20 transition focus:ring-4 text-navy"
                    >
                      {filteredCourses.map((c) => (
                        <option key={c.id} value={c.title}>{c.title}</option>
                      ))}
                    </select>
                  </label>
                </div>

                {selectedCourse && (
                  <div className="mt-4 border-t border-slate-100 pt-6">
                    <form onSubmit={handleSubmit} className="grid gap-4">
                      <Field label="Nome completo do indicado" name="name" placeholder="Nome completo" required />
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="WhatsApp do indicado" name="phone" placeholder="(99) 99999-9999" required />
                        <Field label="E-mail do indicado" name="email" placeholder="voce@email.com" type="email" required />
                      </div>
                      <label className="flex items-start gap-3 text-sm text-slate-600">
                        <input required type="checkbox" className="mt-1 h-4 w-4 accent-orange-primary" />
                        Autorizo o contato do Instituto Sentidos e o tratamento dos meus dados conforme a LGPD.
                      </label>
                      <button disabled={sending} className="w-full rounded-lg bg-orange-primary px-5 py-4 font-bold text-white transition hover:bg-orange-600 disabled:opacity-60">
                        {sending ? 'Enviando…' : 'Quero indicar e cadastrar'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ── Turma (group formation) page ─────────────────────────────────────────────

interface TierData { id?: string; minReferrals: number; discountPercent: number; }
interface TurmaData { id: string; title: string; area: string; workload: string; investment: string; kind: string; minStudents: number; slug: string; }

const DEFAULT_TIERS: TierData[] = [
  { minReferrals: 1, discountPercent: 10 },
  { minReferrals: 3, discountPercent: 25 },
  { minReferrals: 5, discountPercent: 50 },
  { minReferrals: 10, discountPercent: 100 },
];

function TurmaPage({ courseSlug, referralCode }: { courseSlug: string; referralCode?: string }) {
  const [course, setCourse] = useState<TurmaData | null>(null);
  const [tiers, setTiers] = useState<TierData[]>(DEFAULT_TIERS);
  const [enrollmentCount, setEnrollmentCount] = useState(0);
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [myCode, setMyCode] = useState('');
  const [myReferralCount, setMyReferralCount] = useState(0);
  const [myPosition, setMyPosition] = useState(0);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/turma/${courseSlug}`)
      .then((r) => r.json())
      .then(({ data }) => {
        if (!data) { setNotFound(true); return; }
        setCourse({ id: data.course.id, title: data.course.title, area: data.course.area, workload: data.course.workload, investment: data.course.investment, kind: data.course.kind ?? data.course.type, minStudents: data.course.minStudents ?? 15, slug: courseSlug });
        if (data.tiers?.length) setTiers(data.tiers);
        setEnrollmentCount(data.enrollmentCount ?? 0);
      })
      .catch(() => {
        const found = initialCourses.find((c) => c.slug === courseSlug);
        if (found) {
          setCourse({ id: String(found.id), title: found.title, area: found.area, workload: found.workload, investment: found.investment, kind: found.kind, minStudents: 15, slug: courseSlug });
          setEnrollmentCount(Math.floor(Math.random() * 12) + 2);
        } else {
          setNotFound(true);
        }
      });

    if (referralCode) {
      fetch(`/api/referral/${referralCode}`)
        .then((r) => r.json())
        .then(({ data }) => { if (data?.studentName) setReferrerName(data.studentName); })
        .catch(() => {});
    }
  }, [courseSlug, referralCode]);

  // Poll referral count every 30s after registration
  useEffect(() => {
    if (!registered || !myCode) return;
    const poll = () =>
      fetch(`/api/turma/${courseSlug}/minhas-indicacoes/${myCode}`)
        .then((r) => r.json())
        .then(({ data }) => { if (data?.count != null) setMyReferralCount(data.count); })
        .catch(() => {});
    poll();
    const t = setInterval(poll, 30_000);
    return () => clearInterval(t);
  }, [registered, myCode, courseSlug]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    const form = new FormData(event.currentTarget);
    try {
      const res = await fetch(`/api/turma/${courseSlug}/registro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: String(form.get('name')), email: String(form.get('email')), phone: String(form.get('phone')), referralCode: referralCode || undefined, consentLgpd: true }),
      });
      if (res.ok) {
        const { data } = await res.json();
        setMyCode(data.code);
        setMyPosition(data.position ?? data.enrollmentCount);
        setEnrollmentCount(data.enrollmentCount);
        setMyReferralCount(data.myReferralCount ?? 0);
        setRegistered(true);
      }
    } catch {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      setMyCode(code);
      setMyPosition(enrollmentCount + 1);
      setEnrollmentCount((n) => n + 1);
      setMyReferralCount(0);
      setRegistered(true);
    }
    setSending(false);
  }

  function copyLink() {
    const link = `${window.location.origin}/turma/${courseSlug}/${myCode}`;
    navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  function shareWhatsApp() {
    const link = `${window.location.origin}/turma/${courseSlug}/${myCode}`;
    const text = encodeURIComponent(`Olá! Me inscrevi no ${course?.title ?? 'curso'} do Instituto Sentidos e te convido a participar também. Quanto mais amigos ingressarem, mais desconto ganhamos juntos! 🎓 ${link}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  const minStudents = course?.minStudents ?? 15;
  const remaining = Math.max(0, minStudents - enrollmentCount);
  const progressPct = Math.min(100, Math.round((enrollmentCount / minStudents) * 100));
  const currentDiscount = tiers.filter((t) => t.minReferrals <= myReferralCount).slice(-1)[0]?.discountPercent ?? 0;
  const nextTier = tiers.find((t) => t.minReferrals > myReferralCount);

  if (notFound) {
    return (
      <div className="grid min-h-screen place-items-center bg-navy px-4 text-white">
        <div className="rounded-lg border border-white/10 bg-white/5 p-10 text-center">
          <X className="mx-auto h-10 w-10 text-orange-primary" />
          <h1 className="mt-4 font-display text-2xl font-bold">Turma não encontrada</h1>
          <p className="mt-3 text-white/70">Este link pode estar incorreto ou o curso foi encerrado.</p>
          <a href="/" className="mt-6 inline-block rounded-lg bg-orange-primary px-6 py-3 font-bold text-white">Ver cursos disponíveis</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy text-white">
      <header className="border-b border-white/10 px-4 py-5">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <a href="/">
            <img src={SITE_LOGO} alt="Instituto Sentidos" className="h-10 w-auto object-contain" />
          </a>
          <a href={WHATSAPP} className="rounded-lg bg-orange-primary px-4 py-2 text-sm font-bold text-white">WhatsApp</a>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10">
        {/* Course title */}
        <div className="mb-8">
          {course ? (
            <>
              <span className="rounded-full bg-orange-primary/20 px-3 py-1 text-xs font-bold uppercase text-orange-300">{course.kind}</span>
              <h1 className="mt-3 font-display text-3xl font-bold md:text-4xl">{course.title}</h1>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-white/70">
                <span>{course.area}</span>
                <span>·</span>
                <span>{course.workload}</span>
                <span>·</span>
                <span>{course.investment}</span>
              </div>
            </>
          ) : (
            <div className="h-10 w-64 animate-pulse rounded bg-white/10" />
          )}
        </div>

        {/* Referrer banner */}
        {referrerName && !registered && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-orange-primary/30 bg-orange-primary/10 p-4">
            <Gift className="h-6 w-6 shrink-0 text-orange-primary" />
            <p className="text-sm font-semibold"><span className="text-orange-300">{referrerName}</span> te convidou para esta turma. Ao se inscrever, você e {referrerName.split(' ')[0]} ficam mais perto do desconto!</p>
          </div>
        )}

        {/* Enrollment progress */}
        <div className="mb-8 rounded-lg border border-white/10 bg-white/5 p-5">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-orange-primary">Formação de turma</p>
              <p className="mt-1 font-display text-4xl font-bold">{enrollmentCount}<span className="text-xl text-white/50">/{minStudents}</span></p>
              <p className="mt-1 text-sm text-white/70">alunos pré-inscritos</p>
            </div>
            <div className="text-right">
              {remaining > 0 ? (
                <>
                  <p className="font-display text-2xl font-bold text-orange-primary">{remaining}</p>
                  <p className="text-sm text-white/70">vaga{remaining !== 1 ? 's' : ''} para iniciar</p>
                </>
              ) : (
                <span className="rounded-full bg-green-500/20 px-4 py-2 text-sm font-bold text-green-400">Turma completa!</span>
              )}
            </div>
          </div>
          <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-orange-primary transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="mt-2 text-xs text-white/50">A turma inicia quando atingir {minStudents} alunos confirmados</p>
        </div>

        {/* Discount tiers */}
        <div className="mb-8 rounded-lg border border-white/10 bg-white/5 p-5">
          <p className="flex items-center gap-2 font-bold text-orange-primary"><Gift className="h-5 w-5" /> Ganhe desconto indicando amigos</p>
          <p className="mt-1 text-sm text-white/70">O desconto é aplicado diretamente nas suas mensalidades em aberto.</p>
          <div className="mt-4 grid gap-2">
            {tiers.map((tier, i) => {
              const earned = registered && myReferralCount >= tier.minReferrals;
              const isCurrent = registered && tier === tiers.filter((t) => t.minReferrals <= myReferralCount).slice(-1)[0];
              return (
                <div key={i} className={`flex items-center justify-between rounded-lg px-4 py-3 text-sm transition ${earned ? 'bg-green-500/15 border border-green-500/30' : 'bg-white/5 border border-white/10'}`}>
                  <span className={earned ? 'font-bold text-green-300' : 'text-white/80'}>
                    {isCurrent && <CheckCircle2 className="mr-2 inline h-4 w-4 text-green-400" />}
                    Indicar <strong>{tier.minReferrals}</strong> amigo{tier.minReferrals > 1 ? 's' : ''}
                  </span>
                  <span className={`font-display text-lg font-bold ${tier.discountPercent === 100 ? 'text-orange-primary' : earned ? 'text-green-300' : 'text-white'}`}>
                    {tier.discountPercent}% de desconto
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Registration form or success screen */}
        {!registered ? (
          <div className="rounded-lg bg-white p-7 text-navy shadow-2xl">
            <p className="font-bold uppercase tracking-wide text-orange-primary">Pré-inscrição gratuita</p>
            <h2 className="mt-1 font-display text-2xl font-bold">Reserve sua vaga na turma</h2>
            <p className="mt-1 text-sm text-slate-500">Sem compromisso. Confirmaremos quando a turma estiver completa.</p>
            <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
              <Field label="Nome completo" name="name" placeholder="Seu nome completo" required />
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="WhatsApp" name="phone" placeholder="(99) 99999-9999" required />
                <Field label="E-mail" name="email" placeholder="voce@email.com" type="email" required />
              </div>
              <label className="flex items-start gap-3 text-sm text-slate-600">
                <input required type="checkbox" className="mt-0.5 h-4 w-4 accent-orange-primary" />
                Autorizo o contato do Instituto Sentidos e o tratamento dos meus dados conforme a LGPD.
              </label>
              <button disabled={sending} className="w-full rounded-lg bg-orange-primary px-5 py-4 font-bold text-white transition hover:bg-orange-600 disabled:opacity-60">
                {sending ? 'Reservando vaga…' : 'Reservar minha vaga'}
              </button>
            </form>
          </div>
        ) : (
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-7">
            <CheckCircle2 className="h-10 w-10 text-green-400" />
            <h2 className="mt-3 font-display text-2xl font-bold text-white">Vaga reservada! Você é o aluno #{myPosition}</h2>
            <p className="mt-2 text-sm text-white/70">Avisaremos pelo WhatsApp quando a turma atingir {minStudents} alunos e estiver pronta para iniciar.</p>

            {/* Current discount earned */}
            {currentDiscount > 0 && (
              <div className="mt-4 rounded-lg bg-orange-primary/20 p-4">
                <p className="font-bold text-orange-300">Desconto atual: {currentDiscount}% nas mensalidades</p>
              </div>
            )}

            {/* Next tier incentive */}
            {nextTier && (
              <p className="mt-3 text-sm text-white/70">
                Indique mais <strong>{nextTier.minReferrals - myReferralCount}</strong> amigo{nextTier.minReferrals - myReferralCount > 1 ? 's' : ''} e ganhe <strong>{nextTier.discountPercent}% de desconto</strong> nas mensalidades!
              </p>
            )}

            {/* Share section */}
            <div className="mt-6">
              <p className="mb-2 text-sm font-bold uppercase tracking-wide text-orange-primary">Seu link de indicação</p>
              <div className="flex items-center gap-2 rounded-lg bg-white/10 p-3 font-mono text-sm text-white/80 break-all">
                {`${window.location.origin}/turma/${courseSlug}/${myCode}`}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <button onClick={copyLink} className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 font-bold transition ${copied ? 'border-green-500 bg-green-500/20 text-green-300' : 'border-white/20 text-white hover:bg-white/10'}`}>
                  <Copy className="h-4 w-4" />
                  {copied ? 'Copiado!' : 'Copiar link'}
                </button>
                <button onClick={shareWhatsApp} className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 font-bold text-white transition hover:bg-green-700">
                  <MessageCircle className="h-4 w-4" />
                  Compartilhar no WhatsApp
                </button>
              </div>
            </div>

            {/* Referral counter */}
            {myReferralCount > 0 && (
              <div className="mt-4 rounded-lg bg-white/5 p-4 text-center">
                <p className="font-display text-3xl font-bold text-orange-primary">{myReferralCount}</p>
                <p className="text-sm text-white/70">amigo{myReferralCount > 1 ? 's' : ''} indicado{myReferralCount > 1 ? 's' : ''} até agora</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ── Student Ambassador Page ───────────────────────────────────────────────────

function IndiqueEGanhePage() {
  const [logged, setLogged] = useState(false);
  const [myCode, setMyCode] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState('cpf');
  const [pixSaved, setPixSaved] = useState(false);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({ totalEarned: 0, pendingPix: 0, cappedPix: 0, totalConversions: 0 });
  const [monthlyCap, setMonthlyCap] = useState(1000);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'register' | 'login'>('register');
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');

  // Auto-login from local storage
  useEffect(() => {
    const savedCode = localStorage.getItem('isentidos_referral_code');
    if (savedCode) {
      fetch('/api/referrals/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: savedCode })
      })
      .then(r => r.json())
      .then(res => {
        if (res.data) {
          setMyCode(res.data.code);
          setStudentName(res.data.studentName || '');
          setStudentEmail(res.data.studentEmail || '');
          setPixKey(res.data.pixKey || '');
          setPixKeyType(res.data.pixKeyType || 'cpf');
          setMonthlyCap(res.data.monthlyPixCap || 1000);
          setMetrics(res.data.metrics || { totalEarned: 0, pendingPix: 0, cappedPix: 0, totalConversions: 0 });
          setReferrals(res.data.referrals || []);
          setLogged(true);
        }
      })
      .catch(() => {});
    }
  }, []);

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setRegisterError('');
    const form = new FormData(event.currentTarget);
    try {
      const res = await fetch('/api/referrals/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: String(form.get('name')),
          email: String(form.get('email')),
          phone: String(form.get('phone')),
          cpf: String(form.get('cpf')),
          pixKey: String(form.get('pixKey') || ''),
          pixKeyType: String(form.get('pixKeyType') || 'cpf'),
          consentLgpd: true
        })
      });
      if (res.ok) {
        const { data } = await res.json();
        setMyCode(data.code);
        localStorage.setItem('isentidos_referral_code', data.code);
        
        const meRes = await fetch('/api/referrals/me', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: data.code })
        });
        if (meRes.ok) {
          const meData = await meRes.json();
          setStudentName(meData.data.studentName);
          setStudentEmail(meData.data.studentEmail || '');
          setPixKey(meData.data.pixKey || '');
          setPixKeyType(meData.data.pixKeyType || 'cpf');
          setMonthlyCap(meData.data.monthlyPixCap || 1000);
          setMetrics(meData.data.metrics || { totalEarned: 0, pendingPix: 0, cappedPix: 0, totalConversions: 0 });
          setReferrals(meData.data.referrals || []);
        } else {
          setStudentName(String(form.get('name')));
        }
        setLogged(true);
      } else {
        const err = await res.json();
        setRegisterError(err.error || 'Erro ao registrar embaixador.');
      }
    } catch {
      setRegisterError('Erro de conexão ao tentar registrar.');
    }
    setSending(false);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setLoginError('');
    const form = new FormData(event.currentTarget);
    const identifier = String(form.get('identifier')).trim();
    
    const isEmail = identifier.includes('@');
    const payload = isEmail ? { email: identifier } : { code: identifier };
    
    try {
      const res = await fetch('/api/referrals/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const { data } = await res.json();
        setMyCode(data.code);
        setStudentName(data.studentName);
        setStudentEmail(data.studentEmail || '');
        setPixKey(data.pixKey || '');
        setPixKeyType(data.pixKeyType || 'cpf');
        setMonthlyCap(data.monthlyPixCap || 1000);
        setMetrics(data.metrics || { totalEarned: 0, pendingPix: 0, cappedPix: 0, totalConversions: 0 });
        setReferrals(data.referrals || []);
        localStorage.setItem('isentidos_referral_code', data.code);
        setLogged(true);
      } else {
        const err = await res.json();
        setLoginError(err.error || 'Código ou E-mail não encontrado.');
      }
    } catch {
      setLoginError('Erro de conexão ao tentar acessar.');
    }
    setSending(false);
  }

  async function handleSavePixKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    try {
      const res = await fetch('/api/referrals/update-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: myCode, pixKey, pixKeyType })
      });
      if (res.ok) {
        setPixSaved(true);
        setTimeout(() => setPixSaved(false), 3000);
      }
    } catch { /* silently ignore */ }
    setSending(false);
  }

  function handleLogout() {
    localStorage.removeItem('isentidos_referral_code');
    setMyCode('');
    setStudentName('');
    setReferrals([]);
    setLogged(false);
  }

  function copyLink() {
    const link = `${window.location.origin}/indicacao/${myCode}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (logged) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-navy px-4 py-5 text-white shadow-md">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <a href="/">
              <img src={SITE_LOGO} alt="Instituto Sentidos" className="h-10 w-auto object-contain" />
            </a>
            <div className="flex items-center gap-4">
              <span className="hidden sm:inline-block text-sm font-semibold text-white/80">Painel do Indicador — PIX</span>
              <button onClick={handleLogout} className="rounded-xl bg-white/10 px-4 py-2 text-xs font-bold hover:bg-white/20 transition duration-200 border border-white/10">Sair do Painel</button>
            </div>
          </div>
        </header>
        
        <main className="mx-auto max-w-5xl px-4 py-10">
          <div className="rounded-3xl bg-navy text-white p-8 md:p-10 shadow-2xl relative overflow-hidden mb-10">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-orange-primary/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="relative z-10">
              <span className="inline-block rounded-full bg-orange-primary/20 text-orange-primary text-xs font-bold px-3 py-1 mb-4 uppercase tracking-wider">Programa Indique e Ganhe no PIX</span>
              <h1 className="font-display text-3xl md:text-4xl font-bold">Olá, {studentName.split(' ')[0]}!</h1>
              <p className="mt-2 text-slate-300 max-w-2xl">Ganhe dinheirinho no seu PIX a cada amigo que se matricular em qualquer curso do nosso ecossistema (Cursos Livres, Preparatórios ISP, Pós-Graduação ou Supletivo EJA).</p>
            </div>
          </div>
          
          <div className="grid gap-8 md:grid-cols-12 mb-10">
            {/* Link & PIX Key Column */}
            <div className="md:col-span-6 space-y-6">
              <div className="rounded-3xl border border-slate-200/60 bg-white p-6 md:p-8 shadow-soft">
                <h3 className="font-display text-lg font-bold text-navy mb-1">Seu Link Exclusivo de Indicação</h3>
                <p className="text-sm text-slate-500 mb-4">Compartilhe este link. Quando um amigo se matricular, a recompensa em PIX é computada para você!</p>
                <div className="flex items-center gap-2 rounded-2xl bg-slate-50 p-4 font-mono text-sm text-navy shadow-inner border border-slate-200 select-all overflow-x-auto whitespace-nowrap mb-6">
                  {`${window.location.origin}/indicacao/${myCode}`}
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={copyLink} className={`flex flex-1 items-center justify-center gap-2 rounded-2xl px-5 py-4 font-bold transition duration-200 shadow-md ${copied ? 'bg-green-600 text-white shadow-green-500/20' : 'bg-orange-primary text-white hover:bg-orange-600 hover:-translate-y-0.5 shadow-orange-primary/20'}`}>
                    <Copy className="h-5 w-5" /> {copied ? 'Link Copiado!' : 'Copiar Link'}
                  </button>
                  <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Estude no Instituto Sentidos! Faça sua matrícula através da minha indicação: ${window.location.origin}/indicacao/${myCode}`)}`)} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-green-600 px-5 py-4 font-bold text-white transition duration-200 hover:bg-green-700 hover:-translate-y-0.5 shadow-md shadow-green-500/20">
                    <MessageCircle className="h-5 w-5" /> WhatsApp
                  </button>
                </div>
              </div>

              {/* Chave PIX Card */}
              <div className="rounded-3xl border border-slate-200/60 bg-white p-6 md:p-8 shadow-soft">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-lg font-bold text-navy">Sua Chave PIX para Recebimento</h3>
                  <Sparkles className="h-5 w-5 text-orange-primary" />
                </div>
                <p className="text-sm text-slate-500 mb-4">Informe sua chave PIX para que o Instituto Sentidos possa realizar o pagamento das suas comissões.</p>

                {pixSaved && <p className="mb-4 rounded-xl bg-green-50 p-3 text-xs font-bold text-green-700 border border-green-200">Chave PIX atualizada com sucesso!</p>}

                <form onSubmit={handleSavePixKey} className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <label className="col-span-1 block">
                      <span className="text-xs font-bold text-navy">Tipo</span>
                      <select value={pixKeyType} onChange={(e) => setPixKeyType(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-navy outline-none focus:ring-2 focus:ring-orange-primary/20">
                        <option value="cpf">CPF</option>
                        <option value="email">E-mail</option>
                        <option value="phone">Telefone</option>
                        <option value="random">Chave Aleatória</option>
                      </select>
                    </label>
                    <label className="col-span-2 block">
                      <span className="text-xs font-bold text-navy">Chave PIX</span>
                      <input type="text" value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder="Digite sua chave PIX" required className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-navy outline-none focus:ring-2 focus:ring-orange-primary/20" />
                    </label>
                  </div>
                  <button disabled={sending} className="w-full rounded-xl bg-navy px-4 py-3 text-xs font-bold text-white transition hover:bg-slate-800">
                    {sending ? 'Salvando...' : 'Salvar Chave PIX'}
                  </button>
                </form>
              </div>
            </div>

            {/* Financial Metrics Column */}
            <div className="md:col-span-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-3xl border border-green-100 bg-green-50/60 p-6 shadow-soft">
                  <p className="text-xs font-bold uppercase tracking-wider text-green-800 mb-1">PIX Pago</p>
                  <p className="font-display text-3xl font-extrabold text-green-700">R$ {metrics.totalEarned.toFixed(2)}</p>
                  <p className="mt-2 text-xs text-green-800">Valor já transferido</p>
                </div>
                <div className="rounded-3xl border border-orange-100 bg-orange-50/60 p-6 shadow-soft">
                  <p className="text-xs font-bold uppercase tracking-wider text-orange-800 mb-1">PIX Liberado</p>
                  <p className="font-display text-3xl font-extrabold text-orange-600">R$ {metrics.pendingPix.toFixed(2)}</p>
                  <p className="mt-2 text-xs text-orange-800">Aguardando pagamento admin</p>
                </div>
              </div>

              {metrics.cappedPix > 0 && (
                <div className="rounded-3xl border border-purple-100 bg-purple-50/70 p-6 shadow-soft">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-purple-800 mb-1">Aguardando Próximo Mês (Teto R$ {monthlyCap})</p>
                      <p className="font-display text-2xl font-extrabold text-purple-900">R$ {metrics.cappedPix.toFixed(2)}</p>
                    </div>
                    <span className="rounded-full bg-purple-200 px-3 py-1 text-xs font-bold text-purple-900">Teto Atingido</span>
                  </div>
                  <p className="mt-2 text-xs text-purple-700">Indicações convertidas que superaram o teto mensal de R$ {monthlyCap},00 e serão liberadas para pagamento no início do próximo mês.</p>
                </div>
              )}

              <div className="rounded-3xl bg-navy p-6 text-white shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white/70 uppercase tracking-wider">Matrículas Confirmadas</p>
                    <p className="mt-1 font-display text-4xl font-black text-orange-primary">{metrics.totalConversions} <span className="text-xs text-white/60 font-medium uppercase">amigos matriculados</span></p>
                  </div>
                  <Gift className="h-10 w-10 text-white/20 shrink-0" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12">
            <h2 className="font-display text-2xl font-bold text-navy mb-6">Histórico de Indicações</h2>
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
              {referrals.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <Gift className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                  <p className="font-bold text-lg text-navy mb-1">Nenhum amigo indicado ainda</p>
                  <p className="text-sm text-slate-500">Compartilhe o seu link acima para começar a receber valores no seu PIX.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="p-5 font-bold">Amigo Indicado</th>
                        <th className="p-5 font-bold">Curso de Interesse</th>
                        <th className="p-5 font-bold">Data</th>
                        <th className="p-5 font-bold">Status do PIX</th>
                        <th className="p-5 font-bold text-right">Valor PIX</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {referrals.map((r) => {
                        let statusBadge = (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                            Aguardando Matrícula
                          </span>
                        );
                        if (r.pixStatus === 'paid') {
                          statusBadge = (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">
                              <CheckCircle2 className="h-3.5 w-3.5" /> PIX Pago
                            </span>
                          );
                        } else if (r.pixStatus === 'approved') {
                          statusBadge = (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                              Matrícula Confirmada — PIX Liberado
                            </span>
                          );
                        } else if (r.pixStatus === 'capped') {
                          statusBadge = (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-800">
                              Aguardando Próximo Mês (Teto)
                            </span>
                          );
                        }

                        return (
                          <tr key={r.id} className="hover:bg-slate-50/50 transition">
                            <td className="p-5 font-bold text-navy">{r.leadName}</td>
                            <td className="p-5 text-slate-600 text-xs font-medium">{r.courseTitle}</td>
                            <td className="p-5 text-slate-500 text-xs font-semibold">{new Date(r.createdAt).toLocaleDateString('pt-BR')}</td>
                            <td className="p-5">{statusBadge}</td>
                            <td className="p-5 text-right font-black text-navy text-base">
                              R$ {Number(r.pixRewardValue || 50).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy text-white relative overflow-hidden flex flex-col justify-between">
      {/* Decorative Blur elements */}
      <div className="absolute -left-40 -top-40 w-96 h-96 bg-orange-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -right-40 bottom-20 w-96 h-96 bg-blue-action/10 rounded-full blur-3xl pointer-events-none"></div>

      <header className="border-b border-white/10 px-6 py-5 relative z-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <a href="/">
            <img src={SITE_LOGO} alt="Instituto Sentidos" className="h-10 w-auto object-contain" />
          </a>
          <a href="/" className="text-sm font-semibold text-white/80 hover:text-white transition">Voltar para o site</a>
        </div>
      </header>
      
      <main className="mx-auto max-w-5xl px-6 py-16 flex-1 w-full grid md:grid-cols-12 gap-12 items-center relative z-10">
        <div className="md:col-span-6 space-y-6 text-left">
          <span className="inline-block rounded-full bg-orange-primary/20 text-orange-primary text-xs font-bold px-3 py-1 uppercase tracking-wider">Programa Indique e Ganhe no PIX</span>
          <h1 className="font-display text-4xl md:text-5xl font-black leading-tight text-white">Indique amigos e ganhe dinheiro no seu PIX!</h1>
          <p className="text-lg text-white/80 leading-relaxed">
            Como embaixador do Instituto Sentidos, a cada amigo indicado que realizar a matrícula em qualquer curso do nosso ecossistema (Cursos Livres, ISP Preparatórios, Pós-Graduação ou Supletivo EJA), você recebe o valor direto no seu PIX.
          </p>
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-3 font-semibold text-white/90">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-orange-primary/20 text-orange-primary font-bold text-sm">1</span>
              Cadastre-se e informe sua Chave PIX
            </div>
            <div className="flex items-center gap-3 font-semibold text-white/90">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-orange-primary/20 text-orange-primary font-bold text-sm">2</span>
              Compartilhe seu link exclusivo com seus amigos
            </div>
            <div className="flex items-center gap-3 font-semibold text-white/90">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-orange-primary/20 text-orange-primary font-bold text-sm">3</span>
              Receba o PIX assim que o amigo se matricular
            </div>
          </div>
        </div>

        <div className="md:col-span-6 w-full max-w-md mx-auto">
          {/* Form Card */}
          <div className="rounded-3xl bg-white text-navy p-8 shadow-2xl relative overflow-hidden border border-slate-100">
            {/* Tabs header */}
            <div className="flex border-b border-slate-100 mb-6 pb-2 gap-4">
              <button 
                onClick={() => { setActiveTab('register'); setLoginError(''); setRegisterError(''); }}
                className={`pb-3 font-display font-bold text-base transition relative ${activeTab === 'register' ? 'text-orange-primary' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Quero me cadastrar
                {activeTab === 'register' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-primary rounded-full" />}
              </button>
              <button 
                onClick={() => { setActiveTab('login'); setLoginError(''); setRegisterError(''); }}
                className={`pb-3 font-display font-bold text-base transition relative ${activeTab === 'login' ? 'text-orange-primary' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Já tenho cadastro
                {activeTab === 'login' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-primary rounded-full" />}
              </button>
            </div>

            {activeTab === 'register' ? (
              <div>
                <p className="text-sm text-slate-500 mb-6 font-semibold">Preencha os campos abaixo para gerar seu link exclusivo e cadastrar sua Chave PIX.</p>
                {registerError && <p className="mb-4 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-600 border border-red-100">{registerError}</p>}
                
                <form onSubmit={handleRegister} className="grid gap-4">
                  <Field label="Nome completo" name="name" placeholder="Seu nome completo" required />
                  <Field label="CPF" name="cpf" placeholder="000.000.000-00" required />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="WhatsApp" name="phone" placeholder="(99) 99999-9999" required />
                    <Field label="E-mail" name="email" placeholder="voce@email.com" type="email" required />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="block sm:col-span-1">
                      <span className="text-sm font-bold text-navy">Tipo PIX</span>
                      <select name="pixKeyType" defaultValue="cpf" className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-xs outline-none focus:ring-4 focus:ring-orange-primary/20">
                        <option value="cpf">CPF</option>
                        <option value="email">E-mail</option>
                        <option value="phone">Telefone</option>
                        <option value="random">Aleatória</option>
                      </select>
                    </label>
                    <div className="sm:col-span-2">
                      <Field label="Sua Chave PIX" name="pixKey" placeholder="Sua chave PIX para receber" required />
                    </div>
                  </div>
                  <label className="flex items-start gap-3 text-sm text-slate-600 mt-2 cursor-pointer">
                    <input required type="checkbox" className="mt-1 h-4 w-4 accent-orange-primary rounded border-slate-300" />
                    <span>Aceito os termos do Programa Indique e Ganhe no PIX do Instituto Sentidos.</span>
                  </label>
                  <button disabled={sending} className="mt-4 w-full rounded-2xl bg-orange-primary px-5 py-4 font-bold text-white transition hover:bg-orange-600 hover:-translate-y-0.5 shadow-lg shadow-orange-primary/30 disabled:opacity-60">
                    {sending ? 'Gerando link...' : 'Criar meu Link & Cadastrar PIX'}
                  </button>
                </form>
              </div>
            ) : (
              <div>
                <p className="text-sm text-slate-500 mb-6 font-semibold">Informe seu e-mail de cadastro ou código de indicação para acessar o painel.</p>
                {loginError && <p className="mb-4 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-600 border border-red-100">{loginError}</p>}
                
                <form onSubmit={handleLogin} className="grid gap-4">
                  <Field label="E-mail ou Código de Indicação" name="identifier" placeholder="ex: voce@email.com ou CODE12" required />
                  <button disabled={sending} className="mt-4 w-full rounded-2xl bg-orange-primary px-5 py-4 font-bold text-white transition hover:bg-orange-600 hover:-translate-y-0.5 shadow-lg shadow-orange-primary/30 disabled:opacity-60">
                    {sending ? 'Acessando...' : 'Entrar no meu Painel'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-white/10 px-6 py-6 text-center text-sm text-white/50 relative z-10">
        © {new Date().getFullYear()} Instituto Sentidos. Todos os direitos reservados.
      </footer>
    </div>
  );
}

// ── Admin Components ──────────────────────────────────────────────────────────

function JsonListEditor({ label, name, defaultValue, fields, itemLabel }: { label: string, name: string, defaultValue?: string, fields: {key: string, label: string}[], itemLabel: string }) {
  const [items, setItems] = useState<any[]>(() => {
    try { return defaultValue ? JSON.parse(defaultValue) : []; }
    catch { return []; }
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
      <h5 className="mb-3 font-bold text-navy">{label}</h5>
      <input type="hidden" name={name} value={JSON.stringify(items)} />
      
      <div className="space-y-3 mb-4">
        {items.map((item, idx) => (
          <div key={idx} className="relative rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))} className="absolute right-3 top-3 text-slate-400 hover:text-red-500 transition" title="Remover">
              <X className="h-5 w-5" />
            </button>
            <div className="grid gap-3 pr-8">
              {fields.map(f => (
                <div key={f.key}>
                  <label className="mb-1 block text-xs font-bold text-slate-500">{f.label}</label>
                  <input
                    type="text"
                    className="w-full rounded-md border border-slate-200 p-2 text-sm text-navy outline-none focus:border-blue-action focus:ring-1 focus:ring-blue-action"
                    value={item[f.key] || ''}
                    onChange={e => {
                      const newItems = [...items];
                      newItems[idx] = { ...newItems[idx], [f.key]: e.target.value };
                      setItems(newItems);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => setItems([...items, {}])} className="inline-flex items-center gap-2 rounded-lg bg-orange-primary/10 px-4 py-2 text-sm font-bold text-orange-primary transition hover:bg-orange-primary/20">
        + Adicionar {itemLabel}
      </button>
    </div>
  );
}

// ── Admin app (self-contained) ────────────────────────────────────────────────

function AdminApp() {
  const [token, setToken] = useState(() => localStorage.getItem('isentidos_admin_token') || '');
  const [logged, setLogged] = useState(() => !!localStorage.getItem('isentidos_admin_token'));
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [resetToken, setResetToken] = useState(() => {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('token') || '';
  });
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('isentidos_admin_tab') || 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem('isentidos_admin_tab', activeTab);
  }, [activeTab]);
  const [notice, setNotice] = useState('');
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role: string } | null>(() => {
    const saved = localStorage.getItem('isentidos_admin_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Settings State variables
  const [adminSettings, setAdminSettings] = useState({
    domain: 'isentidos.com.br',
    whatsapp: '(99) 3199-93940',
    siteName: 'Instituto Sentidos',
    apiGeminiKey: '',
    apiOpenAIKey: '',
    apiOpenRouterKey: '',
    apiGroqKey: '',
    activeAiProvider: 'local' as 'local' | 'gemini' | 'openai' | 'openrouter' | 'groq',
    metaPixelId: '',
    googleAnalyticsId: '',
    googleTagManagerId: '',
    googleAdsId: '',
    customScripts: '',
    instagram: '',
    facebook: '',
    linkedin: '',
    youtube: '',
    twitter: '',
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPass: '',
    smtpFromEmail: '',
    outboundWebhookUrl: '',
    mauticBaseUrl: 'https://mautic.isentidos.com.br',
    mauticTrackingEnabled: true,
  });

  interface AdminMenuItem {
    id?: string;
    label: string;
    href: string;
    position: number;
    isButton: boolean;
    isActive: boolean;
    parentId?: string | null;
  }
  const [adminMenuItems, setAdminMenuItems] = useState<AdminMenuItem[]>([]);
  const [editingMenuItem, setEditingMenuItem] = useState<AdminMenuItem | null>(null);
  
  // Settings Tab active subtab
  const [settingsSubtab, setSettingsSubtab] = useState<'geral' | 'pixels' | 'api' | 'menu' | 'webhooks'>('geral');


  // Local state — each resource managed independently
  const [banners, setBanners] = useState<Banner[]>(initialBanners);
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [posts, setPosts] = useState<BlogPost[]>(initialPosts);
  const [ebooks, setEbooks] = useState<Ebook[]>(initialEbooks);
  const [events, setEvents] = useState<EventItem[]>(initialEvents);
  
  // Blog advanced editor states
  const [isAdvancedEditor, setIsAdvancedEditor] = useState(false);
  const [blogTitle, setBlogTitle] = useState('');
  const [blogCategory, setBlogCategory] = useState('');
  const [blogDate, setBlogDate] = useState('');
  const [blogKeywords, setBlogKeywords] = useState('');
  const [blogExcerpt, setBlogExcerpt] = useState('');
  const [blogContent, setBlogContent] = useState('');
  const [blogCoverUrl, setBlogCoverUrl] = useState('');
  const [blogAltText, setBlogAltText] = useState('');
  
  // AI assist states
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiCoverPrompt, setAiCoverPrompt] = useState('');
  const [aiCoverGenerating, setAiCoverGenerating] = useState(false);
  const [aiAltGenerating, setAiAltGenerating] = useState(false);

  // Editor mode (rich vs code) and preview
  const [editorMode, setEditorMode] = useState<'rich' | 'code'>('rich');
  const [editorPreview, setEditorPreview] = useState(false);

  function resetBlogStates() {
    setBlogTitle('');
    setBlogCategory('');
    setBlogDate(new Date().toISOString().split('T')[0]);
    setBlogKeywords('');
    setBlogExcerpt('');
    setBlogContent('');
    setBlogCoverUrl('');
    setBlogAltText('');
    setAiPrompt('');
    setAiCoverPrompt('');
  }

  async function handleGenerateContent() {
    if (!aiPrompt.trim()) {
      alert('Por favor, informe um tema ou descrição para a IA.');
      return;
    }
    setAiGenerating(true);
    try {
      const res = await fetch('/api/admin/blog-posts/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      const json = await res.json();
      if (json.data) {
        setBlogTitle(json.data.title);
        setBlogExcerpt(json.data.excerpt);
        setBlogCategory(json.data.category);
        setBlogKeywords(json.data.tags.join(', '));
        setBlogContent(json.data.content);
        showNotice('Artigo gerado com sucesso! Agora você pode editá-lo abaixo.');
      } else {
        alert('Falha ao gerar conteúdo: ' + (json.error || 'Erro desconhecido'));
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao gerar conteúdo.');
    } finally {
      setAiGenerating(false);
    }
  }

  const [referralCodes, setReferralCodes] = useState<ReferralCode[]>([]);
  const [allReferrals, setAllReferrals] = useState<any[]>([]);
  const [referralActive, setReferralActive] = useState(true);
  const [referralRewardType, setReferralRewardType] = useState<'pix' | 'desconto'>('pix');
  const [pixRewardValue, setPixRewardValue] = useState(50);
  const [monthlyPixCap, setMonthlyPixCap] = useState(1000);
  const [pixRewardByCategory, setPixRewardByCategory] = useState<Record<string, number>>({
    livre: 50,
    preparatorio: 50,
    pos_presencial: 50,
    pos_online: 50,
    mestrado_ead: 50,
    doutorado_ead: 50,
    supletivo_eja: 50,
  });
  const [eligibleCourseTypes, setEligibleCourseTypes] = useState<string[]>([
    'livre', 'preparatorio', 'pos_presencial', 'pos_online', 'mestrado_ead', 'doutorado_ead', 'supletivo_eja'
  ]);

  // Turmas state
  interface TurmaAdmin { id: string; title: string; slug: string; minStudents: number; enrollmentCount: number; tiers: TierData[]; }
  const [turmas, setTurmas] = useState<TurmaAdmin[]>([]);
  const [editingTurma, setEditingTurma] = useState<TurmaAdmin | null>(null);
  const [turmaMinStudents, setTurmaMinStudents] = useState(15);
  const [turmaTiers, setTurmaTiers] = useState<TierData[]>(DEFAULT_TIERS);

  // Editing state
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseAbout, setCourseAbout] = useState('');
  const [courseSyllabus, setCourseSyllabus] = useState('');
  const [courseCoverUrl, setCourseCoverUrl] = useState('');
  const [courseSearch, setCourseSearch] = useState('');
  const [courseLoading, setCourseLoading] = useState(false);

  useEffect(() => {
    setCourseAbout(editingCourse?.about || '');
    setCourseSyllabus(editingCourse?.syllabus || '');
    setCourseCoverUrl(editingCourse?.coverImageUrl || '');
  }, [editingCourse]);

  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [editingEbook, setEditingEbook] = useState<Ebook | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);

  const [ebookCoverUrl, setEbookCoverUrl] = useState('');
  const [ebookFileUrl, setEbookFileUrl] = useState('');
  const [eventCoverUrl, setEventCoverUrl] = useState('');

  const [bannerPreview, setBannerPreview] = useState('');

  function showNotice(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(''), 4000);
  }

  function clearAdminSession() {
    localStorage.removeItem('isentidos_admin_token');
    localStorage.removeItem('isentidos_admin_user');
    localStorage.removeItem('isentidos_admin_local');
    setToken('');
    setLogged(false);
    setCurrentUser(null);
  }

  async function handleAdminResponseError(res: Response, fallbackMessage = 'Erro desconhecido') {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401) {
      clearAdminSession();
      return 'Sessão expirada ou inválida. Faça login novamente e tente salvar de novo.';
    }
    return err.error || fallbackMessage;
  }

  async function handleForgotPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email'));
    try {
      const res = await fetch('/api/admin/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      showNotice(data.message || 'Solicitação enviada.');
      setForgotPasswordMode(false);
    } catch {
      showNotice('❌ Erro ao solicitar recuperação de senha.');
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResetError('');
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get('newPassword') || '');
    const confirmPassword = String(form.get('confirmPassword') || '');

    if (!newPassword || newPassword.length < 6) {
      setResetError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError('As senhas digitadas não coincidem.');
      return;
    }

    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setResetSuccess(true);
      } else {
        setResetError(data.error || 'Falha ao redefinir a senha. O link pode ter expirado.');
      }
    } catch {
      setResetError('Erro de conexão ao redefinir a senha.');
    }
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: String(form.get('email')), password: String(form.get('password')) }),
      });
      if (res.ok) {
        const json = await res.json();
        const t = json.token ?? json.data?.token ?? '';
        if (t) {
          setToken(t);
          setLogged(true);
          const u = json.user || { name: 'Administrador', email: String(form.get('email')), role: json.role || 'admin' };
          setCurrentUser(u);
          localStorage.setItem('isentidos_admin_token', t);
          localStorage.setItem('isentidos_admin_user', JSON.stringify(u));
          localStorage.removeItem('isentidos_admin_local');
          showNotice('Login realizado com sucesso!');
          return;
        }
      }
      // API respondeu mas login falhou
      const errJson = await res.json().catch(() => ({}));
      alert('Falha no login: ' + (errJson.error || 'E-mail ou senha incorretos.'));
    } catch {
      alert('Erro de conexão ao servidor. Verifique se o backend está rodando.');
    }
  }

  // Restaurar sessão — valida o token com o backend antes de restaurar
    useEffect(() => {
    const savedToken = localStorage.getItem('isentidos_admin_token');
    const savedUser = localStorage.getItem('isentidos_admin_user');
    if (savedToken) {
      // Verificar se o token ainda é válido
      fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${savedToken}` } })
        .then(r => {
          if (r.ok) {
            setToken(savedToken);
            setLogged(true);
            if (savedUser) {
              setCurrentUser(JSON.parse(savedUser));
            } else {
              setCurrentUser({ name: 'Administrador', email: '', role: 'admin' });
            }
          } else {
            // Token expirado – limpar e pedir novo login
            clearAdminSession();
          }
        })
        .catch(() => {
          // Backend offline – restaurar com token salvo de qualquer forma
          setToken(savedToken);
          setLogged(true);
          if (savedUser) {
            setCurrentUser(JSON.parse(savedUser));
          }
        });
    }
  }, []);

  // Fetch all data from API when token is available
  useEffect(() => {
    if (!token) return;
    const h = { Authorization: `Bearer ${token}` };
    const get = (url: string) => fetch(url, { headers: h }).then((r) => r.json()).catch(() => ({ data: null }));

    Promise.all([
      get('/api/admin/banners'),
      get('/api/admin/courses'),
      get('/api/admin/leads'),
      get('/api/admin/blog-posts'),
      get('/api/admin/ebooks'),
      get('/api/admin/events'),
      get('/api/admin/referral-codes'),
      get('/api/admin/referral-settings'),
      get('/api/admin/turmas'),
      get('/api/admin/referrals'),
      get('/api/admin/settings'),
      get('/api/admin/menu'),
    ]).then(([b, c, l, p, e, ev, rc, rs, tm, ar, sett, men]) => {
      if (sett && sett.data) {
        setAdminSettings(sett.data);
      }
      if (men && men.data?.length) {
        setAdminMenuItems(men.data);
      }
      if (b.data?.length) setBanners(b.data.map(mapApiBanner));
      if (c.data?.length) setCourses(c.data.map(mapApiCourse));
      if (l.data?.length) setLeads(l.data.map((lead: any) => ({
        id: lead.id,
        name: lead.name || '',
        phone: lead.phone || '',
        email: lead.email || '',
        interest: lead.interest || lead.course?.title || lead.notes || '',
        modality: lead.modality || ModalityType.PRESENTIAL,
        status: lead.status || 'Novo',
        origin: lead.origin || lead.source || 'Site',
        referralCode: lead.referralCode || null,
        notes: lead.notes || '',
      })));
      if (p.data?.length) setPosts(p.data.map((post: any) => ({
        id: post.id,
        title: post.title || '',
        category: post.category || 'Geral',
        excerpt: post.excerpt || '',
        published: post.published ?? post.isPublished ?? false,
        content: post.content || '',
        tags: post.tags || [],
        coverImageUrl: post.coverImageUrl || '',
        publishedAt: post.publishedAt || ''
      })));
      if (e.data?.length) setEbooks(e.data.map((ebook: any) => ({
        id: ebook.id,
        title: ebook.title || '',
        description: ebook.description || '',
        category: ebook.category ?? 'Livro Digital',
        coverUrl: ebook.coverUrl ?? '',
        fileUrl: ebook.fileUrl ?? '',
        mauticFormId: ebook.mauticFormId ?? null,
        pages: ebook.pages ?? '',
        year: ebook.year ?? '',
        position: ebook.position ?? 0,
        active: ebook.active ?? ebook.isActive ?? true,
      })));
      if (ev.data?.length) setEvents(ev.data.map((event: any) => ({
        id: String(event.id),
        title: event.title || '',
        modality: event.modality || ModalityType.PRESENTIAL,
        date: event.startsAt ? new Date(event.startsAt).toLocaleDateString('pt-BR') : '',
        description: event.description || '',
        link: event.link || '',
        coverUrl: event.coverUrl || '',
        active: event.active ?? event.isActive ?? true,
        price: event.price ?? 0,
        slug: event.slug || '',
      })));
      if (rc.data?.length) setReferralCodes(rc.data.map((code: any) => ({
        id: code.id, code: code.code,
        studentName: (code as any).student?.name ?? '',
        studentEmail: (code as any).student?.email ?? '',
        conversions: code.referrals?.filter((r: any) => r.status === 'converted').length ?? 0,
        isActive: code.isActive,
      })));
      if (ar?.data?.length) {
        setAllReferrals(ar.data.map((r: any) => ({
          id: r.id,
          leadName: r.lead?.name || 'Anônimo',
          leadEmail: r.lead?.email || '',
          leadPhone: r.lead?.phone || '',
          courseTitle: r.lead?.course?.title || 'Curso Instituto Sentidos',
          courseType: r.lead?.course?.type || 'Geral',
          studentName: r.referralCode?.student?.name || 'Desconhecido',
          studentEmail: r.referralCode?.student?.email || '',
          code: r.referralCode?.code || '-',
          pixKey: r.referralCode?.pixKey || null,
          pixKeyType: r.referralCode?.pixKeyType || 'cpf',
          status: r.status,
          pixRewardValue: Number(r.pixRewardValue) || 50,
          pixStatus: r.pixStatus || 'pending',
          pixPaidAt: r.pixPaidAt,
          pixPaymentProof: r.pixPaymentProof,
          createdAt: r.createdAt,
        })));
      }
      if (rs.data) {
        setReferralActive(rs.data.isActive ?? true);
        setReferralRewardType(rs.data.rewardType || 'pix');
        setPixRewardValue(Number(rs.data.pixRewardValue) || 50);
        setMonthlyPixCap(Number(rs.data.monthlyPixCap) || 1000);
        if (rs.data.pixRewardByCategory) {
          setPixRewardByCategory(rs.data.pixRewardByCategory);
        }
        if (rs.data.eligibleCourseTypes?.length) {
          setEligibleCourseTypes(rs.data.eligibleCourseTypes);
        }
      }
      if (tm.data?.length) {
        setTurmas(tm.data.map((t: any) => ({
          id: t.id, title: t.title, slug: t.slug,
          minStudents: t.minStudents ?? 15,
          enrollmentCount: t.enrollmentCount ?? 0,
          tiers: t.tiers?.length ? t.tiers : DEFAULT_TIERS,
        })));
      } else {
        // fallback: use courses as turmas with defaults
        setTurmas(initialCourses.filter((c) => c.kind === 'Pós-graduação' || c.kind === 'Curso Livre').map((c) => ({
          id: String(c.id), title: c.title, slug: c.slug, minStudents: 15, enrollmentCount: 0, tiers: DEFAULT_TIERS,
        })));
      }
    });
  }, [token]);



  interface AdminUser {
    id: string | number;
    name: string;
    email: string;
    role: string;
  }
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [editingAdminUser, setEditingAdminUser] = useState<AdminUser | null>(null);
  
  // Fetch users in the token useEffect:
  useEffect(() => {
    if (!token) return;
    if (currentUser?.role === 'admin') {
      fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
          if (data.data) {
            setAdminUsers(data.data);
          }
        })
        .catch(() => {});
    }
  }, [token, currentUser]);

  async function saveAdminUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = String(form.get('name'));
    const email = String(form.get('email'));
    const role = String(form.get('role'));
    const password = String(form.get('password') || '');

    if (editingAdminUser) {
      try {
        const res = await fetch(`/api/admin/users/${editingAdminUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name, email, role, ...(password ? { password } : {}) }),
        });
        if (res.ok) {
          const updated = await res.json();
          setAdminUsers((prev) => prev.map((u) => u.id === editingAdminUser.id ? updated.data : u));
          setEditingAdminUser(null);
          showNotice('Usuário atualizado com sucesso.');
          formElement.reset();
        } else {
          const err = await res.json();
          alert('Erro ao atualizar usuário: ' + (err.error || 'Erro desconhecido'));
        }
      } catch {
        alert('Erro ao se conectar ao servidor.');
      }
    } else {
      if (!password) {
        alert('Senha é obrigatória para novos usuários.');
        return;
      }
      try {
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name, email, role, password }),
        });
        if (res.ok) {
          const created = await res.json();
          setAdminUsers((prev) => [...prev, created.data]);
          showNotice('Usuário cadastrado com sucesso.');
          formElement.reset();
        } else {
          const err = await res.json();
          alert('Erro ao cadastrar usuário: ' + (err.error || 'Erro desconhecido'));
        }
      } catch {
        alert('Erro ao se conectar ao servidor.');
      }
    }
  }

  async function deleteAdminUser(id: string | number) {
    if (!confirm('Deseja realmente excluir este usuário administrativo?')) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAdminUsers((prev) => prev.filter((u) => u.id !== id));
        showNotice('Usuário excluído com sucesso.');
      } else {
        const err = await res.json();
        alert('Erro ao excluir usuário: ' + (err.error || 'Erro desconhecido'));
      }
    } catch {
      alert('Erro de conexão.');
    }
  }

  function exportLeadsToCsv() {
    const csvRows = [];
    csvRows.push(['Nome', 'Telefone', 'Interesse', 'Modalidade', 'Codigo de Indicacao', 'Status', 'Origem'].join(';'));
    
    leads.forEach(lead => {
      const row = [
        lead.name.replace(/;/g, ','),
        lead.phone.replace(/;/g, ','),
        lead.interest.replace(/;/g, ','),
        lead.modality.replace(/;/g, ','),
        (lead.referralCode || '').replace(/;/g, ','),
        lead.status.replace(/;/g, ','),
        (lead.origin || '').replace(/;/g, ','),
      ];
      csvRows.push(row.join(';'));
    });

    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_instituto_sentidos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function uploadImage(file: File | null): Promise<string> {
    if (!file) return bannerPreview;
    const localUrl = await readFileAsDataUrl(file);
    setBannerPreview(localUrl);
    if (!token) return localUrl;
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
      if (res.ok) return (await res.json()).data.url as string;
    } catch { /* fallback */ }
    return localUrl;
  }

  async function saveBanner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const imageUrl = await uploadImage((form.get('image') as File | null) ?? null);
    const active = form.get('active') === 'Ativo';
    if (editingBanner) {
      const updated: Banner = { ...editingBanner, title: String(form.get('title')), subtitle: String(form.get('subtitle')), ctaLabel: String(form.get('ctaLabel')), ctaUrl: String(form.get('ctaUrl')), imageUrl: imageUrl || editingBanner.imageUrl, active };
      setBanners((prev) => prev.map((b) => b.id === editingBanner.id ? updated : b));
      if (token) fetch(`/api/admin/banners/${editingBanner.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ title: updated.title, subtitle: updated.subtitle, ctaLabel: updated.ctaLabel, ctaUrl: updated.ctaUrl, imageUrl: updated.imageUrl, isActive: updated.active }) }).catch(() => {});
      setEditingBanner(null);
      showNotice('Banner atualizado.');
    } else {
      const banner: Banner = { id: String(Date.now()), title: String(form.get('title')), subtitle: String(form.get('subtitle')), ctaLabel: String(form.get('ctaLabel')), ctaUrl: String(form.get('ctaUrl')), imageUrl, active };
      setBanners((prev) => [banner, ...prev]);
      if (token) fetch('/api/admin/banners', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...banner, isActive: active, sortOrder: 0, position: 'home_hero' }) }).catch(() => {});
      showNotice('Banner criado e aplicado na home.');
    }
    formElement.reset();
  }

  function deleteBanner(id: number | string) {
    if (!confirm('Excluir este banner?')) return;
    if (token) {
      fetch(`/api/admin/banners/${id}`, { 
        method: 'DELETE', 
        headers: { Authorization: `Bearer ${token}` } 
      })
      .then(res => {
        if (res.ok) {
          setBanners((prev) => prev.filter((b) => b.id !== id));
          showNotice('Banner excluído.');
        } else {
          res.json().then(err => alert('Erro ao excluir banner: ' + (err.error || 'Erro desconhecido')));
        }
      })
      .catch(() => alert('Erro de conexão com o servidor.'));
    }
  }

  async function saveCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (courseLoading) return;

    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    // ── Leitura dos campos ──────────────────────────────────────────────────
    const rawTitle     = String(form.get('title') || '').trim();
    const title        = rawTitle || 'Curso sem titulo';
    const kind         = String(form.get('kind') || 'Pós-graduação') as CourseKindType;
    const modalityUI   = parseModalityUI(String(form.get('modality') || 'Presencial'));
    const courseType   = courseTypeToApi({ kind, modality: modalityUI } as Course);
    const modalityDb   = mapModalityToDatabase(modalityUI, courseType);

    // Slug: mantém o existente ao editar (evita quebrar links/SEO)
    const courseSlug   = editingCourse
      ? editingCourse.slug
      : (slugify(rawTitle) || `curso-rascunho-${Date.now()}`);

    const enrollmentFee    = Number(form.get('enrollmentFee'))    || 0;
    const maxInstallments  = Number(form.get('maxInstallments'))  || 1;
    const installmentValue = Number(form.get('installmentValue')) || 0;
    const investmentText   = String(form.get('investment') || '');
    const price            = installmentValue > 0
      ? installmentValue * maxInstallments
      : numericPrice(investmentText);

    const about              = String(form.get('about')              || '');
    const syllabus           = String(form.get('syllabus')           || '');
    const leadConnectorFormId = String(form.get('leadConnectorFormId') || '');
    const mauticFormIdRaw = form.get('mauticFormId');
    const mauticFormId = mauticFormIdRaw ? parseInt(String(mauticFormIdRaw), 10) || null : null;
    const active             = form.get('active') === 'Ativo';
    const featured           = form.get('featured') === 'on';

    const parseJson = (s: string) => { try { return s ? JSON.parse(s) : null; } catch { return null; } };

    const apiPayload = {
      title,
      slug:                courseSlug,
      description:         String(form.get('summary') || ''),
      type:                courseType,
      modality:            modalityDb,
      workload:            String(form.get('workload') || ''),
      price,
      maxInstallments,
      enrollmentFee,
      installmentValue,
      area:                String(form.get('area') || ''),
      partnerInstitution:  'Instituto Sentidos',
      isFeatured:          featured,
      isActive:            active,
      videoUrl:            String(form.get('videoUrl')   || ''),
      about,
      syllabus:            syllabus || null,
      benefits:            parseJson(String(form.get('benefits')     || '')),
      modules:             parseJson(String(form.get('modules')      || '')),
      teachers:            parseJson(String(form.get('teachers')     || '')),
      testimonials:        parseJson(String(form.get('testimonials') || '')),
      leadConnectorFormId: leadConnectorFormId || null,
      mauticFormId,
      coverImageUrl:       courseCoverUrl || null,
    };

    if (!token) {
      showNotice('Sem autenticação — faça login novamente.');
      return;
    }

    setCourseLoading(true);
    try {
      const isEdit = !!editingCourse;
      const url    = isEdit ? `/api/admin/courses/${editingCourse.id}` : '/api/admin/courses';
      const method = isEdit ? 'PUT' : 'POST';

      const res  = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(apiPayload),
      });
      const json = await res.json();

      if (res.ok && json.data) {
        const saved = mapApiCourse(json.data);
        if (isEdit) {
          setCourses(prev => prev.map(c => c.id === editingCourse.id ? saved : c));
          showNotice('✅ Curso atualizado com sucesso!');
        } else {
          setCourses(prev => [saved, ...prev]);
          showNotice('✅ Curso cadastrado com sucesso!');
          formElement.reset();
        }
        // Limpar estado do editor
        setEditingCourse(null);
        setCourseAbout('');
        setCourseSyllabus('');
        setCourseCoverUrl('');
        const fresh = await fetch('/api/admin/courses', { headers: { Authorization: `Bearer ${token}` } });
        const freshJson = await fresh.json();
        if (fresh.ok && freshJson.data) setCourses(freshJson.data.map(mapApiCourse));
      } else {
        const msg = json.error || (json.details ? JSON.stringify(json.details) : 'Erro desconhecido');
        showNotice(`❌ Erro ao salvar: ${msg}`);
      }
    } catch (err) {
      showNotice('❌ Erro de conexão ao salvar curso. Verifique o servidor.');
    } finally {
      setCourseLoading(false);
    }
  }

  function deleteCourse(id: number | string) {
    if (!confirm('Tem certeza de que deseja excluir permanentemente este curso? Todos os dados vinculados a ele serão perdidos.')) return;
    if (token) {
      fetch(`/api/admin/courses/${id}`, { 
        method: 'DELETE', 
        headers: { Authorization: `Bearer ${token}` } 
      })
      .then(res => {
        if (res.ok) {
          setCourses((prev) => prev.filter((c) => c.id !== id));
          showNotice('Curso excluído definitivamente.');
        } else {
          res.json().then(err => alert('Erro ao excluir curso: ' + (err.error || 'Erro desconhecido')));
        }
      })
      .catch(() => alert('Erro de conexão com o servidor.'));
    }
  }

  function savePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const published = form.get('published') === 'on';
    const title = String(form.get('title'));
    const category = String(form.get('category'));
    const excerpt = String(form.get('excerpt'));

    if (editingPost) {
      const updated: BlogPost = { 
        ...editingPost, 
        title, 
        category, 
        excerpt, 
        published,
        content: editingPost.content || excerpt,
        tags: editingPost.tags || [],
        coverImageUrl: editingPost.coverImageUrl || '',
        publishedAt: editingPost.publishedAt || new Date().toISOString()
      };
      setPosts((prev) => prev.map((p) => p.id === editingPost.id ? updated : p));
      if (token) fetch(`/api/admin/blog-posts/${editingPost.id}`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, 
        body: JSON.stringify({ 
          title: updated.title, 
          excerpt: updated.excerpt, 
          category: updated.category, 
          content: updated.content,
          tags: updated.tags,
          coverImageUrl: updated.coverImageUrl,
          isPublished: updated.published 
        }) 
      }).catch(() => {});
      setEditingPost(null);
      showNotice('Post atualizado.');
    } else {
      const post: BlogPost = { 
        id: Date.now(), 
        title, 
        category, 
        excerpt, 
        published,
        content: excerpt,
        tags: [],
        coverImageUrl: '',
        publishedAt: new Date().toISOString()
      };
      setPosts((prev) => [post, ...prev]);
      if (token) fetch('/api/admin/blog-posts', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, 
        body: JSON.stringify({ 
          title: post.title, 
          slug: slugify(post.title), 
          excerpt: post.excerpt, 
          content: post.content, 
          category: post.category, 
          tags: [], 
          isPublished: post.published,
          coverImageUrl: ''
        }) 
      }).catch(() => {});
      showNotice('Post cadastrado.');
    }
    event.currentTarget.reset();
  }

  async function savePostAdvanced(isPublished: boolean) {
    if (!blogTitle.trim()) {
      alert('Por favor, insira o título do artigo.');
      return;
    }

    const slug = slugify(blogTitle);
    const tagsArray = blogKeywords.split(',').map(t => t.trim()).filter(Boolean);
    const publishedAtDate = blogDate ? new Date(blogDate) : new Date();

    const postData = {
      title: blogTitle,
      slug,
      excerpt: blogExcerpt || blogTitle,
      content: blogContent,
      category: blogCategory || 'Geral',
      tags: tagsArray,
      coverImageUrl: blogCoverUrl || '',
      isPublished
    };

    if (editingPost) {
      const updated: BlogPost = {
        ...editingPost,
        title: blogTitle,
        category: blogCategory || 'Geral',
        excerpt: blogExcerpt || blogTitle,
        published: isPublished,
        content: blogContent,
        tags: tagsArray,
        coverImageUrl: blogCoverUrl || '',
        publishedAt: publishedAtDate.toISOString()
      };
      setPosts((prev) => prev.map((p) => p.id === editingPost.id ? updated : p));
      if (token) {
        await fetch(`/api/admin/blog-posts/${editingPost.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(postData)
        }).catch(() => {});
      }
      showNotice('Post atualizado com sucesso.');
    } else {
      const post: BlogPost = {
        id: Date.now(),
        title: blogTitle,
        category: blogCategory || 'Geral',
        excerpt: blogExcerpt || blogTitle,
        published: isPublished,
        content: blogContent,
        tags: tagsArray,
        coverImageUrl: blogCoverUrl || '',
        publishedAt: publishedAtDate.toISOString()
      };
      setPosts((prev) => [post, ...prev]);
      if (token) {
        await fetch('/api/admin/blog-posts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(postData)
        }).catch(() => {});
      }
      showNotice('Post criado com sucesso.');
    }

    // Clear and return
    setEditingPost(null);
    setIsAdvancedEditor(false);
    resetBlogStates();
  }

  function deletePost(id: number | string) {
    if (!confirm('Excluir este post?')) return;
    if (token) {
      fetch(`/api/admin/blog-posts/${id}`, { 
        method: 'DELETE', 
        headers: { Authorization: `Bearer ${token}` } 
      })
      .then(res => {
        if (res.ok) {
          setPosts((prev) => prev.filter((p) => p.id !== id));
          showNotice('Post excluído.');
        } else {
          res.json().then(err => alert('Erro ao excluir post: ' + (err.error || 'Erro desconhecido')));
        }
      })
      .catch(() => alert('Erro de conexão com o servidor.'));
    }
  }

  function saveEbook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const mauticFormIdRaw = form.get('mauticFormId');
    const mauticFormId = mauticFormIdRaw ? parseInt(String(mauticFormIdRaw), 10) || null : null;
    const positionRaw = form.get('position');
    const position = positionRaw ? parseInt(String(positionRaw), 10) || 0 : 0;
    const category = String(form.get('category') || 'Livro Digital');
    const fileUrl = ebookFileUrl || (editingEbook?.fileUrl ?? '');

    if (editingEbook) {
      const updated: Ebook = {
        ...editingEbook,
        title: String(form.get('title')),
        description: String(form.get('description')),
        category,
        coverUrl: ebookCoverUrl || editingEbook.coverUrl,
        fileUrl,
        mauticFormId,
        pages: String(form.get('pages')),
        year: String(form.get('year')),
        position,
      };
      setEbooks((prev) => prev.map((e) => e.id === editingEbook.id ? updated : e));
      if (token) {
        fetch(`/api/admin/ebooks/${editingEbook.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            title: updated.title,
            description: updated.description,
            category: updated.category,
            coverUrl: updated.coverUrl,
            fileUrl: updated.fileUrl,
            mauticFormId: updated.mauticFormId,
            pages: updated.pages,
            year: updated.year,
            position: updated.position,
            isActive: updated.active,
          })
        }).catch(() => {});
      }
      setEditingEbook(null);
      setEbookCoverUrl('');
      setEbookFileUrl('');
      showNotice('E-book atualizado.');
    } else {
      const ebook: Ebook = {
        id: Date.now(),
        title: String(form.get('title')),
        description: String(form.get('description')),
        category,
        coverUrl: ebookCoverUrl || 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80',
        fileUrl,
        mauticFormId,
        pages: String(form.get('pages')),
        year: String(form.get('year')),
        position,
        active: true,
      };
      setEbooks((prev) => [...prev, ebook]);
      if (token) {
        fetch('/api/admin/ebooks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            title: ebook.title,
            description: ebook.description,
            category: ebook.category,
            coverUrl: ebook.coverUrl,
            fileUrl: ebook.fileUrl,
            mauticFormId: ebook.mauticFormId,
            pages: ebook.pages,
            year: ebook.year,
            position: ebook.position,
            isActive: true,
          })
        }).catch(() => {});
      }
      setEbookCoverUrl('');
      setEbookFileUrl('');
      showNotice('E-book cadastrado.');
    }
    event.currentTarget.reset();
  }

  function deleteEbook(id: number | string) {
    if (!confirm('Excluir este e-book?')) return;
    if (token) {
      fetch(`/api/admin/ebooks/${id}`, { 
        method: 'DELETE', 
        headers: { Authorization: `Bearer ${token}` } 
      })
      .then(res => {
        if (res.ok) {
          setEbooks((prev) => prev.filter((e) => e.id !== id));
          showNotice('E-book excluído.');
        } else {
          res.json().then(err => alert('Erro ao excluir e-book: ' + (err.error || 'Erro desconhecido')));
        }
      })
      .catch(() => alert('Erro de conexão com o servidor.'));
    }
  }

  function saveEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const modality = parseModalityUI(String(form.get('modality')));
    const active = form.get('active') === 'Ativo';
    if (editingEvent) {
      const updated: EventItem = {
        ...editingEvent,
        title: String(form.get('title')),
        modality,
        date: String(form.get('date')),
        description: String(form.get('description')),
        link: String(form.get('link') || ''),
        coverUrl: eventCoverUrl || editingEvent.coverUrl || '',
        active,
      };
      setEvents((prev) => prev.map((e) => e.id === editingEvent.id ? updated : e));
      if (token) {
        fetch(`/api/admin/events/${editingEvent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            title: updated.title,
            description: updated.description,
            modality: mapModalityToDatabase(modality),
            startsAt: updated.date,
            link: updated.link,
            coverUrl: updated.coverUrl,
            isActive: active,
          })
        }).catch(() => {});
      }
      setEditingEvent(null);
      setEventCoverUrl('');
      showNotice('Evento atualizado.');
    } else {
      const ev: EventItem = {
        id: String(Date.now()),
        title: String(form.get('title')),
        modality,
        date: String(form.get('date')),
        description: String(form.get('description')),
        link: String(form.get('link') || ''),
        coverUrl: eventCoverUrl || '',
        active,
        price: 0,
        slug: slugify(String(form.get('title'))),
      };
      setEvents((prev) => [ev, ...prev]);
      if (token) {
        fetch('/api/admin/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            title: ev.title,
            slug: ev.slug,
            description: ev.description,
            modality: mapModalityToDatabase(modality),
            startsAt: ev.date,
            link: ev.link,
            coverUrl: ev.coverUrl,
            price: 0,
            isActive: active,
          })
        }).catch(() => {});
      }
      setEventCoverUrl('');
      showNotice('Evento cadastrado.');
    }
    event.currentTarget.reset();
  }

  async function deleteLead(id: string) {
    if (!confirm('Tem certeza que deseja excluir este lead?')) return;
    try {
      const res = await fetch(`/api/admin/leads/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setLeads((prev) => prev.filter((l) => l.id !== id));
        showNotice('Lead excluído com sucesso.');
      } else {
        showNotice('❌ Erro ao excluir lead.');
      }
    } catch {
      showNotice('❌ Erro de conexão.');
    }
  }

  function deleteEvent(id: number | string) {
    if (!confirm('Excluir este evento?')) return;
    if (token) {
      fetch(`/api/admin/events/${id}`, { 
        method: 'DELETE', 
        headers: { Authorization: `Bearer ${token}` } 
      })
      .then(res => {
        if (res.ok) {
          setEvents((prev) => prev.filter((e) => e.id !== id));
          showNotice('Evento excluído.');
        } else {
          res.json().then(err => alert('Erro ao excluir evento: ' + (err.error || 'Erro desconhecido')));
        }
      })
      .catch(() => alert('Erro de conexão com o servidor.'));
    }
  }

  async function generateReferralCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const studentName = String(form.get('studentName'));
    const studentEmail = String(form.get('studentEmail'));

    if (token) {
      try {
        const res = await fetch('/api/admin/referral-codes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ studentName, studentEmail }),
        });
        if (res.ok) {
          const { data } = await res.json();
          setReferralCodes((prev) => [{ id: data.id, code: data.code, studentName: data.student?.name ?? studentName, studentEmail: data.student?.email ?? studentEmail, conversions: 0, isActive: true }, ...prev]);
          showNotice(`Código ${data.code} gerado com sucesso.`);
          formElement.reset();
          return;
        }
      } catch { /* fallback */ }
    }

    // Local fallback
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setReferralCodes((prev) => [{ id: Date.now(), code, studentName, studentEmail, conversions: 0, isActive: true }, ...prev]);
    showNotice(`Código ${code} gerado (modo local — não persistido no banco).`);
    formElement.reset();
  }

  async function saveReferralSettings() {
    if (!token) { showNotice('Configuração salva localmente.'); return; }
    await fetch('/api/admin/referral-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        isActive: referralActive,
        rewardType: referralRewardType,
        pixRewardValue,
        pixRewardByCategory,
        monthlyPixCap,
        eligibleCourseTypes,
      }),
    }).catch(() => {});
    showNotice('Configurações do Programa de Indicação PIX salvas com sucesso!');
  }

  if (!logged) {
    return (
      <div className="grid min-h-screen place-items-center bg-navy px-4">
        {resetToken ? (
          resetSuccess ? (
            <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-2xl text-center">
              <div className="flex justify-center mb-6">
                <img src={SITE_LOGO} alt="Instituto Sentidos" className="h-16 w-auto object-contain" />
              </div>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h1 className="font-display text-2xl font-bold text-navy">Senha Redefinida!</h1>
              <p className="mt-2 text-sm text-slate-600">Sua nova senha foi salva com sucesso. Você já pode fazer login no painel administrativo.</p>
              <button
                type="button"
                onClick={() => {
                  setResetToken('');
                  setResetSuccess(false);
                  window.history.replaceState({}, '', '/admin');
                }}
                className="mt-6 w-full rounded-lg bg-navy px-5 py-4 font-bold text-white transition hover:bg-blue-action"
              >
                Ir para o Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="w-full max-w-md rounded-lg bg-white p-8 shadow-2xl">
              <div className="flex justify-center mb-6">
                <img src={SITE_LOGO} alt="Instituto Sentidos" className="h-16 w-auto object-contain" />
              </div>
              <h1 className="text-center font-display text-2xl font-bold text-navy">Redefinir Senha</h1>
              <p className="mt-2 text-center text-sm text-slate-500">Digite sua nova senha de acesso.</p>
              {resetError && (
                <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700 font-medium">
                  {resetError}
                </div>
              )}
              <div className="mt-6 grid gap-4">
                <Field label="Nova Senha" name="newPassword" placeholder="******" type="password" required />
                <Field label="Confirmar Nova Senha" name="confirmPassword" placeholder="******" type="password" required />
              </div>
              <button className="mt-6 w-full rounded-lg bg-navy px-5 py-4 font-bold text-white transition hover:bg-blue-action">
                Salvar Nova Senha
              </button>
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setResetToken('');
                    window.history.replaceState({}, '', '/admin');
                  }}
                  className="text-sm font-semibold text-orange-primary hover:underline"
                >
                  Cancelar e ir para login
                </button>
              </div>
            </form>
          )
        ) : forgotPasswordMode ? (
          <form onSubmit={handleForgotPassword} className="w-full max-w-md rounded-lg bg-white p-8 shadow-2xl">
            <div className="flex justify-center mb-6">
              <img src={SITE_LOGO} alt="Instituto Sentidos" className="h-16 w-auto object-contain" />
            </div>
            <h1 className="text-center font-display text-2xl font-bold text-navy">Recuperar Senha</h1>
            <p className="mt-2 text-center text-sm text-slate-500">Informe seu e-mail para receber um link de recuperação.</p>
            <div className="mt-6 grid gap-4">
              <Field label="E-mail" name="email" placeholder="admin@isentidos.com.br" type="email" required />
            </div>
            <button className="mt-6 w-full rounded-lg bg-navy px-5 py-4 font-bold text-white transition hover:bg-blue-action">Enviar link de recuperação</button>
            <div className="mt-4 text-center">
              <button type="button" onClick={() => setForgotPasswordMode(false)} className="text-sm font-semibold text-orange-primary hover:underline">Voltar para o login</button>
            </div>
          </form>
        ) : (
          <form onSubmit={login} className="w-full max-w-md rounded-lg bg-white p-8 shadow-2xl">
            <div className="flex justify-center mb-6">
              <img src={SITE_LOGO} alt="Instituto Sentidos" className="h-16 w-auto object-contain" />
            </div>
            <h1 className="text-center font-display text-2xl font-bold text-navy">Painel Administrativo</h1>
            <p className="mt-2 text-center text-sm text-slate-500">Instituto Sentidos</p>
            <div className="mt-6 grid gap-4">
              <Field label="E-mail" name="email" placeholder="admin@isentidos.com.br" type="email" required autoComplete="username" />
              <Field label="Senha" name="password" placeholder="admin123" type="password" required autoComplete="current-password" />
            </div>
            <div className="mt-2 text-right">
              <button type="button" onClick={() => setForgotPasswordMode(true)} className="text-sm font-semibold text-orange-primary hover:underline">Esqueci a senha</button>
            </div>
            <button className="mt-6 w-full rounded-lg bg-navy px-5 py-4 font-bold text-white transition hover:bg-blue-action">Entrar</button>
            <a href="/" className="mt-4 block text-center text-sm font-bold text-orange-primary hover:text-orange-600 transition">Voltar ao site</a>
          </form>
        )}
      </div>
    );
  }

  const userRole = currentUser?.role ?? 'admin';

  const allTabs = [
    ['dashboard', 'Dashboard', LayoutDashboard],
    ['banners', 'Banners', ImagePlus],
    ['courses', 'Cursos', GraduationCap],
    ['blog', 'Blog', Newspaper],
    ['ebooks', 'E-books', Download],
    ['events', 'Eventos', CalendarDays],
    ['leads', 'Leads', Users],
    ['referrals', 'Indicações', Gift],
    ['turmas', 'Turmas', Users],
    ['users', 'Usuários', Users],
    ['settings', 'Configurações', Settings],
  ] as const;

  const tabs = allTabs.filter(([id]) => {
    if (userRole === 'editor') {
      return ['dashboard', 'banners', 'courses', 'blog', 'ebooks', 'events', 'leads'].includes(id);
    }
    if (userRole === 'consultant') {
      return ['dashboard', 'leads', 'referrals', 'turmas'].includes(id);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-slate-200 bg-white p-5 lg:flex lg:flex-col justify-between">
        <div>
          <a href="/" className="flex items-center justify-center p-2 mb-6">
            <img src={SITE_LOGO} alt="Instituto Sentidos" className="h-11 w-auto object-contain" />
          </a>
          <nav className="mt-8 grid gap-2 overflow-y-auto max-h-[calc(100vh-280px)]">
            {tabs.map(([id, label, Icon]) => (
              <button key={id} onClick={() => setActiveTab(id)} className={`flex items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-bold transition ${activeTab === id ? 'bg-navy text-white' : 'text-slate-600 hover:bg-bg-light hover:text-navy'}`}>
                <Icon className="h-5 w-5" />
                {label}
              </button>
            ))}
          </nav>
        </div>
        <div className="border-t border-slate-100 pt-4 mt-auto">
          <div className="mb-3 px-3 py-2 bg-slate-50 rounded-lg flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Usuário ativo</span>
            <span className="text-sm font-bold text-navy truncate">{currentUser?.name || 'Administrador'}</span>
            <span className="text-xs text-slate-500 capitalize">{currentUser?.role === 'admin' ? 'Administrador' : currentUser?.role === 'editor' ? 'Editor' : 'Consultor'}</span>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('isentidos_admin_token');
              localStorage.removeItem('isentidos_admin_user');
              setToken('');
              setLogged(false);
              setCurrentUser(null);
              showNotice('Sessão encerrada.');
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-red-600 transition hover:bg-red-50"
          >
            <LockKeyhole className="h-5 w-5" />
            Sair do Painel
          </button>
        </div>
      </aside>

      <main className="lg:pl-72">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setMobileMenuOpen(true)} 
                className="rounded-lg p-2 text-navy hover:bg-slate-50 lg:hidden"
                aria-label="Menu administrativo"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-orange-primary">Painel administrativo</p>
                <h1 className="font-display text-2xl font-bold text-navy">{tabs.find(([id]) => id === activeTab)?.[1] || 'Painel'}</h1>
              </div>
            </div>
            <a href="/" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-navy transition hover:border-orange-primary hover:text-orange-primary">Ver site</a>
          </div>
        </header>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden bg-slate-900/40 backdrop-blur-sm">
            <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white p-5 animate-slide-right">
              <div className="absolute right-4 top-4">
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-50"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="mb-6 flex items-center justify-start p-2">
                <img src={SITE_LOGO} alt="Instituto Sentidos" className="h-9 w-auto object-contain" />
              </div>
              <nav className="mt-4 grid gap-1 overflow-y-auto flex-1">
                {tabs.map(([id, label, Icon]) => (
                  <button 
                    key={id} 
                    onClick={() => { setActiveTab(id); setMobileMenuOpen(false); }} 
                    className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm font-bold transition ${activeTab === id ? 'bg-navy text-white' : 'text-slate-600 hover:bg-bg-light'}`}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </button>
                ))}
              </nav>
              <div className="border-t border-slate-100 pt-4 mt-auto">
                <div className="mb-3 px-3 py-2 bg-slate-50 rounded-lg flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Usuário ativo</span>
                  <span className="text-sm font-bold text-navy truncate">{currentUser?.name || 'Administrador'}</span>
                  <span className="text-xs text-slate-500 capitalize">{currentUser?.role === 'admin' ? 'Administrador' : currentUser?.role === 'editor' ? 'Editor' : 'Consultor'}</span>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    localStorage.removeItem('isentidos_admin_token');
                    localStorage.removeItem('isentidos_admin_user');
                    setToken('');
                    setLogged(false);
                    setCurrentUser(null);
                    showNotice('Sessão encerrada.');
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-red-600 hover:bg-red-50"
                >
                  <LockKeyhole className="h-5 w-5" />
                  Sair do Painel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="p-4 lg:p-8">
          {notice && <p className="mb-6 rounded-lg bg-green-50 p-3 text-sm font-semibold text-green-700">{notice}</p>}

          {activeTab === 'dashboard' && (
            <div className="grid gap-5 md:grid-cols-4">
              <AdminMetric icon={Users} label="Leads" value={String(leads.length)} />
              <AdminMetric icon={GraduationCap} label="Cursos ativos" value={String(courses.filter((c) => c.active).length)} />
              <AdminMetric icon={Newspaper} label="Posts" value={String(posts.length)} />
              <AdminMetric icon={Gift} label="Indicações geradas" value={String(referralCodes.length)} />
            </div>
          )}

          {activeTab === 'banners' && (
            <AdminGrid>
              <Panel title={editingBanner ? 'Editar banner' : 'Novo banner da home'}>
                <form key={editingBanner?.id ?? 'new-banner'} onSubmit={saveBanner} className="grid gap-4">
                  <Field label="Título" name="title" placeholder="Chamada principal" required defaultValue={editingBanner?.title} />
                  <TextArea label="Subtítulo" name="subtitle" placeholder="Texto de apoio do banner" required defaultValue={editingBanner?.subtitle} />
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Texto do botão" name="ctaLabel" placeholder="Conhecer cursos" required defaultValue={editingBanner?.ctaLabel} />
                    <Field label="Link do botão" name="ctaUrl" placeholder="#cursos" required defaultValue={editingBanner?.ctaUrl} />
                  </div>
                  <Select label="Status de Exibição" name="active" options={['Ativo', 'Inativo']} defaultValue={editingBanner === null || editingBanner.active ? 'Ativo' : 'Inativo'} />
                  <label className="block">
                    <span className="text-sm font-bold text-navy">Imagem do banner</span>
                    <input name="image" type="file" accept="image/*" onChange={(e) => { const f = e.currentTarget.files?.[0]; if (f) readFileAsDataUrl(f).then(setBannerPreview); }} className="mt-2 w-full rounded-lg border border-dashed border-slate-300 bg-bg-light px-4 py-4 text-sm" />
                  </label>
                  <div className="flex gap-3">
                    <button className="flex-1 rounded-lg bg-orange-primary px-5 py-3 font-bold text-white">{editingBanner ? 'Atualizar banner' : 'Salvar banner'}</button>
                    {editingBanner && <button type="button" onClick={() => setEditingBanner(null)} className="rounded-lg border border-slate-200 px-5 py-3 font-bold text-slate-600">Cancelar</button>}
                  </div>
                </form>
              </Panel>
              <Panel title="Banners cadastrados">
                <div className="overflow-hidden rounded-lg bg-navy text-white mb-4">
                  <img src={bannerPreview} alt="" className="h-40 w-full object-cover opacity-70" />
                </div>
                <ResourceList
                  items={banners.map((b) => ({ id: b.id, label: b.title, badge: b.active ? 'ativo' : 'inativo', badgeGreen: b.active }))}
                  onEdit={(id) => { const b = banners.find((x) => x.id === id); if (b) { setEditingBanner(b); setBannerPreview(b.imageUrl); } }}
                  onDelete={deleteBanner}
                />
              </Panel>
            </AdminGrid>
          )}

          {activeTab === 'courses' && (
            <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr] w-full min-w-0 items-start">

              {/* ── Painel Esquerdo: Formulário ──────────────────────────────── */}
              <div className="min-w-0 w-full">
                <div className="rounded-xl border border-slate-200 bg-white shadow-soft overflow-hidden">

                  {/* Header Sticky do Formulário */}
                  <div className="sticky top-0 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 bg-white/95 backdrop-blur px-5 py-4">
                    <div>
                      <h2 className="font-display text-lg font-bold text-navy flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-orange-primary" />
                        {editingCourse ? 'Editar Curso' : 'Novo Curso'}
                      </h2>
                      {editingCourse && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">
                          Editando: <span className="font-semibold text-navy">{editingCourse.title}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {editingCourse && (
                        <button
                          type="button"
                          onClick={() => { setEditingCourse(null); setCourseAbout(''); setCourseSyllabus(''); setCourseCoverUrl(''); }}
                          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                        >
                          Cancelar
                        </button>
                      )}
                      <button
                        form="course-cms-form"
                        type="submit"
                        disabled={courseLoading}
                        className="flex items-center gap-2 rounded-lg bg-orange-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-60 shadow-md shadow-orange-primary/20"
                      >
                        {courseLoading
                          ? <><span className="animate-spin inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Salvando...</>
                          : (editingCourse ? '✓ Atualizar Curso' : '+ Salvar Curso')}
                      </button>
                    </div>
                  </div>

                  {/* Formulário com Seções */}
                  <form id="course-cms-form" key={editingCourse?.id ?? 'new-course'} onSubmit={saveCourse} className="p-5 grid gap-5">

                    {/* ── Seção 1: Informações Básicas ─────────────────────── */}
                    <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
                      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-navy uppercase tracking-wide">
                        <BookOpen className="h-4 w-4 text-orange-primary" />
                        Informações Básicas
                      </h3>
                      <div className="grid gap-4">
                        <label className="block">
                          <span className="text-sm font-bold text-navy">Título do Curso <span className="text-red-400">*</span></span>
                          <input
                            name="title"
                            required
                            defaultValue={editingCourse?.title}
                            placeholder="Ex: Psicopedagogia Clínica e Institucional"
                            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-navy outline-none transition focus:border-orange-primary focus:ring-2 focus:ring-orange-primary/20"
                          />
                        </label>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Select
                            label="Tipo de Curso"
                            name="kind"
                            options={['Pós-graduação', 'Curso Livre', 'Mestrado EAD', 'Doutorado EAD']}
                            defaultValue={editingCourse?.kind || 'Pós-graduação'}
                          />
                          <Select
                            label="Modalidade"
                            name="modality"
                            options={['Online ao vivo', 'EAD', 'Presencial']}
                            defaultValue={editingCourse ? getModalityLabel(editingCourse.modality, editingCourse.kind) : 'Online ao vivo'}
                          />
                          <Field label="Área de Conhecimento" name="area" placeholder="Ex: Educação Inclusiva" defaultValue={editingCourse?.area} />
                          <Field label="Carga Horária Total" name="workload" placeholder="Ex: 360h" defaultValue={editingCourse?.workload} />
                        </div>
                      </div>
                    </section>

                    {/* ── Seção 2: Investimento ────────────────────────────── */}
                    <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
                      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-navy uppercase tracking-wide">
                        💰 Investimento
                      </h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <Field
                            label="Texto de Investimento (exibido nos cards e banners)"
                            name="investment"
                            placeholder="Ex: 12x de R$ 150,00 | ou | Consulte"
                            defaultValue={editingCourse?.investment}
                          />
                        </div>
                        <Field label="Valor de Matrícula (R$)" name="enrollmentFee" type="number" step="0.01" placeholder="0.00" defaultValue={editingCourse?.enrollmentFee} />
                        <Field label="Qtd. Parcelas / Mensalidades" name="maxInstallments" type="number" placeholder="12" defaultValue={editingCourse?.maxInstallments} />
                        <div className="sm:col-span-2">
                          <Field label="Valor de cada Mensalidade (R$)" name="installmentValue" type="number" step="0.01" placeholder="0.00" defaultValue={editingCourse?.installmentValue} />
                          <p className="mt-1.5 text-xs text-slate-500">💡 O preço total é calculado como: matrícula + (parcelas × mensalidade). Preencha os valores numéricos para a landing page; o "Texto de Investimento" é para exibição geral.</p>
                        </div>
                      </div>
                    </section>

                    {/* ── Seção 3: Imagem e Configurações de Exibição ──────── */}
                    <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
                      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-navy uppercase tracking-wide">
                        <ImagePlus className="h-4 w-4 text-orange-primary" />
                        Imagem e Configurações de Exibição
                      </h3>
                      <div className="grid gap-4">
                        <div>
                          <label className="mb-1.5 block text-sm font-bold text-navy">Imagem de Capa</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              name="coverImageUrl"
                              value={courseCoverUrl}
                              onChange={e => setCourseCoverUrl(e.target.value)}
                              placeholder="https://exemplo.com/capa.jpg"
                              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-navy outline-none transition focus:border-orange-primary focus:ring-2 focus:ring-orange-primary/20"
                            />
                            <label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-200">
                              <ImagePlus className="h-4 w-4" />
                              <span>Upload</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async e => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const fd = new FormData();
                                  fd.append('file', file);
                                  try {
                                    const r = await fetch('/api/admin/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
                                    const j = await r.json();
                                    if (j.data?.url) { setCourseCoverUrl(j.data.url); showNotice('Capa enviada com sucesso.'); }
                                  } catch { showNotice('❌ Erro ao fazer upload da capa.'); }
                                }}
                              />
                            </label>
                          </div>
                          {courseCoverUrl && (
                            <div className="mt-2 flex items-center gap-3">
                              <img src={courseCoverUrl} alt="Capa do curso" className="h-20 w-32 rounded-lg border object-cover shadow-sm" />
                              <button type="button" onClick={() => setCourseCoverUrl('')} className="text-xs text-red-500 hover:text-red-700 font-semibold">Remover</button>
                            </div>
                          )}
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Select
                            label="Status de Exibição"
                            name="active"
                            options={['Ativo', 'Inativo']}
                            defaultValue={editingCourse === null ? 'Ativo' : (editingCourse.active ? 'Ativo' : 'Inativo')}
                          />
                          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-orange-100 bg-orange-50 p-4 text-sm font-bold text-navy transition hover:bg-orange-100">
                            <input
                              name="featured"
                              type="checkbox"
                              defaultChecked={editingCourse?.featured}
                              className="h-4 w-4 accent-orange-primary"
                            />
                            <span>⭐ Destacar na Home</span>
                          </label>
                        </div>
                      </div>
                    </section>

                    {/* ── Seção 4: Conteúdo da Landing Page ───────────────── */}
                    <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
                      <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-navy uppercase tracking-wide">
                        <Newspaper className="h-4 w-4 text-orange-primary" />
                        Conteúdo da Landing Page
                      </h3>
                      <p className="mb-4 text-xs text-slate-500">O resumo aparece nos cards e no hero. Os editores ricos alimentam as abas da página do curso.</p>
                      <div className="grid gap-5">
                        <TextArea
                          label="Resumo (card + hero da landing page)"
                          name="summary"
                          placeholder="Descrição curta e objetiva — até 2 linhas."
                          defaultValue={editingCourse?.summary}
                        />
                        <input type="hidden" name="about"   value={courseAbout} />
                        <input type="hidden" name="syllabus" value={courseSyllabus} />
                        <RichTextEditor
                          label='Sobre o Curso (aba "Apresentação")'
                          value={courseAbout}
                          onChange={setCourseAbout}
                          placeholder="Descrição completa e detalhada do curso, objetivos, público-alvo..."
                        />
                        <RichTextEditor
                          label='Outras Informações (aba "Outras Informações" — duração, certificação, aulas, documentos)'
                          value={courseSyllabus}
                          onChange={setCourseSyllabus}
                          placeholder="Detalhes sobre metodologia, certificação, documentos necessários..."
                        />
                      </div>
                    </section>

                    {/* ── Seção 5: Conteúdo Estruturado ───────────────────── */}
                    <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
                      <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-navy uppercase tracking-wide">
                        <LibraryBig className="h-4 w-4 text-orange-primary" />
                        Conteúdo Estruturado
                      </h3>
                      <p className="mb-4 text-xs text-slate-500">Seções em branco ficam ocultas na landing page. Adicione pelo menos 1 item para que a seção apareça.</p>
                      <div className="grid gap-5">
                        <JsonListEditor
                          label="Benefícios do Curso"
                          name="benefits"
                          itemLabel="Benefício"
                          defaultValue={editingCourse?.benefits}
                          fields={[{ key: 'title', label: 'Título do Benefício' }, { key: 'description', label: 'Descrição Curta' }]}
                        />
                        <JsonListEditor
                          label="Matriz Curricular (Disciplinas)"
                          name="modules"
                          itemLabel="Disciplina"
                          defaultValue={editingCourse?.modules}
                          fields={[{ key: 'title', label: 'Nome da Disciplina' }, { key: 'description', label: 'Carga Horária / Detalhes (opcional)' }]}
                        />
                        <JsonListEditor
                          label="Corpo Docente (Professores)"
                          name="teachers"
                          itemLabel="Professor"
                          defaultValue={editingCourse?.teachers}
                          fields={[
                            { key: 'name',      label: 'Nome Completo' },
                            { key: 'role',      label: 'Cargo / Titulação' },
                            { key: 'bio',       label: 'Minicurrículo (opcional)' },
                            { key: 'avatarUrl', label: 'URL da Foto (opcional)' },
                          ]}
                        />
                        <JsonListEditor
                          label="Depoimentos de Alunos"
                          name="testimonials"
                          itemLabel="Depoimento"
                          defaultValue={editingCourse?.testimonials}
                          fields={[
                            { key: 'name',      label: 'Nome do Aluno' },
                            { key: 'role',      label: 'Profissão / Situação Atual' },
                            { key: 'text',      label: 'Texto do Depoimento' },
                            { key: 'avatarUrl', label: 'URL da Foto (opcional)' },
                          ]}
                        />
                      </div>
                    </section>

                    {/* ── Seção 6: CRM e Integrações ───────────────────────── */}
                    <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
                      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-navy uppercase tracking-wide">
                        <Share2 className="h-4 w-4 text-orange-primary" />
                        CRM e Integrações
                      </h3>
                      <div className="grid gap-4">
                        <Field
                          label="URL do Vídeo de Apresentação (YouTube)"
                          name="videoUrl"
                          placeholder="https://www.youtube.com/watch?v=..."
                          defaultValue={editingCourse?.videoUrl}
                        />
                        <div>
                          <Field
                            label="ID ou URL do Formulário LeadConnector / CRM"
                            name="leadConnectorFormId"
                            placeholder="Ex: m1woQ1eYGfimUdhQledm ou https://api.leadconnectorhq.com/widget/form/..."
                            defaultValue={editingCourse?.leadConnectorFormId}
                          />
                          <p className="mt-1.5 text-xs text-slate-500">Se vazio, usa automaticamente Pós-ao vivo para cursos Online/EAD e Pós-presencial para cursos presenciais. Preencha um ID ou URL completa para sobrescrever por curso.</p>
                        </div>
                        <Field
                          label="ID do Formulário Mautic (Opcional)"
                          name="mauticFormId"
                          type="number"
                          defaultValue={editingCourse?.mauticFormId ? String(editingCourse.mauticFormId) : ''}
                          placeholder="Ex: 7"
                        />
                      </div>
                    </section>

                    {/* ── Botão de Salvar (bottom) ─────────────────────────── */}
                    <div className="flex gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={courseLoading}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-primary py-3.5 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-60 shadow-lg shadow-orange-primary/25"
                      >
                        {courseLoading
                          ? <><span className="animate-spin inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Salvando...</>
                          : (editingCourse ? '✓ Atualizar Curso' : '+ Salvar Curso')}
                      </button>
                      {editingCourse && (
                        <button
                          type="button"
                          onClick={() => { setEditingCourse(null); setCourseAbout(''); setCourseSyllabus(''); setCourseCoverUrl(''); }}
                          className="rounded-xl border border-slate-200 px-6 py-3.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>

              {/* ── Painel Direito: Lista de Cursos ──────────────────────────── */}
              <div className="min-w-0 w-full xl:sticky xl:top-4">
                <div className="rounded-xl border border-slate-200 bg-white shadow-soft p-5">
                  {/* Cabeçalho da lista */}
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-display text-lg font-bold text-navy">Cursos Cadastrados</h2>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                      {courses.length} total
                    </span>
                  </div>

                  {/* Campo de Busca */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar por nome ou área..."
                      value={courseSearch}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCourseSearch(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-navy outline-none transition focus:border-orange-primary focus:ring-2 focus:ring-orange-primary/20 focus:bg-white"
                    />
                    {courseSearch && (
                      <button type="button" onClick={() => setCourseSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Lista Agrupada por Tipo */}
                  {(() => {
                    const q = courseSearch.toLowerCase().trim();
                    const filtered: Course[] = q
                      ? courses.filter((c: Course) =>
                          (c.title || '').toLowerCase().includes(q) ||
                          (c.area  || '').toLowerCase().includes(q) ||
                          (c.kind  || '').toLowerCase().includes(q)
                        )
                      : courses;

                    const sorted = (arr: Course[]) => [...arr].sort((a: Course, b: Course) => (a.title || '').localeCompare(b.title || '', 'pt-BR'));

                    const posPresencial = sorted(filtered.filter((c: Course) => c.kind === CourseKindType.POS && c.modality === ModalityType.PRESENTIAL));
                    const posOnline    = sorted(filtered.filter((c: Course) => c.kind === CourseKindType.POS && c.modality === ModalityType.ONLINE));
                    const cursoLivre   = sorted(filtered.filter((c: Course) => c.kind === CourseKindType.LIBRE));
                    const mestradoEad  = sorted(filtered.filter((c: Course) => c.kind === CourseKindType.MESTRADO));
                    const doutoradoEad = sorted(filtered.filter((c: Course) => c.kind === CourseKindType.DOUTORADO));

                    const total = posPresencial.length + posOnline.length + cursoLivre.length + mestradoEad.length + doutoradoEad.length;

                    if (total === 0) return (
                      <div className="rounded-xl bg-slate-50 py-10 text-center">
                        <GraduationCap className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                        <p className="text-sm font-semibold text-slate-500">
                          {q ? 'Nenhum curso encontrado para essa busca.' : 'Nenhum curso cadastrado ainda.'}
                        </p>
                        {q && (
                          <button type="button" onClick={() => setCourseSearch('')} className="mt-3 text-xs font-bold text-orange-primary hover:underline">
                            Limpar busca
                          </button>
                        )}
                      </div>
                    );

                    const renderGroup = (
                      sectionTitle: string,
                      items: Course[],
                      dotColor: string,
                      hasDivider: boolean
                    ) => {
                      if (items.length === 0) return null;
                      return (
                        <div key={sectionTitle}>
                          {hasDivider && <div className="my-4 border-t border-slate-100" />}
                          <div className="mb-2 flex items-center gap-2">
                            <span className={`inline-block h-2 w-2 rounded-full ${dotColor}`} />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                              {sectionTitle}
                              <span className="ml-2 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">{items.length}</span>
                            </h3>
                          </div>
                          <div className="space-y-1.5">
                            {items.map(c => (
                              <div
                                key={c.id}
                                className={`flex items-start gap-2 rounded-lg border p-3 transition ${
                                  editingCourse?.id === c.id
                                    ? 'border-orange-primary/40 bg-orange-50'
                                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-navy leading-snug">{c.title}</p>
                                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                                      {getModalityLabel(c.modality, c.kind)}
                                    </span>
                                    {c.featured && (
                                      <span className="rounded-full bg-yellow-50 px-2 py-0.5 text-[10px] font-bold text-yellow-600 border border-yellow-100">
                                        ⭐ destaque
                                      </span>
                                    )}
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${c.active ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-slate-100 text-slate-400'}`}>
                                      {c.active ? 'ativo' : 'inativo'}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex shrink-0 gap-1">
                                  <button
                                    onClick={() => {
                                      const found = courses.find((x: Course) => x.id === c.id);
                                      if (found) { setEditingCourse(found); window.scrollTo({ top: 0, behavior: 'smooth' }); }
                                    }}
                                    className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:border-blue-action hover:text-blue-action"
                                    title="Editar curso"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => deleteCourse(c.id)}
                                    className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:border-red-400 hover:text-red-500"
                                    title="Excluir curso"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    };

                    let dividerCount = 0;
                    const sections = [
                      { title: 'Pós-graduação Presencial', items: posPresencial, dot: 'bg-orange-primary' },
                      { title: 'Pós-graduação Online / EAD', items: posOnline,    dot: 'bg-blue-action'   },
                      { title: 'Cursos Livres',              items: cursoLivre,   dot: 'bg-green-500'     },
                      { title: 'Mestrado EAD',               items: mestradoEad,  dot: 'bg-indigo-500'    },
                      { title: 'Doutorado EAD',              items: doutoradoEad, dot: 'bg-violet-500'    },
                    ];

                    return (
                      <div>
                        {sections.map(s => {
                          if (s.items.length === 0) return null;
                          const hasDivider = dividerCount++ > 0;
                          return renderGroup(s.title, s.items, s.dot, hasDivider);
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'blog' && !isAdvancedEditor && (
            <AdminGrid>
              <Panel title={editingPost ? 'Editar post' : 'Novo artigo'}>
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      resetBlogStates();
                      setEditingPost(null);
                      setIsAdvancedEditor(true);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-50 border border-indigo-200 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100"
                  >
                    <span>Abrir Editor Completo com Assistente IA 🚀</span>
                  </button>
                </div>
                <form key={editingPost?.id ?? 'new-post'} onSubmit={savePost} className="grid gap-4">
                  <Field label="Título" name="title" placeholder="Título do artigo" required defaultValue={editingPost?.title} />
                  <Field label="Categoria" name="category" placeholder="Inclusão" required defaultValue={editingPost?.category} />
                  <TextArea label="Resumo" name="excerpt" placeholder="Resumo exibido no site" required defaultValue={editingPost?.excerpt} />
                  <label className="flex items-center gap-3 rounded-lg bg-bg-light p-4 text-sm font-bold text-navy">
                    <input name="published" type="checkbox" defaultChecked={editingPost?.published} className="h-4 w-4 accent-orange-primary" />
                    Publicar agora
                  </label>
                  <div className="flex gap-3">
                    <button className="flex-1 rounded-lg bg-orange-primary px-5 py-3 font-bold text-white">{editingPost ? 'Atualizar post' : 'Salvar post'}</button>
                    {editingPost && <button type="button" onClick={() => setEditingPost(null)} className="rounded-lg border border-slate-200 px-5 py-3 font-bold text-slate-600">Cancelar</button>}
                  </div>
                </form>
              </Panel>
              <Panel title="Posts">
                <ResourceList
                  items={posts.map((p) => ({ id: p.id, label: p.title, badge: p.published ? 'publicado' : 'rascunho', badgeGreen: p.published }))}
                  onEdit={(id) => {
                    const p = posts.find((x) => x.id === id);
                    if (p) {
                      setEditingPost(p);
                      setBlogTitle(p.title);
                      setBlogCategory(p.category);
                      setBlogDate(p.publishedAt ? new Date(p.publishedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
                      setBlogKeywords(p.tags ? p.tags.join(', ') : '');
                      setBlogExcerpt(p.excerpt);
                      setBlogContent(p.content || p.excerpt);
                      setBlogCoverUrl(p.coverImageUrl || '');
                      setBlogAltText('');
                      setIsAdvancedEditor(true);
                    }
                  }}
                  onDelete={deletePost}
                />
              </Panel>
            </AdminGrid>
          )}

          {activeTab === 'blog' && isAdvancedEditor && (
            <div className="grid gap-6">
              {/* Header Avançado */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl bg-white p-5 border border-slate-200 shadow-sm">
                <div>
                  <h2 className="font-display text-xl font-bold text-navy">Gerenciar Blog (Artigos)</h2>
                  <p className="text-sm text-slate-500">Crie rascunhos, use inteligência artificial, formate com o editor visual e agende publicações.</p>
                </div>
                <button
                  onClick={() => {
                    setIsAdvancedEditor(false);
                    setEditingPost(null);
                    resetBlogStates();
                  }}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  Voltar para Lista
                </button>
              </div>

              {/* Grid Principal do Editor */}
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Lado Esquerdo - Formulário Principal (2/3 de largura no LG) */}
                <div className="lg:col-span-2 grid gap-6">
                  {/* Campos do Post */}
                  <div className="rounded-xl bg-white p-6 border border-slate-200 shadow-sm">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className="mb-2 block text-sm font-bold text-navy">Título do Post</label>
                        <input
                          type="text"
                          value={blogTitle}
                          onChange={(e) => setBlogTitle(e.target.value)}
                          placeholder="Ex: Guia Prático de LIBRAS na Sala de Aula"
                          className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-primary/20 text-navy font-semibold"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-bold text-navy">Categoria (Ex: Notícias, Dicas, Inclusão)</label>
                        <input
                          type="text"
                          value={blogCategory}
                          onChange={(e) => setBlogCategory(e.target.value)}
                          placeholder="Ex: Inclusão"
                          className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-primary/20 text-navy font-semibold"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-bold text-navy">Data de Publicação</label>
                        <input
                          type="date"
                          value={blogDate}
                          onChange={(e) => setBlogDate(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-primary/20 text-navy font-semibold"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-2 block text-sm font-bold text-navy">Palavras-chave SEO (Separadas por vírgula)</label>
                        <input
                          type="text"
                          value={blogKeywords}
                          onChange={(e) => setBlogKeywords(e.target.value)}
                          placeholder="Ex: autismo, inclusão, aba, educação especial"
                          className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-primary/20 text-navy font-semibold"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-2 block text-sm font-bold text-navy">Resumo Rápido (Snippet / Excerpt)</label>
                        <textarea
                          rows={2}
                          value={blogExcerpt}
                          onChange={(e) => setBlogExcerpt(e.target.value)}
                          placeholder="Resumo curto exibido nos cards do blog..."
                          className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-primary/20 text-navy"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Editor Rich Text */}
                  <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-slate-50 border-b border-slate-200 p-3">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                        Conteúdo (Use o editor para formatar, adicionar vídeos, botões e imagens)
                      </span>
                    </div>
                    
                    {/* Barra de Menus (TinyMCE Style) */}
                    <div className="flex items-center gap-4 bg-slate-50 border-b border-slate-200 px-4 py-2 text-xs text-slate-600 font-semibold select-none overflow-x-auto">
                      <span className="cursor-pointer hover:text-navy">File</span>
                      <span className="cursor-pointer hover:text-navy">Edit</span>
                      <span className="cursor-pointer hover:text-navy">View</span>
                      <span className="cursor-pointer hover:text-navy">Insert</span>
                      <span className="cursor-pointer hover:text-navy">Format</span>
                      <span className="cursor-pointer hover:text-navy">Tools</span>
                      <span className="cursor-pointer hover:text-navy">Table</span>
                    </div>

                    {/* Toolbar de Formatação */}
                    <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 border-b border-slate-200 p-2 overflow-x-auto">
                      {/* Editor Modes */}
                      <button
                        type="button"
                        onClick={() => { setEditorMode('rich'); setEditorPreview(false); }}
                        className={`rounded px-2.5 py-1 text-xs font-bold transition ${editorMode === 'rich' && !editorPreview ? 'bg-orange-primary text-white' : 'text-slate-600 hover:bg-slate-200'}`}
                      >
                        Visual (WYSIWYG)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditorMode('code'); setEditorPreview(false); }}
                        className={`rounded px-2.5 py-1 text-xs font-bold transition ${editorMode === 'code' && !editorPreview ? 'bg-orange-primary text-white' : 'text-slate-600 hover:bg-slate-200'}`}
                      >
                        Código HTML (&lt;&gt;)
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditorPreview(!editorPreview)}
                        className={`rounded px-2.5 py-1 text-xs font-bold transition ${editorPreview ? 'bg-orange-primary text-white' : 'text-slate-600 hover:bg-slate-200'}`}
                      >
                        Visualizar Artigo (👁️)
                      </button>

                      <div className="h-5 w-px bg-slate-300 mx-1" />

                      {/* Format buttons */}
                      <button
                        type="button"
                        onClick={() => document.execCommand('bold', false)}
                        className="rounded p-1 text-slate-700 hover:bg-slate-200 font-bold"
                        title="Negrito"
                      >
                        <strong>B</strong>
                      </button>
                      <button
                        type="button"
                        onClick={() => document.execCommand('italic', false)}
                        className="rounded p-1 text-slate-700 hover:bg-slate-200 italic"
                        title="Itálico"
                      >
                        <em>I</em>
                      </button>
                      <button
                        type="button"
                        onClick={() => document.execCommand('underline', false)}
                        className="rounded p-1 text-slate-700 hover:bg-slate-200 underline"
                        title="Sublinhado"
                      >
                        <u>U</u>
                      </button>
                      <button
                        type="button"
                        onClick={() => document.execCommand('strikeThrough', false)}
                        className="rounded p-1 text-slate-700 hover:bg-slate-200 line-through"
                        title="Riscado"
                      >
                        S
                      </button>

                      <div className="h-5 w-px bg-slate-300 mx-1" />

                      <button
                        type="button"
                        onClick={() => {
                          const url = prompt('Insira a URL do link:');
                          if (url) document.execCommand('createLink', false, url);
                        }}
                        className="rounded p-1 text-slate-700 hover:bg-slate-200 font-semibold"
                        title="Inserir Link"
                      >
                        🔗
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const url = prompt('Insira a URL da imagem:');
                          if (url) document.execCommand('insertImage', false, url);
                        }}
                        className="rounded p-1 text-slate-700 hover:bg-slate-200"
                        title="Inserir Imagem"
                      >
                        🖼️
                      </button>

                      <div className="h-5 w-px bg-slate-300 mx-1" />

                      <button
                        type="button"
                        onClick={() => document.execCommand('justifyLeft', false)}
                        className="rounded p-1 text-slate-700 hover:bg-slate-200"
                        title="Alinhar à Esquerda"
                      >
                        ⬅️
                      </button>
                      <button
                        type="button"
                        onClick={() => document.execCommand('justifyCenter', false)}
                        className="rounded p-1 text-slate-700 hover:bg-slate-200"
                        title="Alinhar ao Centro"
                      >
                        ⬅️➡️
                      </button>
                      <button
                        type="button"
                        onClick={() => document.execCommand('justifyRight', false)}
                        className="rounded p-1 text-slate-700 hover:bg-slate-200"
                        title="Alinhar à Direita"
                      >
                        ➡️
                      </button>

                      <div className="h-5 w-px bg-slate-300 mx-1" />

                      <button
                        type="button"
                        onClick={() => document.execCommand('insertUnorderedList', false)}
                        className="rounded p-1 text-slate-700 hover:bg-slate-200"
                        title="Lista com Marcadores"
                      >
                        • List
                      </button>
                      <button
                        type="button"
                        onClick={() => document.execCommand('insertOrderedList', false)}
                        className="rounded p-1 text-slate-700 hover:bg-slate-200"
                        title="Lista Numerada"
                      >
                        1. List
                      </button>
                      
                      <div className="h-5 w-px bg-slate-300 mx-1" />
                      
                      <button
                        type="button"
                        onClick={() => {
                          const tag = prompt('Qual título? H2 ou H3:');
                          if (tag === 'H2' || tag === 'h2') document.execCommand('formatBlock', false, '<h2>');
                          if (tag === 'H3' || tag === 'h3') document.execCommand('formatBlock', false, '<h3>');
                        }}
                        className="rounded px-1.5 py-0.5 text-xs font-bold border border-slate-300 text-slate-700 hover:bg-slate-200"
                        title="Estilo de Título"
                      >
                        H2/H3
                      </button>
                    </div>

                    {/* Canvas do Editor */}
                    <div className="p-1">
                      {editorPreview ? (
                        <div className="min-h-[350px] bg-slate-50 p-6 overflow-y-auto">
                          <div className="mx-auto max-w-2xl rounded-xl bg-white p-8 shadow-sm border border-slate-100">
                            {blogCoverUrl && (
                              <img
                                src={blogCoverUrl}
                                alt={blogAltText || blogTitle}
                                className="mb-6 h-64 w-full rounded-xl object-cover"
                              />
                            )}
                            <span className="mb-3 inline-block rounded-full bg-orange-primary/10 px-3 py-1 text-xs font-bold text-orange-primary">
                              {blogCategory || 'Educação'}
                            </span>
                            <h1 className="font-display text-3xl font-bold text-navy mb-4">{blogTitle || 'Título Provisório'}</h1>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mb-6 font-semibold">
                              <span>Por Instituto Sentidos</span>
                              <span>•</span>
                              <span>{blogDate ? new Date(blogDate).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}</span>
                            </div>
                            <div
                              className="prose prose-slate max-w-none text-slate-700"
                              dangerouslySetInnerHTML={{ __html: blogContent || '<p className="italic text-slate-400">Escreva algo no editor para visualizar aqui...</p>' }}
                            />
                            {blogKeywords && (
                              <div className="mt-8 pt-4 border-t border-slate-150 flex flex-wrap gap-2">
                                {blogKeywords.split(',').map((tag, i) => (
                                  <span key={i} className="rounded bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                    #{tag.trim()}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : editorMode === 'rich' ? (
                        <div
                          contentEditable
                          dangerouslySetInnerHTML={{ __html: blogContent }}
                          onBlur={(e) => setBlogContent(e.currentTarget.innerHTML)}
                          className="min-h-[350px] bg-white p-6 outline-none text-slate-800 text-sm focus:ring-1 focus:ring-orange-primary/10 overflow-y-auto prose max-w-none"
                          style={{ fontFamily: 'Outfit, Inter, sans-serif' }}
                        />
                      ) : (
                        <textarea
                          value={blogContent}
                          onChange={(e) => setBlogContent(e.target.value)}
                          placeholder="Cole ou digite código HTML estruturado aqui..."
                          className="w-full min-h-[350px] bg-slate-900 text-green-400 font-mono text-sm p-6 outline-none focus:ring-1 focus:ring-orange-primary/10 border-0"
                        />
                      )}
                    </div>

                    <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 flex items-center justify-between text-xs text-slate-500 font-semibold">
                      <span>Status: {editingPost ? 'Editando post existente' : 'Novo rascunho'}</span>
                      <span>Caracteres: {blogContent.replace(/<[^>]*>/g, '').length}</span>
                    </div>
                  </div>
                </div>

                {/* Lado Direito - Assistente IA e Capa (1/3 de largura) */}
                <div className="grid gap-6">
                  {/* Assistente IA ISP */}
                  <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-6 shadow-sm">
                    <div className="mb-4 flex items-center gap-2">
                      <span className="grid h-8 w-8 place-items-center rounded bg-indigo-600 text-white font-bold text-sm">IA</span>
                      <div>
                        <h3 className="font-display text-sm font-bold text-indigo-950">Assistente IA ISP</h3>
                        <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Powered by OpenRouter / Gemini</p>
                      </div>
                    </div>
                    <p className="mb-4 text-xs text-indigo-900/80 leading-relaxed font-semibold">
                      Descreva o tema do artigo e a IA gerará um título ideal, categoria, palavras-chave e o rascunho completo formatado em HTML diretamente no editor.
                    </p>
                    <textarea
                      rows={4}
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Ex: Escreva sobre práticas inclusivas em sala de aula de ensino infantil para alunos com autismo..."
                      className="mb-4 w-full rounded-lg border border-indigo-200 bg-white px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-600/20 text-navy font-medium placeholder-indigo-300"
                    />
                    <button
                      type="button"
                      disabled={aiGenerating}
                      onClick={handleGenerateContent}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {aiGenerating ? 'Gerando artigo...' : 'Gerar Artigo com IA 🚀'}
                    </button>
                  </div>

                  {/* Capa do Artigo */}
                  <div className="rounded-xl bg-white p-6 border border-slate-200 shadow-sm grid gap-4">
                    <h3 className="font-display text-sm font-bold text-navy">Imagem de Capa (SEO)</h3>
                    
                    {blogCoverUrl && (
                      <div className="relative rounded-lg border border-slate-100 overflow-hidden bg-slate-50">
                        <img src={blogCoverUrl} alt="Capa" className="h-36 w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setBlogCoverUrl('')}
                          className="absolute top-2 right-2 rounded-full bg-slate-900/80 p-1.5 text-white hover:bg-slate-900 transition"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}

                    <div>
                      <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Fazer Upload ou Colar URL</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={blogCoverUrl}
                          onChange={(e) => setBlogCoverUrl(e.target.value)}
                          placeholder="https://exemplo.com/imagem.jpg"
                          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-orange-primary/20 text-navy"
                        />
                        <label className="cursor-pointer rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 transition flex items-center justify-center">
                          <span>Uploader</span>
                          <input
                            type="file"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const formData = new FormData();
                              formData.append('file', file);
                              try {
                                showNotice('Fazendo upload...');
                                const res = await fetch('/api/admin/upload', {
                                  method: 'POST',
                                  headers: { Authorization: `Bearer ${token}` },
                                  body: formData
                                });
                                const json = await res.json();
                                if (json.data?.url) {
                                  setBlogCoverUrl(json.data.url);
                                  showNotice('Imagem de capa enviada.');
                                }
                              } catch {
                                alert('Erro ao fazer upload da imagem.');
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Texto Alternativo da Imagem (SEO)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={blogAltText}
                          onChange={(e) => setBlogAltText(e.target.value)}
                          placeholder="Ex: Crianças sentadas brincando de lego em roda"
                          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-orange-primary/20 text-navy"
                        />
                        <button
                          type="button"
                          disabled={aiAltGenerating}
                          onClick={async () => {
                            if (!blogTitle) { alert('Informe o título do post primeiro para gerar um alt text.'); return; }
                            setAiAltGenerating(true);
                            try {
                              const res = await fetch('/api/admin/blog-posts/generate-alt', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                body: JSON.stringify({ prompt: blogTitle })
                              });
                              const json = await res.json();
                              if (json.data?.altText) {
                                setBlogAltText(json.data.altText);
                              }
                            } catch {
                              alert('Erro ao gerar texto alternativo.');
                            } finally {
                              setAiAltGenerating(false);
                            }
                          }}
                          className="rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-100 transition"
                        >
                          {aiAltGenerating ? '...' : 'Gerar'}
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4">
                      <label className="mb-1 block text-[10px] font-bold text-indigo-500 uppercase tracking-wide">Ou gerar capa com IA</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={aiCoverPrompt}
                          onChange={(e) => setAiCoverPrompt(e.target.value)}
                          placeholder="Ex: Sala de aula colorida com brinquedos"
                          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-600/20 text-navy"
                        />
                        <button
                          type="button"
                          disabled={aiCoverGenerating}
                          onClick={async () => {
                            if (!aiCoverPrompt.trim()) { alert('Informe o prompt da imagem.'); return; }
                            setAiCoverGenerating(true);
                            try {
                              const res = await fetch('/api/admin/blog-posts/generate-cover', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                body: JSON.stringify({ prompt: aiCoverPrompt })
                              });
                              const json = await res.json();
                              if (json.data?.url) {
                                setBlogCoverUrl(json.data.url);
                                showNotice('Capa gerada por inteligência artificial com sucesso.');
                              }
                            } catch {
                              alert('Erro ao gerar imagem.');
                            } finally {
                              setAiCoverGenerating(false);
                            }
                          }}
                          className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-750 transition"
                        >
                          {aiCoverGenerating ? '...' : 'Gerar'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botões de Ação do Editor Avançado */}
              <div className="flex flex-wrap items-center justify-end gap-3 rounded-xl bg-white p-5 border border-slate-200 shadow-sm">
                <button
                  type="button"
                  onClick={() => savePostAdvanced(true)}
                  className="rounded-lg bg-orange-primary px-6 py-3 font-bold text-white transition hover:bg-orange-600 shadow-sm"
                >
                  Publicar Artigo Agora 🚀
                </button>
                <button
                  type="button"
                  onClick={() => savePostAdvanced(false)}
                  className="rounded-lg bg-slate-800 px-6 py-3 font-bold text-white transition hover:bg-slate-900"
                >
                  Salvar Rascunho 💾
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Limpar editor e começar de novo?')) {
                      resetBlogStates();
                      setEditingPost(null);
                    }
                  }}
                  className="rounded-lg border border-slate-200 px-5 py-3 font-bold text-slate-500 hover:bg-slate-50 transition"
                >
                  Novo Post (Limpar)
                </button>
              </div>
            </div>
          )}

          {activeTab === 'ebooks' && (
            <AdminGrid>
              <Panel title={editingEbook ? 'Editar e-book' : 'Novo e-book'}>
                <form key={editingEbook?.id ?? 'new-ebook'} onSubmit={saveEbook} className="grid gap-4">
                  <Field label="Título" name="title" placeholder="Nome do material" required defaultValue={editingEbook?.title} />
                  <TextArea label="Descrição" name="description" placeholder="Descrição do e-book" required defaultValue={editingEbook?.description} />
                  <div className="grid gap-4 md:grid-cols-2">
                    <Select label="Categoria" name="category" options={['Livro Digital', 'Anais de Eventos']} defaultValue={editingEbook?.category} />
                    <Field label="ID do Formulário Mautic" name="mauticFormId" type="number" placeholder="Ex: 7" defaultValue={editingEbook?.mauticFormId ? String(editingEbook.mauticFormId) : ''} />
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="Páginas" name="pages" placeholder="Ex: 156 páginas" defaultValue={editingEbook?.pages} />
                    <Field label="Ano" name="year" placeholder="Ex: 2024" defaultValue={editingEbook?.year} />
                    <Field label="Posição (Ordenação)" name="position" type="number" placeholder="Ex: 0" defaultValue={editingEbook?.position ? String(editingEbook.position) : '0'} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">Imagem de Capa (Upload ou URL)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={ebookCoverUrl}
                        onChange={(e) => setEbookCoverUrl(e.target.value)}
                        placeholder={editingEbook?.coverUrl || 'https://exemplo.com/capa.jpg'}
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-primary/20 text-navy"
                      />
                      <label className="cursor-pointer rounded-lg bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 transition flex items-center justify-center">
                        <span>Fazer Upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const formData = new FormData();
                            formData.append('file', file);
                            try {
                              const res = await fetch('/api/admin/upload', {
                                method: 'POST',
                                headers: { Authorization: `Bearer ${token}` },
                                body: formData
                              });
                              const json = await res.json();
                              if (json.data?.url) {
                                setEbookCoverUrl(json.data.url);
                                showNotice('Capa enviada com sucesso.');
                              }
                            } catch {
                              alert('Erro ao fazer upload da capa.');
                            }
                          }}
                        />
                      </label>
                    </div>
                    {ebookCoverUrl && (
                      <div className="mt-2">
                        <img src={ebookCoverUrl} alt="Visualização da Capa" className="h-24 rounded-lg border object-cover shadow-sm" />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">Link do Arquivo PDF (URL ou Upload)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={ebookFileUrl}
                        onChange={(e) => setEbookFileUrl(e.target.value)}
                        placeholder={editingEbook?.fileUrl || 'https://exemplo.com/arquivo.pdf'}
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-primary/20 text-navy"
                      />
                      <label className="cursor-pointer rounded-lg bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 transition flex items-center justify-center">
                        <span>Upload PDF</span>
                        <input
                          type="file"
                          accept=".pdf,application/pdf"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const formData = new FormData();
                            formData.append('file', file);
                            try {
                              const res = await fetch('/api/admin/upload', {
                                method: 'POST',
                                headers: { Authorization: `Bearer ${token}` },
                                body: formData
                              });
                              const json = await res.json();
                              if (json.data?.url) {
                                setEbookFileUrl(json.data.url);
                                showNotice('PDF enviado com sucesso.');
                              }
                            } catch {
                              alert('Erro ao fazer upload do PDF.');
                            }
                          }}
                        />
                      </label>
                    </div>
                    {(ebookFileUrl || editingEbook?.fileUrl) && (
                      <p className="mt-1 text-xs text-slate-500 truncate">Atual: {ebookFileUrl || editingEbook?.fileUrl}</p>
                    )}
                  </div>

                  <div className="flex gap-3 mt-2">
                    <button className="flex-1 rounded-lg bg-orange-primary px-5 py-3 font-bold text-white">{editingEbook ? 'Atualizar e-book' : 'Salvar e-book'}</button>
                    {editingEbook && <button type="button" onClick={() => { setEditingEbook(null); setEbookCoverUrl(''); setEbookFileUrl(''); }} className="rounded-lg border border-slate-200 px-5 py-3 font-bold text-slate-600">Cancelar</button>}
                  </div>
                </form>
              </Panel>
              <Panel title="E-books Cadastrados">
                <ResourceList
                  items={ebooks.map((e) => ({
                    id: e.id,
                    label: `${e.position !== undefined ? `[${e.position}] ` : ''}${e.title}`,
                    badge: `${e.category} ${e.mauticFormId ? `(Mautic Form ID: ${e.mauticFormId})` : '(Sem Mautic)'}`,
                    badgeGreen: e.active
                  }))}
                  onEdit={(id) => { const e = ebooks.find((x) => x.id === id); if (e) { setEditingEbook(e); setEbookCoverUrl(e.coverUrl || ''); setEbookFileUrl(e.fileUrl || ''); } }}
                  onDelete={deleteEbook}
                />
              </Panel>
            </AdminGrid>
          )}

          {activeTab === 'events' && (
            <AdminGrid>
              <Panel title={editingEvent ? 'Editar evento' : 'Novo evento'}>
                <form key={editingEvent?.id ?? 'new-event'} onSubmit={saveEvent} className="grid gap-4">
                  <Field label="Título" name="title" placeholder="Nome do evento" required defaultValue={editingEvent?.title} />
                  <div className="grid gap-4 md:grid-cols-3">
                    <Select label="Modalidade" name="modality" options={['Presencial', 'Online ao vivo']} defaultValue={editingEvent?.modality} />
                    <Field label="Data" name="date" placeholder="06/06/2026" required defaultValue={editingEvent?.date} />
                    <label className="block">
                      <span className="text-sm font-bold text-navy">Status</span>
                      <select name="active" defaultValue={editingEvent ? (editingEvent.active ? 'Ativo' : 'Inativo') : 'Ativo'} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none ring-orange-primary/20 transition focus:ring-4 text-navy">
                        <option value="Ativo">Ativo (Exibir no site)</option>
                        <option value="Inativo">Inativo (Ocultar no site)</option>
                      </select>
                    </label>
                  </div>
                  <Field label="Link de Inscrição / Participação (Opcional)" name="link" placeholder="https://..." defaultValue={editingEvent?.link} />
                  
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">Imagem de Capa (Upload ou URL)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        name="coverUrl"
                        value={eventCoverUrl}
                        onChange={(e) => setEventCoverUrl(e.target.value)}
                        placeholder="https://exemplo.com/capa.jpg"
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-primary/20 text-navy"
                      />
                      <label className="cursor-pointer rounded-lg bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 transition flex items-center justify-center">
                        <span>Fazer Upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const formData = new FormData();
                            formData.append('file', file);
                            try {
                              const res = await fetch('/api/admin/upload', {
                                method: 'POST',
                                headers: { Authorization: `Bearer ${token}` },
                                body: formData
                              });
                              const json = await res.json();
                              if (json.data?.url) {
                                setEventCoverUrl(json.data.url);
                                showNotice('Capa do evento enviada com sucesso.');
                              }
                            } catch {
                              alert('Erro ao fazer upload da capa do evento.');
                            }
                          }}
                        />
                      </label>
                    </div>
                    {eventCoverUrl && (
                      <div className="mt-2">
                        <img src={eventCoverUrl} alt="Visualização da Capa" className="h-24 rounded-lg border object-cover shadow-sm" />
                      </div>
                    )}
                  </div>

                  <TextArea label="Descrição" name="description" placeholder="Resumo do evento" required defaultValue={editingEvent?.description} />
                  <div className="flex gap-3">
                    <button className="flex-1 rounded-lg bg-orange-primary px-5 py-3 font-bold text-white">{editingEvent ? 'Atualizar evento' : 'Salvar evento'}</button>
                    {editingEvent && <button type="button" onClick={() => { setEditingEvent(null); setEventCoverUrl(''); }} className="rounded-lg border border-slate-200 px-5 py-3 font-bold text-slate-600">Cancelar</button>}
                  </div>
                </form>
              </Panel>
              <Panel title="Eventos">
                <ResourceList
                  items={events.map((e) => ({ id: e.id, label: e.title, sub: `${e.modality} · ${e.date}`, badge: e.active ? 'ativo' : 'inativo', badgeGreen: e.active }))}
                  onEdit={(id) => { const e = events.find((x) => x.id === id); if (e) { setEditingEvent(e); setEventCoverUrl(e.coverUrl || ''); } }}
                  onDelete={deleteEvent}
                />
              </Panel>
            </AdminGrid>
          )}

          {activeTab === 'leads' && (
            <div className="grid gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="font-display text-2xl font-bold text-navy">Leads Capturados</h2>
                <button
                  onClick={exportLeadsToCsv}
                  className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-bold text-white transition hover:bg-green-700 shadow-md shadow-green-500/20"
                >
                  <Download className="h-5 w-5" /> Exportar Leads (Excel / CSV)
                </button>
              </div>
              <Panel title="Lista de Leads">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-bg-light text-xs uppercase text-slate-500">
                    <tr>
                      <th className="p-3">Nome</th>
                      <th className="p-3">Interesse</th>
                      <th className="p-3">Modalidade</th>
                      <th className="p-3">Indicação</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Origem</th>\n                      <th className="p-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead.id} className="border-b border-slate-100">
                        <td className="p-3">
                          <strong className="block text-navy">{lead.name}</strong>
                          <span className="text-slate-500">{lead.phone}</span>
                        </td>
                        <td className="p-3">{lead.interest}</td>
                        <td className="p-3">{getModalityLabel(lead.modality as any)}</td>
                        <td className="p-3">{lead.referralCode ? <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-bold text-orange-700">{lead.referralCode}</span> : <span className="text-slate-400">—</span>}</td>
                        <td className="p-3"><StatusBadge status={lead.status} /></td>
                        <td className="p-3">{lead.origin}</td>
                        <td className="p-3 text-right">
                          <button onClick={() => deleteLead(lead.id)} className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500" title="Excluir lead">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
            </div>
          )}

          {activeTab === 'referrals' && (
            <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
              <Panel title="Configurações do Programa Indique e Ganhe no PIX">
                <div className="grid gap-5">
                  <div className="flex items-center justify-between rounded-lg bg-bg-light p-4">
                    <div>
                      <p className="font-bold text-navy">Sistema de indicação PIX</p>
                      <p className="mt-1 text-sm text-slate-500">Permite que indicadores gerem links e recebam valores via PIX por matrículas</p>
                    </div>
                    <button onClick={() => setReferralActive((v) => !v)} className={`relative h-6 w-12 rounded-full transition-colors ${referralActive ? 'bg-orange-primary' : 'bg-slate-300'}`}>
                      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${referralActive ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-bold text-navy">Tipo de Recompensa</span>
                      <select value={referralRewardType} onChange={(e) => setReferralRewardType(e.target.value as any)} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none ring-orange-primary/20 transition focus:ring-4 text-navy">
                        <option value="pix">Pagamento em Dinheiro via PIX</option>
                        <option value="desconto">Desconto em Mensalidade (Legado)</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-sm font-bold text-navy">Teto Mensal por Indicador (R$)</span>
                      <input type="number" min={0} value={monthlyPixCap} onChange={(e) => setMonthlyPixCap(Number(e.target.value))} className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 outline-none ring-orange-primary/20 transition focus:ring-4 font-bold text-navy" />
                      <span className="mt-1 block text-xs text-slate-500">Valor máximo aprovado por mês para um mesmo indicador (padrão R$ 1.000,00). Excedente fica em status capped.</span>
                    </label>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <h4 className="font-bold text-navy text-sm mb-3">Valor da Comissão PIX por Categoria de Curso (R$)</h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-xs font-semibold text-slate-600">Cursos Livres / Extensão</span>
                        <input type="number" min={0} value={pixRewardByCategory.livre ?? 50} onChange={(e) => setPixRewardByCategory(prev => ({ ...prev, livre: Number(e.target.value) }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none text-navy font-bold" />
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold text-slate-600">ISP Preparatórios (ENEM & Concursos)</span>
                        <input type="number" min={0} value={pixRewardByCategory.preparatorio ?? 50} onChange={(e) => setPixRewardByCategory(prev => ({ ...prev, preparatorio: Number(e.target.value) }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none text-navy font-bold" />
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold text-slate-600">Pós-Graduação Lato Sensu (Presencial)</span>
                        <input type="number" min={0} value={pixRewardByCategory.pos_presencial ?? 50} onChange={(e) => setPixRewardByCategory(prev => ({ ...prev, pos_presencial: Number(e.target.value) }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none text-navy font-bold" />
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold text-slate-600">Pós-Graduação Lato Sensu (Online)</span>
                        <input type="number" min={0} value={pixRewardByCategory.pos_online ?? 50} onChange={(e) => setPixRewardByCategory(prev => ({ ...prev, pos_online: Number(e.target.value) }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none text-navy font-bold" />
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold text-slate-600">Mestrado EAD (Stricto Sensu)</span>
                        <input type="number" min={0} value={pixRewardByCategory.mestrado_ead ?? 50} onChange={(e) => setPixRewardByCategory(prev => ({ ...prev, mestrado_ead: Number(e.target.value) }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none text-navy font-bold" />
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold text-slate-600">Doutorado EAD (Stricto Sensu)</span>
                        <input type="number" min={0} value={pixRewardByCategory.doutorado_ead ?? 50} onChange={(e) => setPixRewardByCategory(prev => ({ ...prev, doutorado_ead: Number(e.target.value) }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none text-navy font-bold" />
                      </label>
                      <label className="block sm:col-span-2">
                        <span className="text-xs font-semibold text-slate-600">Supletivo EJA (Ensino Fundamental e Médio)</span>
                        <input type="number" min={0} value={pixRewardByCategory.supletivo_eja ?? 50} onChange={(e) => setPixRewardByCategory(prev => ({ ...prev, supletivo_eja: Number(e.target.value) }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none text-navy font-bold" />
                      </label>
                    </div>
                  </div>

                  <button onClick={saveReferralSettings} className="rounded-lg bg-orange-primary px-5 py-3 font-bold text-white shadow-md shadow-orange-primary/20">Salvar Configurações de Indicação PIX</button>
                </div>
              </Panel>

              <Panel title="Gerar código de indicação">
                <form onSubmit={generateReferralCode} className="grid gap-4">
                  <Field label="Nome do aluno/indicador" name="studentName" placeholder="Maria da Silva" required />
                  <Field label="E-mail do aluno/indicador" name="studentEmail" placeholder="aluno@email.com" type="email" required />
                  <button className="rounded-lg bg-orange-primary px-5 py-3 font-bold text-white">
                    <span className="flex items-center justify-center gap-2"><Share2 className="h-4 w-4" /> Gerar link de indicação</span>
                  </button>
                </form>
              </Panel>

              <div className="xl:col-span-2">
                <Panel title="Gestão de Indicações & Pagamentos PIX">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <p className="text-xs text-slate-500 font-medium">Aprovação de matrículas, cálculo de comissões e confirmação manual de pagamentos PIX.</p>
                    <button
                      onClick={async () => {
                        if (!token) { showNotice('Modo local ativo.'); return; }
                        try {
                          const res = await fetch('/api/admin/referrals/reevaluate-capped', {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${token}` }
                          });
                          const data = await res.json();
                          if (data.success) {
                            showNotice(`Reavaliação concluída! ${data.promotedCount} indicação(ões) promovidas a Aprovadas.`);
                            // Refresh referrals
                            const refRes = await fetch('/api/admin/referrals', { headers: { Authorization: `Bearer ${token}` } });
                            if (refRes.ok) {
                              const refData = await refRes.json();
                              if (refData.data) {
                                setAllReferrals(refData.data.map((r: any) => ({
                                  id: r.id, leadName: r.lead?.name || 'Anônimo', leadEmail: r.lead?.email || '', leadPhone: r.lead?.phone || '',
                                  courseTitle: r.lead?.course?.title || 'Curso Instituto Sentidos', courseType: r.lead?.course?.type || 'Geral',
                                  studentName: r.referralCode?.student?.name || 'Desconhecido', studentEmail: r.referralCode?.student?.email || '',
                                  code: r.referralCode?.code || '-', pixKey: r.referralCode?.pixKey || null, pixKeyType: r.referralCode?.pixKeyType || 'cpf',
                                  status: r.status, pixRewardValue: Number(r.pixRewardValue) || 50, pixStatus: r.pixStatus || 'pending',
                                  pixPaidAt: r.pixPaidAt, pixPaymentProof: r.pixPaymentProof, createdAt: r.createdAt
                                })));
                              }
                            }
                          }
                        } catch { showNotice('Erro ao reavaliar indicações.'); }
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700 transition"
                    >
                      <Sparkles className="h-4 w-4" /> Reavaliar Teto de Início de Mês (Capped)
                    </button>
                  </div>

                  {allReferrals.length === 0 ? (
                    <p className="rounded-lg bg-bg-light p-6 text-center text-sm text-slate-500">Nenhuma indicação registrada.</p>
                  ) : (
                    <div className="overflow-x-auto mt-4">
                      <table className="w-full min-w-[850px] text-left text-sm">
                        <thead className="bg-bg-light text-xs uppercase text-slate-500">
                          <tr>
                            <th className="p-3">Indicado (Lead) & Curso</th>
                            <th className="p-3">Embaixador & Chave PIX</th>
                            <th className="p-3">Valor PIX</th>
                            <th className="p-3">Status do PIX</th>
                            <th className="p-3 text-right">Ação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allReferrals.map((r) => {
                            let badge = (
                              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200">
                                Pendente (Aguardando Matrícula)
                              </span>
                            );
                            if (r.pixStatus === 'paid') {
                              badge = (
                                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700 border border-green-200">
                                  PIX Pago
                                </span>
                              );
                            } else if (r.pixStatus === 'approved') {
                              badge = (
                                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                                  Matrícula Confirmada (PIX Liberado)
                                </span>
                              );
                            } else if (r.pixStatus === 'capped') {
                              badge = (
                                <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700 border border-purple-200">
                                  Aguardando Próximo Mês (Acima do Teto)
                                </span>
                              );
                            }

                            return (
                              <tr key={r.id} className="border-b border-slate-100">
                                <td className="p-3">
                                  <strong className="block text-navy">{r.leadName}</strong>
                                  <span className="text-slate-500 text-xs">{r.leadEmail}</span>
                                  <span className="block text-xs font-semibold text-orange-primary mt-0.5">{r.courseTitle}</span>
                                </td>
                                <td className="p-3">
                                  <strong className="block text-navy">{r.studentName}</strong>
                                  <span className="text-slate-500 text-xs">Código: {r.code}</span>
                                  {r.pixKey ? (
                                    <div className="mt-1 flex items-center gap-1">
                                      <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-navy">
                                        PIX [{r.pixKeyType?.toUpperCase()}]: {r.pixKey}
                                      </span>
                                      <button
                                        onClick={() => { navigator.clipboard.writeText(r.pixKey); showNotice('Chave PIX copiada!'); }}
                                        className="text-xs text-orange-primary hover:underline font-bold"
                                      >
                                        Copiar
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="block text-xs text-amber-600 font-semibold mt-0.5">Sem chave PIX cadastrada</span>
                                  )}
                                </td>
                                <td className="p-3 font-bold text-navy">
                                  R$ {Number(r.pixRewardValue || 50).toFixed(2)}
                                </td>
                                <td className="p-3">{badge}</td>
                                <td className="p-3 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {r.status === 'pending' && (
                                      <button
                                        onClick={async () => {
                                          if (!token) { showNotice('Apenas modo local ativo.'); return; }
                                          try {
                                            const res = await fetch(`/api/admin/referrals/${r.id}/approve`, {
                                              method: 'PUT', headers: { Authorization: `Bearer ${token}` }
                                            });
                                            if (res.ok) {
                                              const body = await res.json();
                                              setAllReferrals(prev => prev.map(x => x.id === r.id ? { ...x, status: 'converted', pixStatus: body.data?.pixStatus || 'approved', pixRewardValue: body.data?.pixRewardValue || 50 } : x));
                                              showNotice('Matrícula aprovada! Recompensa em PIX calculada.');
                                            }
                                          } catch { showNotice('Erro ao aprovar indicação.'); }
                                        }}
                                        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-green-700 whitespace-nowrap shadow-sm"
                                      >
                                        Aprovar Matrícula
                                      </button>
                                    )}

                                    {(r.pixStatus === 'approved' || r.pixStatus === 'capped' || (r.status === 'converted' && r.pixStatus !== 'paid')) && (
                                      <button
                                        onClick={async () => {
                                          const proof = window.prompt('Informe o comprovante ou código de transação do PIX (opcional):', 'Pagamento PIX realizado');
                                          if (proof === null) return;
                                          if (!token) { showNotice('Apenas modo local ativo.'); return; }
                                          try {
                                            const res = await fetch(`/api/admin/referrals/${r.id}/pay-pix`, {
                                              method: 'PUT',
                                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                              body: JSON.stringify({ paymentProof: proof })
                                            });
                                            if (res.ok) {
                                              setAllReferrals(prev => prev.map(x => x.id === r.id ? { ...x, pixStatus: 'paid', pixPaymentProof: proof } : x));
                                              showNotice('Pagamento PIX confirmado com sucesso!');
                                            }
                                          } catch { showNotice('Erro ao confirmar pagamento PIX.'); }
                                        }}
                                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700 whitespace-nowrap shadow-sm"
                                      >
                                        Confirmar Pagamento PIX
                                      </button>
                                    )}

                                    <button
                                      onClick={async () => {
                                        if (!window.confirm('Tem certeza que deseja excluir esta indicação?')) return;
                                        if (!token) { showNotice('Apenas modo local ativo.'); return; }
                                        try {
                                          const res = await fetch(`/api/admin/referrals/${r.id}`, {
                                            method: 'DELETE',
                                            headers: { Authorization: `Bearer ${token}` }
                                          });
                                          if (res.ok) {
                                            setAllReferrals(prev => prev.filter(x => x.id !== r.id));
                                            showNotice('Indicação excluída com sucesso!');
                                          } else {
                                            showNotice('Erro ao excluir indicação.');
                                          }
                                        } catch { showNotice('Erro ao excluir indicação.'); }
                                      }}
                                      className="rounded-lg border border-red-200 p-1.5 text-red-500 transition hover:border-red-500 hover:bg-red-50"
                                      title="Excluir indicação"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Panel>
              </div>
            </div>
          )}

          {activeTab === 'turmas' && (
            <div className="grid gap-6">
              {/* Editor panel */}
              {editingTurma && (
                <Panel title={`Configurar turma: ${editingTurma.title}`}>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <label className="block">
                        <span className="text-sm font-bold text-navy">Mínimo de alunos para iniciar</span>
                        <input
                          type="number" min={2} max={200}
                          value={turmaMinStudents}
                          onChange={(e) => setTurmaMinStudents(Number(e.target.value))}
                          className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 outline-none ring-orange-primary/20 transition focus:ring-4"
                        />
                      </label>
                      <p className="mt-1 text-xs text-slate-500">A turma só inicia quando atingir este número de pré-inscrições.</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-navy">Link público da turma</p>
                      <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-bg-light px-3 py-2 text-xs text-slate-600 break-all">
                        /turma/{editingTurma.slug}
                      </div>
                      <button
                        onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/turma/${editingTurma.slug}`); showNotice('Link copiado!'); }}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-orange-primary hover:underline"
                      >
                        <Copy className="h-3 w-3" /> Copiar link
                      </button>
                    </div>
                  </div>

                  {/* Tiers editor */}
                  <div className="mt-6">
                    <p className="text-sm font-bold text-navy">Tiers de desconto por indicações</p>
                    <p className="mt-1 text-xs text-slate-500">O desconto é aplicado nas mensalidades em aberto do aluno indicador.</p>
                    <div className="mt-3 space-y-2">
                      {turmaTiers.map((tier, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="w-28 shrink-0 text-xs text-slate-500">Indicações mín.</span>
                          <input
                            type="number" min={1} value={tier.minReferrals}
                            onChange={(e) => setTurmaTiers((prev) => prev.map((t, j) => j === i ? { ...t, minReferrals: Number(e.target.value) } : t))}
                            className="w-20 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-orange-primary/20 focus:ring-4"
                          />
                          <span className="shrink-0 text-xs text-slate-500">Desconto (%)</span>
                          <input
                            type="number" min={1} max={100} value={tier.discountPercent}
                            onChange={(e) => setTurmaTiers((prev) => prev.map((t, j) => j === i ? { ...t, discountPercent: Number(e.target.value) } : t))}
                            className="w-20 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-orange-primary/20 focus:ring-4"
                          />
                          <button
                            onClick={() => setTurmaTiers((prev) => prev.filter((_, j) => j !== i))}
                            className="rounded-lg border border-slate-200 p-2 text-red-400 transition hover:border-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setTurmaTiers((prev) => [...prev, { minReferrals: (prev.at(-1)?.minReferrals ?? 0) + 1, discountPercent: 10 }])}
                      className="mt-3 inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-bold text-slate-500 transition hover:border-orange-primary hover:text-orange-primary"
                    >
                      + Adicionar tier
                    </button>
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={async () => {
                        const updated = { ...editingTurma, minStudents: turmaMinStudents, tiers: turmaTiers };
                        setTurmas((prev) => prev.map((t) => t.id === editingTurma.id ? updated : t));
                        if (token) {
                          await fetch(`/api/admin/turmas/${editingTurma.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ minStudents: turmaMinStudents, tiers: turmaTiers }),
                          }).catch(() => {});
                        }
                        setEditingTurma(null);
                        showNotice('Configuração de turma salva.');
                      }}
                      className="flex-1 rounded-lg bg-orange-primary px-5 py-3 font-bold text-white"
                    >
                      Salvar configuração
                    </button>
                    <button onClick={() => setEditingTurma(null)} className="rounded-lg border border-slate-200 px-5 py-3 font-bold text-slate-600">
                      Cancelar
                    </button>
                  </div>
                </Panel>
              )}

              {/* Turmas list */}
              <Panel title="Turmas em formação">
                <div className="space-y-3">
                  {turmas.map((turma) => {
                    const pct = Math.min(100, Math.round((turma.enrollmentCount / turma.minStudents) * 100));
                    const maxDiscount = turma.tiers.at(-1)?.discountPercent ?? 0;
                    return (
                      <div key={turma.id} className="rounded-lg border border-slate-200 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-navy truncate">{turma.title}</p>
                            <p className="mt-0.5 text-xs text-slate-500">/turma/{turma.slug}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/turma/${turma.slug}`); showNotice('Link copiado!'); }}
                              className="rounded-lg border border-slate-200 p-2 text-slate-400 transition hover:border-orange-primary hover:text-orange-primary"
                              title="Copiar link público"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => { setEditingTurma(turma); setTurmaMinStudents(turma.minStudents); setTurmaTiers(turma.tiers); }}
                              className="rounded-lg border border-slate-200 p-2 text-slate-400 transition hover:border-blue-action hover:text-blue-action"
                              title="Configurar"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>{turma.enrollmentCount} de {turma.minStudents} alunos</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-orange-primary transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        {/* Tiers summary */}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {turma.tiers.map((tier, i) => (
                            <span key={i} className="rounded-full bg-orange-primary/10 px-2 py-0.5 text-xs font-bold text-orange-primary">
                              {tier.minReferrals} ind. → {tier.discountPercent}%
                            </span>
                          ))}
                          {turma.tiers.length === 0 && <span className="text-xs text-slate-400">Sem tiers configurados</span>}
                        </div>
                        {maxDiscount === 100 && (
                          <p className="mt-2 text-xs font-semibold text-green-600">Bolsa 100% configurada para {turma.tiers.at(-1)!.minReferrals} indicações</p>
                        )}
                      </div>
                    );
                  })}
                  {turmas.length === 0 && (
                    <p className="rounded-lg bg-bg-light p-6 text-center text-sm text-slate-500">
                      Nenhuma turma encontrada. Cadastre cursos do tipo Pós-graduação ou Curso Livre para que apareçam aqui.
                    </p>
                  )}
                </div>
              </Panel>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="grid gap-6">
              <div className="flex border-b border-slate-200 bg-white p-3 rounded-lg shadow-soft gap-2 overflow-x-auto">
                {[
                  ['geral', 'Geral'],
                  ['pixels', 'Pixels & Tráfego Pago'],
                  ['api', 'Chaves de API'],
                  ['smtp', 'E-mail (SMTP)'],
                  ['menu', 'Menu do Site'],
                  ['webhooks', 'Webhooks / CRM'],
                ].map(([sub, label]) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setSettingsSubtab(sub as any)}
                    className={`rounded-lg px-4 py-2 text-sm font-bold transition whitespace-nowrap ${
                      settingsSubtab === sub ? 'bg-orange-primary text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {settingsSubtab === 'geral' && (
                <Panel title="Configurações Gerais">
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!token) { alert('Sessão expirada. Por favor, faça login novamente.'); return; }
                    const form = new FormData(e.currentTarget);
                    const updated = {
                      ...adminSettings,
                      siteName: String(form.get('siteName')),
                      domain: String(form.get('domain')),
                      whatsapp: String(form.get('whatsapp')),
                      instagram: String(form.get('instagram') || ''),
                      facebook: String(form.get('facebook') || ''),
                      linkedin: String(form.get('linkedin') || ''),
                      youtube: String(form.get('youtube') || ''),
                      twitter: String(form.get('twitter') || ''),
                    };
                    try {
                      const res = await fetch('/api/admin/settings', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify(updated),
                      });
                      if (res.ok) {
                        setAdminSettings(updated);
                        showNotice('Configurações gerais salvas com sucesso!');
                      } else {
                        alert('Erro ao salvar: ' + await handleAdminResponseError(res));
                      }
                    } catch {
                      alert('Erro ao se conectar ao servidor.');
                    }
                  }} className="grid gap-4 max-w-xl">
                    <Field label="Nome do Site" name="siteName" placeholder="Instituto Sentidos" defaultValue={adminSettings.siteName} required />
                    <Field label="Domínio Oficial" name="domain" placeholder="isentidos.com.br" defaultValue={adminSettings.domain} required />
                    <Field label="WhatsApp de Contato" name="whatsapp" placeholder="(99) 3199-93940" defaultValue={adminSettings.whatsapp} required />
                    
                    <div className="border-t border-slate-100 pt-4 mt-2">
                      <h4 className="text-sm font-bold text-navy mb-3">Redes Sociais</h4>
                      <div className="grid gap-3">
                        <Field label="Instagram" name="instagram" placeholder="https://instagram.com/seu-perfil" defaultValue={adminSettings.instagram} />
                        <Field label="Facebook" name="facebook" placeholder="https://facebook.com/seu-perfil" defaultValue={adminSettings.facebook} />
                        <Field label="LinkedIn" name="linkedin" placeholder="https://linkedin.com/in/seu-perfil" defaultValue={adminSettings.linkedin} />
                        <Field label="YouTube" name="youtube" placeholder="https://youtube.com/c/seu-canal" defaultValue={adminSettings.youtube} />
                        <Field label="Twitter / X" name="twitter" placeholder="https://twitter.com/seu-perfil" defaultValue={adminSettings.twitter} />
                      </div>
                    </div>

                    <button className="rounded-lg bg-orange-primary px-5 py-3 font-bold text-white max-w-xs transition hover:bg-orange-600 shadow-md">
                      Salvar Geral
                    </button>
                  </form>
                </Panel>
              )}

              {settingsSubtab === 'pixels' && (
                <Panel title="Pixels & Tráfego Pago">
                  <p className="text-xs text-slate-500 mb-4">Insira os identificadores de pixel e scripts personalizados para serem injetados em tempo real nas páginas públicas.</p>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!token) { alert('Sessão expirada. Por favor, faça login novamente.'); return; }
                    const form = new FormData(e.currentTarget);
                    const updated = {
                      ...adminSettings,
                      metaPixelId: String(form.get('metaPixelId')),
                      googleAnalyticsId: String(form.get('googleAnalyticsId')),
                      googleTagManagerId: String(form.get('googleTagManagerId')),
                      googleAdsId: String(form.get('googleAdsId')),
                      customScripts: String(form.get('customScripts')),
                    };
                    try {
                      const res = await fetch('/api/admin/settings', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify(updated),
                      });
                      if (res.ok) {
                        setAdminSettings(updated);
                        showNotice('Configurações de pixels salvas!');
                      } else {
                        alert('Erro ao salvar: ' + await handleAdminResponseError(res));
                      }
                    } catch {
                      alert('Erro de conexão.');
                    }
                  }} className="grid gap-4 max-w-xl">
                    <Field label="Meta Pixel ID (Facebook)" name="metaPixelId" placeholder="Ex: 1234567890" defaultValue={adminSettings.metaPixelId} />
                    <Field label="Google Analytics ID (G-XXXXXX)" name="googleAnalyticsId" placeholder="Ex: G-XXXXXXXXXX" defaultValue={adminSettings.googleAnalyticsId} />
                    <Field label="Google Tag Manager ID (GTM-XXXX)" name="googleTagManagerId" placeholder="Ex: GTM-XXXXXX" defaultValue={adminSettings.googleTagManagerId} />
                    <Field label="Google Ads ID (AW-XXXXXX)" name="googleAdsId" placeholder="Ex: AW-XXXXXXXXXX" defaultValue={adminSettings.googleAdsId} />
                    <TextArea label="Scripts customizados adicionais (Header/Body)" name="customScripts" placeholder="<!-- Insira seus scripts customizados aqui -->" defaultValue={adminSettings.customScripts} />
                    <button className="rounded-lg bg-orange-primary px-5 py-3 font-bold text-white max-w-xs transition hover:bg-orange-600 shadow-md">
                      Salvar Pixels
                    </button>
                  </form>
                </Panel>
              )}

              {settingsSubtab === 'smtp' && (
                <Panel title="Configurações de E-mail (SMTP ZeptoMail/Zoho)">
                  <p className="text-xs text-slate-500 mb-4">Insira as credenciais do seu servidor de e-mail SMTP para disparar e-mails da aplicação (como "Esqueci minha senha" e e-mail de Boas Vindas para Leads).</p>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!token) { alert('Sessão expirada. Por favor, faça login novamente.'); return; }
                    const form = new FormData(e.currentTarget);
                    const updated = {
                      ...adminSettings,
                      smtpHost: String(form.get('smtpHost')),
                      smtpPort: String(form.get('smtpPort')),
                      smtpUser: String(form.get('smtpUser')),
                      smtpPass: String(form.get('smtpPass')),
                      smtpFromEmail: String(form.get('smtpFromEmail')),
                    };
                    try {
                      const res = await fetch('/api/admin/settings', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify(updated),
                      });
                      if (!res.ok) throw new Error();
                      setAdminSettings(updated);
                      showNotice('Configurações de SMTP salvas com sucesso!');
                    } catch {
                      showNotice('Erro ao salvar as configurações.');
                    }
                  }}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Host SMTP" name="smtpHost" placeholder="smtp.zeptomail.com" defaultValue={adminSettings.smtpHost} />
                      <Field label="Porta SMTP" name="smtpPort" placeholder="587" defaultValue={adminSettings.smtpPort} />
                      <Field label="Usuário SMTP" name="smtpUser" placeholder="emailapikey" defaultValue={adminSettings.smtpUser} />
                      <Field label="Senha SMTP" name="smtpPass" placeholder="Sua senha secreta" type="password" defaultValue={adminSettings.smtpPass} />
                      <div className="sm:col-span-2">
                        <Field label="E-mail de Remetente (From)" name="smtpFromEmail" placeholder="contato@isentidos.net.br" defaultValue={adminSettings.smtpFromEmail} />
                      </div>
                    </div>
                    <button className="mt-4 rounded-lg bg-orange-primary px-5 py-3 font-bold text-white max-w-xs transition hover:bg-orange-600 shadow-md">
                      Salvar E-mail (SMTP)
                    </button>
                  </form>
                </Panel>
              )}

              {settingsSubtab === 'api' && (
                <Panel title="Chaves de API & Provedor de IA">
                  <p className="text-xs text-slate-500 mb-4">Escolha qual provedor de IA utilizar para a geração de conteúdo dos posts do blog e configure suas respectivas chaves de API com segurança.</p>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!token) { alert('Sessão expirada. Por favor, faça login novamente.'); return; }
                    const form = new FormData(e.currentTarget);
                    const updated = {
                      ...adminSettings,
                      activeAiProvider: String(form.get('activeAiProvider')),
                      apiGeminiKey: String(form.get('apiGeminiKey')),
                      apiOpenAIKey: String(form.get('apiOpenAIKey')),
                      apiOpenRouterKey: String(form.get('apiOpenRouterKey')),
                      apiGroqKey: String(form.get('apiGroqKey')),
                    };
                    try {
                      const res = await fetch('/api/admin/settings', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify(updated),
                      });
                      if (res.ok) {
                        setAdminSettings(updated);
                        showNotice('Chaves de API salvas com sucesso!');
                      } else {
                        alert('Erro ao salvar: ' + await handleAdminResponseError(res));
                      }
                    } catch {
                      alert('Erro de conexão.');
                    }
                  }} className="grid gap-4 max-w-xl">
                    <label className="block">
                      <span className="text-sm font-bold text-navy">Provedor Ativo de IA</span>
                      <select name="activeAiProvider" defaultValue={adminSettings.activeAiProvider} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none ring-orange-primary/20 transition focus:ring-4">
                        <option value="local">Gerador Local (Mock - Sem Chaves)</option>
                        <option value="gemini">Google Gemini</option>
                        <option value="openai">OpenAI ChatGPT</option>
                        <option value="openrouter">OpenRouter</option>
                        <option value="groq">Groq LLaMA</option>
                      </select>
                    </label>
                    <Field label="Google Gemini API Key" name="apiGeminiKey" placeholder="AIzaSy..." type="password" defaultValue={adminSettings.apiGeminiKey} />
                    <Field label="OpenAI API Key" name="apiOpenAIKey" placeholder="sk-..." type="password" defaultValue={adminSettings.apiOpenAIKey} />
                    <Field label="OpenRouter API Key" name="apiOpenRouterKey" placeholder="sk-or-..." type="password" defaultValue={adminSettings.apiOpenRouterKey} />
                    <Field label="Groq API Key" name="apiGroqKey" placeholder="gsk_..." type="password" defaultValue={adminSettings.apiGroqKey} />
                    <button className="rounded-lg bg-orange-primary px-5 py-3 font-bold text-white max-w-xs transition hover:bg-orange-600 shadow-md">
                      Salvar Chaves
                    </button>
                  </form>
                </Panel>
              )}

              {settingsSubtab === 'menu' && (
                <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                  <Panel title={editingMenuItem ? 'Editar item do menu' : 'Novo item do menu'}>
                    <form
                      key={editingMenuItem ? editingMenuItem.id : 'new-menu-item'}
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!token) { alert('Sessão expirada. Por favor, faça login novamente.'); return; }
                        const formElement = e.currentTarget;
                        const form = new FormData(formElement);
                        const label = String(form.get('label'));
                        const href = String(form.get('href'));
                        const isActive = form.get('isActive') === 'true';
                        const isButton = form.get('isButton') === 'true';
                        const parentIdRaw = form.get('parentId');
                        const parentId = parentIdRaw ? String(parentIdRaw) : null;
                        
                        const itemData = {
                          label,
                          href,
                          isActive,
                          isButton,
                          parentId: parentId || null,
                          position: editingMenuItem ? editingMenuItem.position : adminMenuItems.length,
                        };

                        try {
                          if (editingMenuItem && editingMenuItem.id) {
                            const res = await fetch(`/api/admin/menu/${editingMenuItem.id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                              body: JSON.stringify(itemData),
                            });
                            if (res.ok) {
                              const json = await res.json();
                              setAdminMenuItems((prev) => prev.map((item) => item.id === editingMenuItem.id ? json.data : item));
                              setEditingMenuItem(null);
                              showNotice('Item de menu atualizado!');
                            }
                          } else {
                            const res = await fetch('/api/admin/menu', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                              body: JSON.stringify(itemData),
                            });
                            if (res.ok) {
                              const json = await res.json();
                              setAdminMenuItems((prev) => [...prev, json.data]);
                              showNotice('Item de menu criado!');
                            }
                          }
                          formElement.reset();
                        } catch {
                          alert('Erro ao salvar item.');
                        }
                      }}
                      className="grid gap-4"
                    >
                      <Field label="Rótulo / Nome" name="label" placeholder="Ex: Cursos" defaultValue={editingMenuItem?.label} required />
                      <Field label="URL / Âncora" name="href" placeholder="Ex: /cursos ou /#contato" defaultValue={editingMenuItem?.href} required />
                      
                      <div className="grid gap-4 md:grid-cols-3">
                        <label className="block">
                          <span className="text-sm font-bold text-navy">Exibir no Menu</span>
                          <select name="isActive" defaultValue={editingMenuItem ? String(editingMenuItem.isActive) : 'true'} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none ring-orange-primary/20 transition focus:ring-4">
                            <option value="true">Ativo</option>
                            <option value="false">Inativo</option>
                          </select>
                        </label>
                        <label className="block">
                          <span className="text-sm font-bold text-navy">Estilo Botão (WhatsApp)</span>
                          <select name="isButton" defaultValue={editingMenuItem ? String(editingMenuItem.isButton) : 'false'} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none ring-orange-primary/20 transition focus:ring-4">
                            <option value="false">Link Normal</option>
                            <option value="true">Botão Destacado</option>
                          </select>
                        </label>
                        <label className="block">
                          <span className="text-sm font-bold text-navy">Item Pai (Submenu)</span>
                          <select name="parentId" defaultValue={editingMenuItem?.parentId || ''} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none ring-orange-primary/20 transition focus:ring-4">
                            <option value="">(Nenhum - Item Principal)</option>
                            {adminMenuItems.filter((it) => !it.parentId && it.id !== editingMenuItem?.id).map((it) => (
                              <option key={it.id} value={it.id}>{it.label}</option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="flex gap-3">
                        <button className="flex-1 rounded-lg bg-orange-primary px-5 py-3 font-bold text-white transition hover:bg-orange-600 shadow-md">
                          {editingMenuItem ? 'Atualizar Item' : 'Criar Item'}
                        </button>
                        {editingMenuItem && (
                          <button type="button" onClick={() => setEditingMenuItem(null)} className="rounded-lg border border-slate-200 px-5 py-3 font-bold text-slate-600 hover:bg-slate-50 transition">
                            Cancelar
                          </button>
                        )}
                      </div>
                    </form>
                  </Panel>

                  <Panel title="Itens de Menu Ordenáveis">
                    <p className="text-xs text-slate-500 mb-4">Gerencie os links de navegação do site oficial. Clique nos botões de subir e descer para ordenar a exibição.</p>
                    <div className="space-y-2">
                      {adminMenuItems.map((item, index) => {
                        const parent = adminMenuItems.find((p) => p.id === item.parentId);
                        return (
                          <div key={item.id || index} className={`flex items-center gap-3 rounded-lg border border-slate-200 p-3 bg-slate-50 hover:bg-white transition shadow-sm ${item.parentId ? 'ml-8 bg-slate-50/50 border-dashed' : ''}`}>
                            {item.parentId && <span className="text-slate-400 font-mono">└─</span>}
                            <div className="min-w-0 flex-1">
                              <strong className="text-navy font-semibold">{item.label}</strong>
                              <p className="text-xs text-slate-500 truncate">{item.href}</p>
                              {parent && (
                                <span className="inline-block mt-1 text-[10px] bg-slate-250 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">
                                  Submenu de {parent.label}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={async () => {
                                if (index === 0 || !token) return;
                                const newItems = [...adminMenuItems];
                                const temp = newItems[index];
                                newItems[index] = newItems[index - 1];
                                newItems[index - 1] = temp;
                                const reordered = newItems.map((it, idx) => ({ ...it, position: idx }));
                                setAdminMenuItems(reordered);
                                try {
                                  await fetch('/api/admin/menu/reorder', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                    body: JSON.stringify({ items: reordered.map((it) => ({ id: it.id, position: it.position })) }),
                                  });
                                  showNotice('Ordem atualizada!');
                                } catch {
                                  showNotice('Erro ao reordenar.');
                                }
                              }}
                              className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition"
                              title="Subir"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              disabled={index === adminMenuItems.length - 1}
                              onClick={async () => {
                                if (index === adminMenuItems.length - 1 || !token) return;
                                const newItems = [...adminMenuItems];
                                const temp = newItems[index];
                                newItems[index] = newItems[index + 1];
                                newItems[index + 1] = temp;
                                const reordered = newItems.map((it, idx) => ({ ...it, position: idx }));
                                setAdminMenuItems(reordered);
                                try {
                                  await fetch('/api/admin/menu/reorder', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                    body: JSON.stringify({ items: reordered.map((it) => ({ id: it.id, position: it.position })) }),
                                  });
                                  showNotice('Ordem atualizada!');
                                } catch {
                                  showNotice('Erro ao reordenar.');
                                }
                              }}
                              className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition"
                              title="Descer"
                            >
                              ▼
                            </button>
                          </div>

                          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            item.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'
                          }`}>
                            {item.isActive ? 'Ativo' : 'Inativo'}
                          </span>
                          {item.isButton && (
                            <span className="shrink-0 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-700">Botão</span>
                          )}

                          <button
                            type="button"
                            onClick={() => setEditingMenuItem(item)}
                            className="shrink-0 rounded-lg border border-slate-200 p-2 text-slate-500 hover:border-blue-action hover:text-blue-action transition"
                            aria-label="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!confirm(`Excluir o item "${item.label}"?`) || !token || !item.id) return;
                              try {
                                const res = await fetch(`/api/admin/menu/${item.id}`, {
                                  method: 'DELETE',
                                  headers: { Authorization: `Bearer ${token}` },
                                });
                                if (res.ok) {
                                  setAdminMenuItems((prev) => prev.filter((it) => it.id !== item.id));
                                  showNotice('Item de menu excluído!');
                                }
                              } catch {
                                alert('Erro ao excluir item.');
                              }
                            }}
                            className="shrink-0 rounded-lg border border-slate-200 p-2 text-slate-500 hover:border-red-400 hover:text-red-500 transition"
                            aria-label="Excluir"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                      {adminMenuItems.length === 0 && (
                        <p className="rounded-lg bg-bg-light p-4 text-center text-sm text-slate-500">Nenhum item cadastrado.</p>
                      )}
                    </div>
                  </Panel>
                </div>
              )}

              {settingsSubtab === 'webhooks' && (
                <Panel title="Configurações de Webhook (Integração CRM)">
                  <div className="grid gap-6">
                    <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
                      <h3 className="font-bold text-navy text-base mb-2">Envio de Dados para o CRM (Outbound Webhook)</h3>
                      <p className="text-sm text-slate-600 mb-4">
                        Cole aqui a URL fornecida pelo seu CRM (ex: LeadConnector). Toda vez que um novo Lead for capturado no site ou um novo código de indicação for criado, o sistema enviará os dados automaticamente para esta URL via POST.
                      </p>
                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        if (!token) { alert('Sessão expirada. Por favor, faça login novamente.'); return; }
                        const form = new FormData(e.currentTarget);
                        const updated = {
                          ...adminSettings,
                          outboundWebhookUrl: String(form.get('outboundWebhookUrl')),
                          mauticBaseUrl: String(form.get('mauticBaseUrl') || 'https://mautic.isentidos.com.br'),
                          mauticTrackingEnabled: form.get('mauticTrackingEnabled') === 'on',
                        };
                        try {
                          const res = await fetch('/api/admin/settings', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify(updated),
                          });
                          if (!res.ok) throw new Error();
                          setAdminSettings(updated);
                          showNotice('URL do CRM salva com sucesso!');
                        } catch {
                          showNotice('Erro ao salvar as configurações.');
                        }
                      }}>
                        <div className="flex flex-col sm:flex-row gap-3 items-end">
                          <div className="flex-1 w-full">
                            <Field label="URL do Webhook do CRM" name="outboundWebhookUrl" placeholder="https://services.leadconnectorhq.com/hooks/..." defaultValue={adminSettings.outboundWebhookUrl} />
                          </div>
                          <button className="rounded-lg bg-orange-primary px-5 py-3 h-[46px] font-bold text-white transition hover:bg-orange-600 shadow-md whitespace-nowrap">
                            Salvar URL
                          </button>
                        </div>
                      </form>
                    </div>

                    <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
                      <h3 className="font-bold text-navy text-base mb-2">Integração Mautic (E-mail Marketing)</h3>
                      <p className="text-sm text-slate-600 mb-4">
                        Configure a URL base da sua instalação do Mautic. O sistema enviará os leads de e-books e cursos para os formulários correspondentes.
                      </p>
                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        if (!token) { alert('Sessão expirada. Por favor, faça login novamente.'); return; }
                        const form = new FormData(e.currentTarget);
                        const updated = {
                          ...adminSettings,
                          mauticBaseUrl: String(form.get('mauticBaseUrl') || 'https://mautic.isentidos.com.br'),
                          mauticTrackingEnabled: form.get('mauticTrackingEnabled') === 'on',
                        };
                        try {
                          const res = await fetch('/api/admin/settings', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify(updated),
                          });
                          if (!res.ok) throw new Error();
                          setAdminSettings(updated);
                          showNotice('Configurações do Mautic salvas com sucesso!');
                        } catch {
                          showNotice('Erro ao salvar as configurações.');
                        }
                      }}>
                        <div className="grid gap-4 sm:grid-cols-2 items-end mb-4">
                          <Field label="URL Base do Mautic" name="mauticBaseUrl" placeholder="https://mautic.isentidos.com.br" defaultValue={adminSettings.mauticBaseUrl} />
                          <label className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 cursor-pointer h-[46px]">
                            <input type="checkbox" name="mauticTrackingEnabled" defaultChecked={adminSettings.mauticTrackingEnabled} className="h-5 w-5 accent-orange-primary rounded" />
                            <span className="text-sm font-bold text-navy">Habilitar Tracking (mtc.js)</span>
                          </label>
                        </div>
                        <button className="rounded-lg bg-orange-primary px-5 py-3 font-bold text-white transition hover:bg-orange-600 shadow-md">
                          Salvar Configurações Mautic
                        </button>
                      </form>
                    </div>

                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-5">
                      <h3 className="font-bold text-navy text-base mb-2">URL de Recebimento de Webhook</h3>
                      <p className="text-sm text-slate-600 mb-4">
                        Esta é a URL que deve ser configurada em sua automação/gatilho no CRM (como LeadConnector / GoHighLevel) para registrar indicações e conversões de matrículas automaticamente no site.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 font-mono text-xs bg-slate-900 text-green-400 p-3 rounded-lg overflow-x-auto break-all border border-slate-800">
                          {`${window.location.origin}/api/webhooks/leadconnector`}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/leadconnector`);
                            showNotice('URL do webhook copiada!');
                          }}
                          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-navy hover:border-orange-primary hover:text-orange-primary transition flex items-center justify-center gap-2"
                        >
                          <Copy className="h-4 w-4" /> Copiar URL
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-4">
                      <h3 className="font-display font-bold text-navy text-lg border-b border-slate-100 pb-2">Manual de Configuração no CRM</h3>
                      
                      <div className="grid gap-5">
                        <div className="text-sm text-slate-700">
                          <h4 className="font-bold text-navy mb-1">Gatilho 1: Cadastro de Novas Indicações (Leads)</h4>
                          <p className="mb-2">
                            Configure seu CRM para enviar um webhook para o site sempre que um novo lead for cadastrado através de uma página ou formulário que contenha o código de indicação do embaixador.
                          </p>
                          <ul className="list-decimal list-inside space-y-1 text-slate-600 pl-2">
                            <li>Crie uma nova automação (Workflow) no seu CRM.</li>
                            <li>Defina o gatilho como <strong>Form Submitted</strong> (Formulário Enviado) ou <strong>Contact Created</strong> (Contato Criado).</li>
                            <li>Adicione uma condição/filtro para verificar se o campo personalizado contendo o código de indicação (ex: <code>referral_code</code>) não está em branco.</li>
                            <li>Adicione a ação <strong>Webhook (Custom Webhook)</strong> com método <strong>POST</strong>.</li>
                            <li>Cole a URL acima no campo de destino.</li>
                            <li>
                              Mapeie os campos no payload para enviar os seguintes dados:
                              <ul className="list-disc list-inside pl-4 mt-1 space-y-0.5 text-slate-500 font-mono text-xs">
                                <li>name (Nome completo do lead)</li>
                                <li>email (E-mail do lead)</li>
                                <li>phone (WhatsApp/Telefone)</li>
                                <li>referral_code ou ref (Código do embaixador)</li>
                                <li>interest (Nome do curso ou interesse)</li>
                                <li>modality (presencial ou online)</li>
                              </ul>
                            </li>
                          </ul>
                        </div>

                        <div className="text-sm text-slate-700">
                          <h4 className="font-bold text-navy mb-1">Gatilho 2: Confirmação de Matrícula (Conversão do Lead)</h4>
                          <p className="mb-2">
                            Configure seu CRM para notificar o site quando o lead efetivar a matrícula. O site identificará o lead pelo e-mail ou telefone e marcará a indicação como <strong>Convertida</strong>.
                          </p>
                          <ul className="list-decimal list-inside space-y-1 text-slate-600 pl-2">
                            <li>Crie uma automação para quando a venda/matrícula for ganha.</li>
                            <li>Defina o gatilho (ex: <strong>Opportunity Status Changed</strong> para <i>Won/Ganho</i>, ou <strong>Contact Tag Added</strong>).</li>
                            <li>Adicione a ação <strong>Webhook</strong> enviando um <strong>POST</strong> para a mesma URL acima.</li>
                            <li>
                              O payload deve conter os dados mínimos do contato:
                              <ul className="list-disc list-inside pl-4 mt-1 text-slate-500 font-mono text-xs">
                                <li>email (E-mail do lead - obrigatório para conciliação)</li>
                                <li>status ("converted" - indica que o lead efetuou a matrícula)</li>
                              </ul>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </Panel>
              )}            </div>
          )}

          {activeTab === 'users' && currentUser?.role === 'admin' && (
            <AdminGrid>
              <Panel title={editingAdminUser ? 'Editar Usuário Administrativo' : 'Cadastrar Usuário Administrativo'}>
                <form key={editingAdminUser?.id ?? 'new-user'} onSubmit={saveAdminUser} className="grid gap-4">
                  <Field label="Nome" name="name" placeholder="Ex: João Silva" required defaultValue={editingAdminUser?.name} />
                  <Field label="E-mail" name="email" type="email" placeholder="Ex: joao@isentidos.com.br" required defaultValue={editingAdminUser?.email} />
                  
                  <label className="block">
                    <span className="text-sm font-bold text-navy">Cargo / Função</span>
                    <select name="role" defaultValue={editingAdminUser?.role ?? 'editor'} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm focus:border-orange-primary focus:ring-1 focus:ring-orange-primary">
                      <option value="admin">Administrador (Total)</option>
                      <option value="editor">Editor (Conteúdo)</option>
                      <option value="consultant">Consultor (Leads/Indicações)</option>
                    </select>
                  </label>

                  <Field 
                    label={editingAdminUser ? "Nova Senha (deixe em branco para manter)" : "Senha"} 
                    name="password" 
                    type="password" 
                    placeholder="Min. 6 caracteres" 
                    required={!editingAdminUser} 
                  />

                  <div className="flex gap-3 mt-2">
                    <button className="flex-1 rounded-lg bg-orange-primary px-5 py-3 font-bold text-white transition hover:bg-orange-600 shadow-md">
                      {editingAdminUser ? 'Atualizar Usuário' : 'Cadastrar Usuário'}
                    </button>
                    {editingAdminUser && (
                      <button type="button" onClick={() => setEditingAdminUser(null)} className="rounded-lg border border-slate-200 px-5 py-3 font-bold text-slate-600">
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>
              </Panel>

              <Panel title="Usuários Administrativos">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px] text-left text-sm">
                    <thead className="bg-bg-light text-xs uppercase text-slate-500">
                      <tr>
                        <th className="p-3">Nome</th>
                        <th className="p-3">E-mail</th>
                        <th className="p-3">Função</th>
                        <th className="p-3">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminUsers.map((user) => (
                        <tr key={user.id} className="border-b border-slate-100">
                          <td className="p-3 font-semibold text-navy">{user.name}</td>
                          <td className="p-3 text-slate-600">{user.email}</td>
                          <td className="p-3">
                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                              user.role === 'editor' ? 'bg-blue-100 text-blue-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {user.role === 'admin' ? 'Admin' :
                               user.role === 'editor' ? 'Editor' :
                               'Consultor'}
                            </span>
                          </td>
                          <td className="p-3 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingAdminUser(user)}
                              className="rounded-lg border border-slate-200 p-2 text-navy hover:bg-slate-50"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteAdminUser(user.id)}
                              className="rounded-lg border border-slate-200 p-2 text-red-600 hover:bg-slate-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </AdminGrid>
          )}
        </div>
      </main>
    </div>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────

function SectionHeader({ eyebrow, title, text, dark = false }: { eyebrow: string; title: string; text: string; dark?: boolean }) {
  return (
    <div>
      <p className="font-bold uppercase tracking-wide text-orange-primary">{eyebrow}</p>
      <h2 className={`mt-2 font-display text-3xl font-bold md:text-4xl ${dark ? 'text-white' : 'text-navy'}`}>{title}</h2>
      <p className={`mt-3 max-w-3xl leading-7 ${dark ? 'text-white/70' : 'text-slate-600'}`}>{text}</p>
    </div>
  );
}

function FilterBar<T extends string>({ label, options, value, onChange }: { label: string; options: T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="mb-4">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {options.map((item) => (
          <button key={item} onClick={() => onChange(item)} className={`shrink-0 rounded-lg px-4 py-2 text-sm font-bold transition ${value === item ? 'bg-navy text-white' : 'bg-white text-slate-600 hover:text-navy'}`}>{item}</button>
        ))}
      </div>
    </div>
  );
}

function PathItem({ icon: Icon, title, text }: { icon: ComponentType<{ className?: string }>; title: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-lg bg-bg-light p-4">
      <Icon className="h-6 w-6 shrink-0 text-orange-primary" />
      <div>
        <h3 className="font-bold text-navy">{title}</h3>
        <p className="mt-1 text-sm text-slate-600">{text}</p>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <p className="font-display text-3xl font-bold text-navy">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-bg-light p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-navy">{value}</p>
    </div>
  );
}

function DarkFeature({ icon: Icon, title }: { icon: ComponentType<{ className?: string }>; title: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-5">
      <Icon className="h-7 w-7 text-orange-primary" />
      <h3 className="mt-4 font-display text-lg font-bold">{title}</h3>
    </div>
  );
}

function ContactCard({ icon: Icon, title, text }: { icon: ComponentType<{ className?: string }>; title: string; text: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
      <Icon className="h-8 w-8 text-orange-primary" />
      <h3 className="mt-4 font-display text-xl font-bold text-navy">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function Field({ label, name, placeholder, type = 'text', required = false, defaultValue, step, autoComplete }: { label: string; name: string; placeholder: string; type?: string; required?: boolean; defaultValue?: string | number; step?: string; autoComplete?: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <label className="block relative">
      <span className="text-sm font-bold text-navy">{label}</span>
      <input name={name} required={required} type={inputType} step={step} defaultValue={defaultValue} autoComplete={autoComplete} className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 outline-none ring-orange-primary/20 transition focus:ring-4" placeholder={placeholder} />
      {isPassword && (
        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute bottom-3 right-4 text-slate-400 hover:text-navy" aria-label="Alternar visibilidade da senha">
          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      )}
    </label>
  );
}

function TextArea({ label, name, placeholder, required = false, defaultValue }: { label: string; name: string; placeholder: string; required?: boolean; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-navy">{label}</span>
      <textarea name={name} required={required} defaultValue={defaultValue} className="mt-2 min-h-28 w-full rounded-lg border border-slate-200 px-4 py-3 outline-none ring-orange-primary/20 transition focus:ring-4" placeholder={placeholder} />
    </label>
  );
}

function Select({ label, name, options, defaultValue }: { label: string; name: string; options: string[]; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-navy">{label}</span>
      <select name={name} defaultValue={defaultValue} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none ring-orange-primary/20 transition focus:ring-4">
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <h2 className="font-display text-xl font-bold text-navy">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function AdminGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr] w-full min-w-0">
      {React.Children.map(children, (child) => (
        <div className="min-w-0 w-full">{child}</div>
      ))}
    </div>
  );
}

function AdminMetric({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <Icon className="h-7 w-7 text-blue-action" />
      <p className="mt-4 font-display text-3xl font-bold text-navy">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}

function ResourceList({ items, onEdit, onDelete }: {
  items: Array<{ id: number | string; label: string; sub?: string; badge?: string; badgeGreen?: boolean }>;
  onEdit: (id: number | string) => void;
  onDelete: (id: number | string) => void;
}) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2 rounded-lg border border-slate-200 p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-navy">{item.label}</p>
            {item.sub && <p className="mt-0.5 truncate text-xs text-slate-500">{item.sub}</p>}
          </div>
          {item.badge && (
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${item.badgeGreen ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{item.badge}</span>
          )}
          <button onClick={() => onEdit(item.id)} className="shrink-0 rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-blue-action hover:text-blue-action" aria-label="Editar">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onDelete(item.id)} className="shrink-0 rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-red-400 hover:text-red-500" aria-label="Excluir">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      {items.length === 0 && <p className="rounded-lg bg-bg-light p-4 text-center text-sm text-slate-500">Nenhum item cadastrado.</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: LeadStatus }) {
  const colors: Record<LeadStatus, string> = { Novo: 'bg-blue-50 text-blue-700', 'Em atendimento': 'bg-orange-50 text-orange-700', Matriculado: 'bg-green-50 text-green-700', Perdido: 'bg-slate-100 text-slate-600' };
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${colors[status]}`}>{status}</span>;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

function slugify(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function modalityToApi(modality: Modality | ModalityType) {
  const norm = parseModalityUI(String(modality));
  return mapModalityToDatabase(norm);
}

function courseTypeToApi(course: Course) {
  const modality = String(course.modality);
  const isOnline = modality === ModalityType.ONLINE || modality === 'ONLINE' || modality === 'Online ao vivo' || modality === 'EAD';
  return normalizeCourseTypeToDatabase(course.kind, isOnline ? ModalityType.ONLINE : ModalityType.PRESENTIAL);
}

function numericPrice(value: string) {
  const n = Number(value.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function mapApiBanner(b: any): Banner {
  return { id: b.id, title: b.title, subtitle: b.subtitle, ctaLabel: b.ctaLabel ?? b.cta_label ?? 'Saiba mais', ctaUrl: b.ctaUrl ?? b.cta_url ?? '#cursos', imageUrl: b.imageUrl ?? b.image_url ?? '', active: b.isActive ?? b.is_active ?? true };
}

function mapApiCourse(c: any): Course {
  return {
    id: String(c.id),
    title: c.title || '',
    slug: c.slug || '',
    kind: c.kind ?? mapDatabaseCourseType(c.type || '', c.modality || ''),
    modality: c.modality === ModalityType.ONLINE || c.modality === ModalityType.PRESENTIAL || c.modality === ModalityType.HYBRID
      ? c.modality
      : parseModalityUI(c.modality),
    area: c.area || '',
    workload: c.workload || '',
    investment: c.price ? `R$ ${Number(c.price).toFixed(2)}` : 'Consulte',
    summary: c.summary ?? c.description ?? '',
    featured: c.featured ?? c.isFeatured ?? c.is_featured ?? false,
    active: c.active ?? c.isActive ?? c.is_active ?? true,
    videoUrl: c.videoUrl || '',
    about: c.about || '',
    benefits: c.benefits ? (typeof c.benefits === 'string' ? c.benefits : JSON.stringify(c.benefits, null, 2)) : '',
    modules: c.modules ? (typeof c.modules === 'string' ? c.modules : JSON.stringify(c.modules, null, 2)) : '',
    teachers: c.teachers ? (typeof c.teachers === 'string' ? c.teachers : JSON.stringify(c.teachers, null, 2)) : '',
    testimonials: c.testimonials ? (typeof c.testimonials === 'string' ? c.testimonials : JSON.stringify(c.testimonials, null, 2)) : '',
    enrollmentFee: c.enrollmentFee ? Number(c.enrollmentFee) : 0,
    installmentValue: c.installmentValue ? Number(c.installmentValue) : 0,
    maxInstallments: c.maxInstallments ? Number(c.maxInstallments) : 1,
    syllabus: c.syllabus || '',
    createdAt: c.createdAt || c.created_at || '',
    leadConnectorFormId: c.leadConnectorFormId || '',
    mauticFormId: c.mauticFormId || null,
    coverImageUrl: c.coverImageUrl || c.cover_image_url || '',
  };
}

// ── Nova Página de Cursos (Listagem + Filtros) ────────────────────────────────

const LEADCONNECTOR_ONLINE_FORM_ID = 'm1woQ1eYGfimUdhQledm';
const LEADCONNECTOR_PRESENTIAL_FORM_ID = 'vGP5eYKDquXDlCnq9mf9';
const LEADCONNECTOR_FORM_BASE_URL = 'https://api.leadconnectorhq.com/widget/form';

function appendCrmReferralParams(url: string, referralCode: string) {
  if (!referralCode) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('ref', referralCode);
    parsed.searchParams.set('referral_code', referralCode);
    return parsed.toString();
  } catch {
    return url;
  }
}

function isOnlineCourse(course: Pick<Course, 'modality' | 'kind'>) {
  const modality = String(course.modality);
  const kind = String(course.kind || '').toLowerCase();
  return modality === ModalityType.ONLINE || modality === 'ONLINE' || modality === 'EAD' || modality === 'Online ao vivo' || kind.includes('ead');
}

function getDefaultLeadConnectorFormId(course: Pick<Course, 'modality' | 'kind'>) {
  return isOnlineCourse(course) ? LEADCONNECTOR_ONLINE_FORM_ID : LEADCONNECTOR_PRESENTIAL_FORM_ID;
}

function isAdvancedAcademicCourse(course: Pick<Course, 'kind'>) {
  const kind = String(course.kind || '').toLowerCase();
  return kind.includes('mestrado') || kind.includes('doutorado');
}

function resolveLeadConnectorForm(course: Course, referralCode = '') {
  const configured = String(course.leadConnectorFormId || '').trim();
  if (!configured && isAdvancedAcademicCourse(course)) {
    return { isNative: true, redirectToWhatsapp: true, id: 'whatsapp-interest', url: '', iframeId: 'whatsapp-interest', formName: 'Atendimento via WhatsApp' };
  }

  const value = configured || getDefaultLeadConnectorFormId(course);
  const online = isOnlineCourse(course);

  if (value.toLowerCase() === 'native') {
    return { isNative: true, redirectToWhatsapp: false, id: 'native', url: '', iframeId: 'native', formName: 'Formulário interno' };
  }

  if (/^https?:\/\//i.test(value)) {
    const secureUrl = value.replace(/^http:\/\//i, 'https://');
    const id = secureUrl.match(/\/widget\/form\/([^/?#]+)/i)?.[1] || `custom-${course.id}`;
    return {
      isNative: false,
      redirectToWhatsapp: false,
      id,
      url: appendCrmReferralParams(secureUrl, referralCode),
      iframeId: `inline-${id}`,
      formName: online ? 'Pós-ao vivo' : 'Pós-presencial',
    };
  }

  const id = value.replace(/^https?:\/\/api\.leadconnectorhq\.com\/widget\/form\//i, '').split(/[?#]/)[0];
  return {
    isNative: false,
    redirectToWhatsapp: false,
    id,
    url: appendCrmReferralParams(`${LEADCONNECTOR_FORM_BASE_URL}/${id}`, referralCode),
    iframeId: `inline-${id}`,
    formName: online ? 'Pós-ao vivo' : 'Pós-presencial',
  };
}

function LeadConnectorFormFrame({ config, height = 720 }: { config: ReturnType<typeof resolveLeadConnectorForm>; height?: number }) {
  useEffect(() => {
    const existingScript = document.querySelector('script[src="https://link.msgsndr.com/js/form_embed.js"]');
    if (existingScript) return;
    const script = document.createElement('script');
    script.src = 'https://link.msgsndr.com/js/form_embed.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <iframe
      src={config.url}
      style={{ width: '100%', height: `${height}px`, border: 'none', borderRadius: '8px' }}
      id={config.iframeId}
      data-layout="{'id':'INLINE'}"
      data-trigger-type="alwaysShow"
      data-trigger-value=""
      data-activation-type="alwaysActivated"
      data-activation-value=""
      data-deactivation-type="neverDeactivate"
      data-deactivation-value=""
      data-form-name={config.formName}
      data-height={String(height)}
      data-layout-iframe-id={config.iframeId}
      data-form-id={config.id}
      title={config.formName}
    />
  );
}

function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [filterModality, setFilterModality] = useState<string>('Todos');
  const [filterArea, setFilterArea] = useState<string>('Todas');
  const [filterKind, setFilterKind] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/site-content').then(r => r.json()).then(data => {
      if (data.data?.courses?.length) setCourses(data.data.courses.map(mapApiCourse));
      else if (data.courses?.length) setCourses(data.courses.map(mapApiCourse)); // fallback
    }).catch(() => setCourses(initialCourses));
  }, []);

  const areas = ['Todas', ...Array.from(new Set(courses.map(c => c.area)))];
  const availableCourseKinds = courseKinds.filter(k => k === 'Todos' || courses.some(c => c.kind === k));

  const filtered = courses.filter(c => {
    if (filterModality !== 'Todos' && getModalityLabel(c.modality, c.kind) !== filterModality) return false;
    if (filterArea !== 'Todas' && c.area !== filterArea) return false;
    if (filterKind !== 'Todos' && c.kind !== filterKind) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      if (!(c.title?.toLowerCase().includes(q)) && !(c.summary?.toLowerCase().includes(q)) && !(c.area?.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-bg-light">
      <SiteHeader />
      <header className="bg-navy text-white px-4 py-12 text-center border-t border-white/10">
        <h1 className="font-display text-4xl font-bold">Nossos Cursos</h1>
        <p className="mt-3 text-lg text-white/80">Encontre a formação ideal para o seu momento profissional.</p>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-12 flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-64 space-y-8 shrink-0">
          <div>
            <h3 className="font-bold text-navy mb-4 border-b border-slate-200 pb-2">Tipo de Curso</h3>
            <div className="space-y-3">
              {availableCourseKinds.map(k => (
                <label key={k} className="flex items-center gap-3 cursor-pointer text-sm text-slate-700">
                  <input type="radio" checked={filterKind === k} onChange={() => setFilterKind(k)} className="h-4 w-4 accent-orange-primary" /> {k}
                </label>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-bold text-navy mb-4 border-b border-slate-200 pb-2">Modalidade</h3>
            <div className="space-y-3">
              {['Todos', 'Presencial', 'Online ao vivo', 'EAD'].map(m => (
                <label key={m} className="flex items-center gap-3 cursor-pointer text-sm text-slate-700">
                  <input type="radio" checked={filterModality === m} onChange={() => setFilterModality(m)} className="h-4 w-4 accent-orange-primary" /> {m}
                </label>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-bold text-navy mb-4 border-b border-slate-200 pb-2">Área de Conhecimento</h3>
            <select value={filterArea} onChange={e => setFilterArea(e.target.value)} className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-orange-primary focus:ring-1 focus:ring-orange-primary outline-none bg-white">
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </aside>
        <div className="flex-1">
          <div className="mb-6 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
            <input 
              type="text" 
              placeholder="Buscar por nome, área ou assunto..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-4 pl-12 pr-4 shadow-sm outline-none ring-blue-action/20 transition focus:ring-4 focus:border-blue-action text-navy"
            />
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(c => (
              <a key={c.id} href={`/cursos/${c.slug}`} className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-xl hover:-translate-y-1">
                {c.coverImageUrl ? (
                  <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                    <img src={c.coverImageUrl} alt={c.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                  </div>
                ) : (
                  <div className="relative h-48 w-full bg-gradient-to-br from-navy to-blue-action flex items-center justify-center">
                    <GraduationCap className="h-16 w-16 text-white/30" />
                  </div>
                )}
                <div className="p-6 flex-1">
                  <span className="inline-block rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-600">{c.kind}</span>
                  <h3 className="mt-4 font-display text-xl font-bold text-navy group-hover:text-orange-primary">{c.title}</h3>
                  <p className="mt-3 text-sm text-slate-600 line-clamp-3">{c.summary}</p>
                  
                  {c.installmentValue && c.installmentValue > 0 ? (
                    <div className="mt-4 rounded-xl bg-slate-50 p-3 border border-slate-100/50 text-xs text-navy font-semibold">
                      <span className="block text-[9px] uppercase font-bold text-slate-400 mb-1">Investimento</span>
                      {c.enrollmentFee && c.enrollmentFee > 0 && (
                        <span>Matrícula: <strong className="text-orange-primary">R$ {Number(c.enrollmentFee).toFixed(2)}</strong> + </span>
                      )}
                      <span><strong className="text-navy">{c.maxInstallments || 1}x</strong> de <strong className="text-navy">R$ {Number(c.installmentValue).toFixed(2)}</strong></span>
                    </div>
                  ) : (
                    <div className="mt-4 text-xs font-bold text-slate-500">
                      Investimento: {c.investment}
                    </div>
                  )}
                </div>
                <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-t border-slate-100">
                  <span className="text-sm font-bold text-navy">{getModalityLabel(c.modality, c.kind)}</span>
                  <ChevronRight className="h-4 w-4 text-orange-primary" />
                </div>
              </a>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <Search className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-lg font-bold text-navy">Nenhum curso encontrado.</p>
                <p className="text-slate-500 mt-2">Tente buscar por outros termos ou limpar os filtros para ver mais opções.</p>
                <button onClick={() => { setFilterKind('Todos'); setFilterModality('Todos'); setFilterArea('Todas'); setSearchQuery(''); }} className="mt-6 rounded-lg bg-orange-primary/10 px-6 py-2 text-orange-primary font-bold hover:bg-orange-primary/20 transition">Limpar todos os filtros</button>
              </div>
            )}
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

// ── Nova Landing Page Dinâmica do Curso ───────────────────────────────────────

function CourseDetailsPage({ courseSlug }: { courseSlug: string }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [leadMessage, setLeadMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [whatsapp, setWhatsapp] = useState('(99) 3199-93940');
  const [activeInfoTab, setActiveInfoTab] = useState<'about' | 'modules' | 'syllabus' | 'faq'>('about');
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(null);
  const [showNativeForm, setShowNativeForm] = useState(false);
  const [showCrmForm, setShowCrmForm] = useState(false);

  useEffect(() => {
    setLoading(true);
    setCourse(null);

    // Buscar curso pela API (sem fallback para dados estáticos)
    fetch(`/api/courses/${courseSlug}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (data.data) {
          setCourse(mapApiCourse(data.data));
        }
        // Se a API retornar sucesso mas sem dados, course fica null → mostra "não encontrado"
        setLoading(false);
      })
      .catch(() => {
        // Erro de rede ou 404 — exibe tela de "não encontrado"
        setLoading(false);
      });

    // Buscar WhatsApp dinâmico (separado, não bloqueia o curso)
    fetch('/api/site-content')
      .then(r => r.json())
      .then(data => {
        const siteSettings = data.data?.settings || data.settings;
        if (siteSettings?.whatsapp) setWhatsapp(siteSettings.whatsapp);
      })
      .catch(() => {});
  }, [courseSlug]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-bg-light text-navy font-bold">Carregando detalhes do curso...</div>;
  if (!course) return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-light text-center">
      <div className="absolute top-0 w-full"><SiteHeader /></div>
      <h2 className="text-2xl font-bold text-navy mt-20">Curso não encontrado.</h2>
      <a href="/cursos" className="mt-4 text-orange-primary font-bold hover:underline">Voltar para a lista de cursos</a>
    </div>
  );

  const parseOrEmpty = (str: string | undefined) => {
    try { return str ? JSON.parse(str) : []; } catch { return []; }
  };

  const benefits = parseOrEmpty(course.benefits);
  const modules = parseOrEmpty(course.modules);
  const teachers = parseOrEmpty(course.teachers);
  const testimonials = parseOrEmpty(course.testimonials);
  const isAdvancedAcademic = isAdvancedAcademicCourse(course);

  async function handleLeadSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const redirectToWhatsapp = isAdvancedAcademicCourse(course) && !String(course.leadConnectorFormId || '').trim();
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: String(form.get('name')),
          email: String(form.get('email')),
          phone: String(form.get('phone')),
          courseSlug: courseSlug,
          preferredFormat: isOnlineCourse(course) ? 'online_ao_vivo' : 'presencial',
          source: redirectToWhatsapp ? 'whatsapp_interest_form' : 'landing_page',
          notes: `Interesse em ${course.kind}: ${course.title}`,
          consentLgpd: true,
        }),
      });
      if (!response.ok) throw new Error('lead_submit_failed');
      setLeadMessage(redirectToWhatsapp ? 'Cadastro recebido. Vamos te direcionar para o WhatsApp.' : 'Recebemos sua solicitação! Nossa equipe entrará em contato em breve.');
      formElement.reset();
      if (redirectToWhatsapp) {
        window.location.href = whatsappLink;
      }
    } catch {
      setLeadMessage('Não conseguimos registrar agora. Tente novamente em instantes.');
    }
    setSending(false);
  }

  const cleanWhatsapp = whatsapp.replace(/\D/g, '');
  const whatsappNumber = cleanWhatsapp.length <= 11 ? `55${cleanWhatsapp}` : cleanWhatsapp;
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Olá, quero saber mais sobre o curso ${course.title}`)}`;

  const refCode = localStorage.getItem('isentidos_guest_referral_code') || '';
  const crmForm = resolveLeadConnectorForm(course, refCode);

  const handleInscricaoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (crmForm.isNative) {
      setShowNativeForm(true);
      return;
    }
    setShowCrmForm(true);
  };

  const isHtml = (str: string) => /<[a-z][\s\S]*>/i.test(str);

  const renderHtmlOrText = (content: string) => {
    if (isHtml(content)) {
      return (
        <div 
          className="prose prose-slate max-w-none text-slate-600 leading-relaxed 
            prose-p:mb-4 prose-ul:list-disc prose-ul:pl-6 prose-li:mb-2 prose-strong:text-navy prose-strong:font-bold" 
          dangerouslySetInnerHTML={{ __html: content }} 
        />
      );
    }
    return <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed whitespace-pre-line">{content}</div>;
  };

  const faqs = [
    {
      q: isAdvancedAcademic ? "O mestrado/doutorado da Enber é reconhecido automaticamente pelo MEC?" : "Os cursos são reconhecidos pelo MEC?",
      a: isAdvancedAcademic
        ? "Não há reconhecimento automático pelo MEC para diplomas estrangeiros. Os programas online da Enber são internacionais; para uso acadêmico ou profissional no Brasil quando exigido, o interessado deve solicitar o reconhecimento individual do diploma pela Plataforma Carolina Bori, conforme as regras do MEC e das universidades brasileiras habilitadas."
        : "Sim! Todos os cursos de pós-graduação e especialização do Instituto Sentidos são oferecidos em parceria com instituições de ensino superior devidamente credenciadas e reconhecidas pelo MEC, garantindo validade nacional ao seu certificado."
    },
    { q: "Quais são os documentos necessários para a matrícula?", a: "Para efetivar a matrícula, é necessário apresentar cópia do RG, CPF, comprovante de residência e cópia do Diploma de Graduação ou declaração de conclusão de curso superior." },
    { q: "Como funciona a modalidade Online ao Vivo e EAD?", a: "Na modalidade Online ao Vivo, as aulas ocorrem em tempo real via internet em datas programadas, permitindo interação direta com professores e alunos. No EAD, as videoaulas e materiais ficam disponíveis 24h por dia para você estudar no seu ritmo." },
    {
      q: "Como é feita a emissão do certificado?",
      a: isAdvancedAcademic
        ? "Ao concluir o programa internacional, o diploma é emitido pela instituição estrangeira responsável. Esse diploma não equivale automaticamente a um título brasileiro; o reconhecimento no Brasil, quando necessário, deve ser solicitado posteriormente via Plataforma Carolina Bori."
        : "Após a conclusão com êxito de todas as disciplinas curriculares e a entrega dos documentos obrigatórios, o certificado de conclusão de pós-graduação Lato Sensu é emitido no prazo regulamentar pelas faculdades parceiras credenciadas pelo MEC."
    }
  ];

  const tabs = [
    { id: 'about', label: 'Apresentação', show: !!course.about },
    { id: 'modules', label: 'Matriz Curricular', show: modules && modules.length > 0 },
    { id: 'syllabus', label: 'Outras Informações', show: !!course.syllabus },
    { id: 'faq', label: 'Dúvidas Frequentes', show: true },
  ].filter(t => t.show);

  // Garantir que a aba ativa padrão existe no array filtrado, se não, usa a primeira disponível
  const activeTabId = tabs.some(t => t.id === activeInfoTab) ? activeInfoTab : (tabs[0]?.id || 'about');

  return (
    <div className="min-h-screen bg-bg-light font-sans text-slate-800 pb-24">
      <SiteHeader />

      {/* Hero Section */}
      <section className="bg-navy relative overflow-hidden pt-8 pb-16 lg:pt-10 lg:pb-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-action/20 via-navy to-navy pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-orange-primary/10 to-transparent pointer-events-none hidden lg:block"></div>
        
        {/* Breadcrumbs discreto e integrado */}
        <div className="mx-auto max-w-6xl px-4 mb-6 relative z-10 flex justify-start">
          <div className="flex items-center gap-2 text-xs font-semibold text-white/60">
            <a href="/" className="hover:text-orange-400 transition">Home</a>
            <ChevronRight className="h-3.5 w-3.5 text-white/40" />
            <a href="/cursos" className="hover:text-orange-400 transition">Cursos</a>
            <ChevronRight className="h-3.5 w-3.5 text-white/40" />
            <span className="text-white/90 truncate max-w-[200px] md:max-w-xs">{course.title}</span>
          </div>
        </div>
        
        <div className="mx-auto max-w-6xl px-4 relative z-10 text-center">
          <span className="mb-6 inline-block rounded-full bg-orange-primary/20 px-5 py-2 text-sm font-bold text-orange-400 border border-orange-primary/30 uppercase tracking-widest">{course.kind} • {getModalityLabel(course.modality, course.kind)}</span>
          <h1 className="mb-6 font-display text-4xl font-bold leading-tight md:text-6xl text-white">{course.title}</h1>
          <p className="mx-auto mb-10 max-w-3xl text-lg text-white/80">{course.summary}</p>
          
          {course.videoUrl && (
            <div className="mx-auto aspect-video w-full max-w-4xl overflow-hidden rounded-2xl shadow-2xl ring-4 ring-white/10 relative group bg-black">
              <iframe className="h-full w-full object-cover" src={course.videoUrl.replace('watch?v=', 'embed/')} title="Apresentação do curso" allowFullScreen></iframe>
            </div>
          )}
        </div>
      </section>

      {/* Duas Colunas - Conteúdo Detalhado e Card Sticky */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Coluna da Esquerda (Informações detalhadas com Abas) */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
            {/* Tabs Selector */}
            <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-none mb-8">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveInfoTab(tab.id as any)}
                  className={`px-6 py-4 font-display font-bold text-sm whitespace-nowrap border-b-2 transition-all duration-200 ${
                    activeTabId === tab.id
                      ? 'border-orange-primary text-orange-primary bg-orange-50/10'
                      : 'border-transparent text-slate-500 hover:text-navy hover:border-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div>
              {activeTabId === 'about' && course.about && (
                <div className="animate-fade-in">
                  <h3 className="font-display text-2xl font-bold text-navy mb-6">Sobre o Curso</h3>
                  {renderHtmlOrText(course.about)}
                </div>
              )}

              {activeTabId === 'modules' && modules && modules.length > 0 && (
                <div className="animate-fade-in">
                  <h3 className="font-display text-2xl font-bold text-navy mb-6">Matriz Curricular</h3>
                  <p className="text-slate-600 text-sm mb-6 font-medium">Confira abaixo as disciplinas que integram a estrutura curricular deste curso:</p>
                  
                  <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-white">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-6 py-4 text-xs font-bold uppercase text-navy tracking-wider">Ordem</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase text-navy tracking-wider">Nome da Disciplina</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase text-navy tracking-wider text-right">Carga Horária</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {modules.map((m: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 text-sm font-semibold text-slate-500">{String(idx + 1).padStart(2, '0')}</td>
                            <td className="px-6 py-4 text-sm font-bold text-navy">{m.title}</td>
                            <td className="px-6 py-4 text-sm text-slate-600 text-right font-medium">{m.description || '30 h'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTabId === 'syllabus' && course.syllabus && (
                <div className="animate-fade-in">
                  <h3 className="font-display text-2xl font-bold text-navy mb-6">Outras Informações</h3>
                  {renderHtmlOrText(course.syllabus)}
                </div>
              )}

              {activeTabId === 'faq' && (
                <div className="animate-fade-in space-y-6">
                  <div>
                    <h3 className="font-display text-2xl font-bold text-navy mb-2">Dúvidas Frequentes</h3>
                    <p className="text-slate-600 text-sm font-medium">Ficou com alguma dúvida? Confira as respostas para as perguntas mais comuns:</p>
                  </div>

                  <div className="space-y-4">
                    {faqs.map((faq, idx) => {
                      const isOpen = openFaqIdx === idx;
                      return (
                        <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm transition-all duration-200 hover:border-slate-300">
                          <button
                            onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                            className="w-full flex items-center justify-between px-6 py-4 text-left font-display font-bold text-navy text-base focus:outline-none"
                          >
                            <span>{faq.q}</span>
                            <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-orange-primary' : ''}`} />
                          </button>
                          <div
                            className={`transition-all duration-300 ease-in-out ${
                              isOpen ? 'max-h-96 border-t border-slate-100' : 'max-h-0 overflow-hidden'
                            }`}
                          >
                            <div className="px-6 py-4 text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                              {faq.a}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Coluna da Direita (Card Sticky de Informações & Preço) */}
          <aside className="lg:col-span-4 w-full">
            <div className="sticky top-28 bg-white border border-slate-200 rounded-2xl shadow-xl p-6 transition-all duration-300 hover:shadow-2xl">
              <span className="inline-block rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-600 mb-4">{course.kind}</span>
              <h3 className="font-display text-2xl font-extrabold text-navy leading-tight mb-4">{course.title}</h3>
              
              <hr className="border-slate-100 my-4" />
              
              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-primary shrink-0">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Modalidade</p>
                    <p className="text-sm font-bold text-navy">{getModalityLabel(course.modality, course.kind)}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-primary shrink-0">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Carga Horária</p>
                    <p className="text-sm font-bold text-navy">{course.workload}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-primary shrink-0">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Certificado</p>
                    <p className="text-sm font-bold text-navy">
                      {isAdvancedAcademic ? 'Diploma estrangeiro; reconhecimento via Carolina Bori' : 'Reconhecido pelo MEC'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100/50 mb-6">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Investimento</p>
                {course.installmentValue && course.installmentValue > 0 ? (
                  <div className="space-y-1">
                    {course.enrollmentFee && course.enrollmentFee > 0 && (
                      <div className="text-xs text-slate-600 font-semibold flex justify-between">
                        <span>Taxa de Matrícula:</span>
                        <span className="text-orange-primary font-bold">R$ {Number(course.enrollmentFee).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="text-2xl font-display font-extrabold text-navy mt-1">
                      {course.maxInstallments || 1}x <span className="text-sm font-normal text-slate-500">de</span> R$ {Number(course.installmentValue).toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium pt-1 border-t border-slate-200/50">
                      Total do curso: R$ {Number((course.installmentValue * (course.maxInstallments || 1)) + (course.enrollmentFee || 0)).toFixed(2)}
                    </div>
                  </div>
                ) : (
                  <p className="text-xl font-bold text-navy">{course.investment}</p>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <a
                  href={crmForm.url || '#'}
                  onClick={handleInscricaoClick}
                  className="block w-full rounded-xl bg-orange-primary px-6 py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-orange-primary/20 transition hover:-translate-y-0.5 hover:bg-orange-600 hover:shadow-orange-primary/30"
                >
                  Quero me inscrever
                </a>
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20ba56] px-6 py-3.5 text-sm font-bold text-white transition-all shadow-md hover:shadow-[#25D366]/20 hover:-translate-y-0.5"
                >
                  <MessageCircle className="h-5 w-5 fill-current" />
                  <span>Dúvidas no WhatsApp</span>
                </a>
              </div>
            </div>
          </aside>

        </div>
      </section>

      {/* Seção Adicional: Por que escolher este curso (Benefits) */}
      {benefits && benefits.length > 0 && (
        <section className="bg-gradient-to-b from-slate-100 to-white py-16 border-t border-b border-slate-200/50">
          <div className="mx-auto max-w-6xl px-4">
            <div className="text-center mb-12">
               <h2 className="font-display text-3xl font-bold text-navy md:text-4xl">Por que escolher este curso?</h2>
               <div className="h-1 w-20 bg-orange-primary mx-auto mt-6 rounded-full"></div>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {benefits.map((b: any, i: number) => (
                <div key={i} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-8 shadow-soft transition hover:shadow-xl hover:-translate-y-1 hover:border-blue-action/30 text-center items-center">
                  <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-navy text-orange-primary shrink-0 shadow-inner">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="mb-3 font-bold text-navy text-lg leading-tight">{b.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{b.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Seção Adicional: Professores */}
      {teachers && teachers.length > 0 && (
        <section className="py-16">
          <div className="mx-auto max-w-6xl px-4 text-center">
            <div className="text-center mb-12">
               <h2 className="font-display text-3xl font-bold text-navy md:text-4xl">Corpo Docente</h2>
               <p className="text-slate-500 font-semibold mt-2">Conheça os profissionais que acompanharão a sua jornada acadêmica:</p>
               <div className="h-1 w-20 bg-orange-primary mx-auto mt-6 rounded-full"></div>
            </div>
            
            <div className="grid gap-8 md:grid-cols-3 lg:grid-cols-4">
              {teachers.map((t: any, i: number) => (
                <div key={i} className="flex flex-col items-center rounded-3xl border border-slate-200 bg-white p-8 shadow-soft transition hover:shadow-xl hover:-translate-y-1">
                  <div className="relative mb-6">
                    <img src={t.avatarUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&q=80'} alt={t.name} className="relative h-28 w-28 rounded-full object-cover shadow-md ring-4 ring-slate-50" />
                  </div>
                  <h3 className="font-bold text-navy text-lg">{t.name}</h3>
                  <p className="mt-2 text-xs font-bold text-orange-primary uppercase tracking-wider">{t.role}</p>
                  {t.bio && <p className="mt-4 text-sm text-slate-500 line-clamp-3">{t.bio}</p>}
                  {t.linkedinUrl && (
                    <a href={t.linkedinUrl} target="_blank" rel="noreferrer" className="mt-6 text-sm font-bold text-blue-action hover:underline border border-slate-200 rounded-full px-4 py-1.5 hover:bg-slate-50 transition">Ver currículo</a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Seção Adicional: Depoimentos */}
      {testimonials && testimonials.length > 0 && (
        <section className="bg-white py-16 border-t border-slate-100">
          <div className="mx-auto max-w-5xl px-4 text-center">
            <div className="text-center mb-12">
               <h2 className="font-display text-3xl font-bold text-navy md:text-4xl">Histórias de Sucesso</h2>
               <p className="text-slate-500 font-semibold mt-2">O que dizem os nossos alunos e ex-alunos:</p>
               <div className="h-1 w-20 bg-orange-primary mx-auto mt-6 rounded-full"></div>
            </div>
            
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((t: any, i: number) => (
                <div key={i} className="rounded-3xl border border-slate-100 bg-bg-light p-8 text-left shadow-soft relative">
                  <Star className="absolute top-6 right-6 h-6 w-6 text-orange-primary opacity-20" />
                  <p className="text-slate-700 italic leading-relaxed text-sm">"{t.text}"</p>
                  <div className="mt-6 flex items-center gap-4 border-t border-slate-200 pt-6">
                    <img src={t.avatarUrl || 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&q=80'} alt={t.name} className="h-12 w-12 rounded-full object-cover ring-2 ring-white" />
                    <div>
                      <div className="font-bold text-navy text-sm">{t.name}</div>
                      <div className="text-xs font-semibold text-orange-primary uppercase mt-0.5">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <SiteFooter />

      {/* CRM Form Modal */}
      {showCrmForm && !crmForm.isNative && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-orange-primary">Pré-matrícula</p>
                <h3 className="font-display text-lg font-bold text-navy">{course.title}</h3>
              </div>
              <button
                onClick={() => setShowCrmForm(false)}
                className="rounded-lg border border-slate-200 p-2 text-slate-400 transition hover:border-red-300 hover:text-red-500"
                aria-label="Fechar formulário"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto bg-slate-50 p-3">
              <LeadConnectorFormFrame config={crmForm} height={760} />
            </div>
          </div>
        </div>
      )}

      {/* Native Form Modal Fallback */}
      {showNativeForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <button
              onClick={() => setShowNativeForm(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-navy hover:bg-slate-100 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            <h3 className="font-display font-bold text-navy text-xl mb-4 pr-8">Receba informações completas</h3>
            <form onSubmit={async (e) => {
              await handleLeadSubmit(e);
              setTimeout(() => setShowNativeForm(false), 2000);
            }} className="flex flex-col gap-4">
               <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1">Nome completo</label>
                 <input required name="name" type="text" placeholder="Seu nome" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none ring-blue-action/20 transition focus:ring-4 focus:border-blue-action text-navy" />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1">E-mail</label>
                 <input required name="email" type="email" placeholder="seuemail@exemplo.com" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none ring-blue-action/20 transition focus:ring-4 focus:border-blue-action text-navy" />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1">WhatsApp</label>
                 <input required name="phone" type="tel" placeholder="(00) 00000-0000" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none ring-blue-action/20 transition focus:ring-4 focus:border-blue-action text-navy" />
               </div>
               <button disabled={sending} type="submit" className="mt-2 w-full rounded-xl bg-orange-primary px-5 py-4 font-bold text-white transition hover:bg-orange-600 shadow-lg shadow-orange-primary/30 disabled:opacity-70">
                 {sending ? 'Enviando...' : 'Quero me inscrever'}
               </button>
               {leadMessage && <p className="mt-2 text-center text-sm font-bold text-green-600">{leadMessage}</p>}
            </form>
          </div>
        </div>
      )}
      
      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-2xl z-40 bg-white/90 backdrop-blur-md border border-slate-200/50 shadow-[0_10px_30px_rgba(0,0,0,0.08)] rounded-2xl px-6 py-4 flex items-center justify-between gap-4 transition-all duration-300">
         <div className="hidden sm:block">
           <p className="font-display font-bold text-navy text-sm">Tem alguma dúvida sobre este curso?</p>
           <p className="text-xs text-slate-500 font-semibold mt-0.5">Nossos especialistas estão prontos para te ajudar agora.</p>
         </div>
         <div className="sm:hidden">
           <p className="font-display font-bold text-navy text-sm">Dúvidas sobre o curso?</p>
           <p className="text-[11px] text-slate-500 font-semibold">Fale com nossa equipe.</p>
         </div>
         
         <a href={whatsappLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20ba56] px-5 py-2.5 text-sm font-bold text-white transition-all duration-300 shadow-md hover:shadow-[#25D366]/20 hover:-translate-y-0.5 whitespace-nowrap active:translate-y-0">
            <MessageCircle className="h-4.5 w-4.5 fill-current" />
            <span>Falar no WhatsApp</span>
         </a>
      </div>
    </div>
  );
}

// ── Blog Pages ─────────────────────────────────────────────────────────────

function useSEO({ title, description, keywords, ogImage }: { title: string; description: string; keywords?: string[]; ogImage?: string }) {
  useEffect(() => {
    document.title = `${title} | Instituto Sentidos`;

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', description);

    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    if (keywords && keywords.length) {
      metaKeywords.setAttribute('content', keywords.join(', '));
    }

    // OpenGraph
    const setOgTag = (property: string, content: string) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    setOgTag('og:title', title);
    setOgTag('og:description', description);
    if (ogImage) setOgTag('og:image', ogImage);
    setOgTag('og:type', 'website');

  }, [title, description, keywords, ogImage]);
}

function BlogListPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [loading, setLoading] = useState(true);

  useSEO({
    title: 'Blog Profissional',
    description: 'Acompanhe as últimas novidades, dicas de carreira e práticas inclusivas no blog do Instituto Sentidos.',
    keywords: ['Blog', 'Educação', 'Inclusão', 'Neurodiversidade']
  });

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (categoryFilter !== 'Todos') params.append('category', categoryFilter);
    if (query) params.append('search', query);

    fetch(`/api/blog-posts?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setPosts(data.data || []);
      })
      .finally(() => setLoading(false));
  }, [categoryFilter, query]);

  const categories = ['Todos', 'Inclusão', 'Autismo', 'Carreira', 'Estratégias'];
  const featuredPost = posts.length > 0 ? posts[0] : null;
  const recentPosts = posts.slice(1, 4);

  return (
    <div className="min-h-screen bg-bg-light text-slate-900">
      <SiteHeader />
      <main>
        {/* Hero Section */}
        <section className="bg-navy py-16 text-white text-center">
          <div className="mx-auto max-w-3xl px-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-primary/40 bg-orange-primary/10 px-4 py-2 text-sm font-bold text-orange-100 mb-6">
              <Sparkles className="h-4 w-4 text-orange-primary" aria-hidden />
              #BlogSentidos
            </span>
            <h1 className="font-display text-4xl md:text-5xl font-extrabold leading-tight">Nosso espaço para quem educa, inclui e inova.</h1>
            <p className="mt-6 text-lg text-white/80">Ideias, estratégias e inspiração para você transformar o mundo através do ensino.</p>
          </div>
        </section>

        {/* Featured & Recent */}
        {!query && categoryFilter === 'Todos' && featuredPost && (
          <section className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-12">
              <div className="lg:col-span-8">
                <a href={`/blog/${featuredPost.slug}`} className="group relative block overflow-hidden rounded-2xl shadow-soft">
                  <img src={featuredPost.coverImageUrl || 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80'} alt="" className="h-[400px] w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy/90 to-transparent flex flex-col justify-end p-8">
                    <span className="self-start rounded-md bg-orange-primary px-3 py-1 text-xs font-bold uppercase text-white mb-4">{featuredPost.category}</span>
                    <h2 className="font-display text-3xl font-bold text-white mb-2">{featuredPost.title}</h2>
                    <p className="text-white/80 line-clamp-2">{featuredPost.excerpt}</p>
                  </div>
                </a>
              </div>
              <div className="lg:col-span-4 flex flex-col gap-5">
                <h3 className="font-display text-xl font-bold text-navy mb-2">Artigos Recentes</h3>
                {recentPosts.map(p => (
                  <a key={p.id} href={`/blog/${p.slug}`} className="flex gap-4 group">
                    <img src={p.coverImageUrl || 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=400&q=80'} alt="" className="h-24 w-24 rounded-lg object-cover" />
                    <div className="flex flex-col justify-center">
                      <span className="text-xs font-bold uppercase text-orange-primary">{p.category}</span>
                      <h4 className="font-bold text-navy mt-1 group-hover:text-blue-action transition line-clamp-2">{p.title}</h4>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Filter & Grid */}
        <section className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
          <div className="flex flex-col md:flex-row gap-6 justify-between items-center mb-10">
            <div className="flex flex-wrap gap-2">
              {categories.map(c => (
                <button
                  key={c}
                  onClick={() => setCategoryFilter(c)}
                  className={`rounded-full px-5 py-2 text-sm font-bold transition ${categoryFilter === c ? 'bg-navy text-white' : 'bg-white text-navy border border-slate-200 hover:border-navy'}`}
                >
                  {c}
                </button>
              ))}
            </div>
            <label className="relative w-full md:w-80 block">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar artigos..." className="w-full rounded-full border border-slate-200 bg-white py-3 pl-12 pr-4 outline-none ring-orange-primary/20 transition focus:ring-4" />
            </label>
          </div>

          {loading ? (
             <div className="py-20 text-center"><p className="text-slate-500 font-medium">Carregando artigos...</p></div>
          ) : posts.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map(p => (
                <article key={p.id} className="group flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-xl hover:-translate-y-1">
                  <a href={`/blog/${p.slug}`} className="block overflow-hidden rounded-t-2xl">
                    <img src={p.coverImageUrl || 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80'} alt="" className="h-48 w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  </a>
                  <div className="p-6 flex flex-col flex-1">
                    <span className="text-xs font-bold uppercase text-blue-action tracking-wider">{p.category}</span>
                    <a href={`/blog/${p.slug}`}><h3 className="mt-3 font-display text-xl font-bold text-navy leading-tight">{p.title}</h3></a>
                    <p className="mt-3 text-sm text-slate-600 line-clamp-3 mb-6">{p.excerpt}</p>
                    <a href={`/blog/${p.slug}`} className="mt-auto inline-flex items-center gap-2 text-sm font-bold text-orange-primary group-hover:text-orange-600 transition">
                      Ler artigo <ChevronRight className="h-4 w-4" />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center">
              <Newspaper className="mx-auto h-12 w-12 text-slate-300 mb-4" />
              <h3 className="font-display text-xl font-bold text-navy">Nenhum artigo encontrado</h3>
              <p className="text-slate-500 mt-2">Tente ajustar seus filtros de busca.</p>
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function BlogArticlePage({ postSlug }: { postSlug: string }) {
  const [post, setPost] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/blog-posts/${postSlug}`)
      .then(r => r.json())
      .then(data => {
        if (data.data) {
           setPost(data.data);
           // Fetch related
           fetch(`/api/blog-posts?category=${data.data.category}`)
             .then(r => r.json())
             .then(relData => {
               if (relData.data) {
                 setRelated(relData.data.filter((p: any) => p.id !== data.data.id).slice(0, 3));
               }
             });
        }
      })
      .finally(() => setLoading(false));
  }, [postSlug]);

  useSEO({
    title: post?.title || 'Carregando Artigo...',
    description: post?.excerpt || '',
    keywords: post?.tags || [],
    ogImage: post?.coverImageUrl
  });

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><p className="text-navy font-bold text-xl">Carregando...</p></div>;
  if (!post) return <div className="min-h-screen flex items-center justify-center bg-white"><h1 className="text-3xl font-display font-bold text-navy">Artigo não encontrado</h1></div>;

  const pubDate = post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('pt-BR') : 'Publicado recentemente';

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_320px]">
          {/* Main Article Column */}
          <article className="max-w-[800px]">
            <span className="inline-block rounded-md bg-orange-primary/10 px-3 py-1 text-xs font-bold uppercase text-orange-primary tracking-wider mb-5">{post.category}</span>
            <h1 className="font-display text-4xl md:text-5xl font-extrabold text-navy leading-tight mb-6">{post.title}</h1>
            <p className="text-xl text-slate-600 mb-8 leading-relaxed">{post.excerpt}</p>

            <div className="flex items-center gap-4 mb-10 border-y border-slate-100 py-6">
              <div className="h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xl">
                 {(post.author?.name || 'IS')[0]}
              </div>
              <div>
                <p className="font-bold text-navy">{post.author?.name || 'Instituto Sentidos'}</p>
                <p className="text-sm text-slate-500">{pubDate} • Leitura de 5 min</p>
              </div>
            </div>

            <img src={post.coverImageUrl || 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80'} alt="" className="w-full h-auto rounded-2xl shadow-md mb-12 object-cover max-h-[500px]" />

            <div className="bg-bg-light rounded-xl p-6 mb-12 border border-slate-200">
              <h3 className="font-bold text-navy mb-4 flex items-center gap-2"><BookOpen className="h-5 w-5 text-orange-primary" /> O que você vai encontrar neste artigo</h3>
              <ul className="space-y-2 text-sm text-slate-700 font-medium">
                {(post.content || '').match(/<h2[^>]*>(.*?)<\/h2>/g)?.map((h2: string, i: number) => {
                   const title = h2.replace(/<\/?[^>]+(>|$)/g, "");
                   return <li key={i} className="flex items-center gap-2"><ChevronRight className="h-4 w-4 text-orange-primary" /> {title}</li>
                }) || <li><ChevronRight className="h-4 w-4 text-orange-primary" /> Tópicos principais do texto</li>}
              </ul>
            </div>

            <div className="prose prose-lg prose-slate prose-headings:font-display prose-headings:font-bold prose-headings:text-navy prose-a:text-blue-action prose-img:rounded-xl max-w-none" dangerouslySetInnerHTML={{ __html: post.content || '' }} />

            <div className="mt-16 flex flex-wrap gap-2">
              {post.tags?.map((tag: string) => (
                <span key={tag} className="rounded-full bg-slate-100 px-4 py-1.5 text-sm font-semibold text-slate-600">#{tag}</span>
              ))}
            </div>

            <div className="mt-12 rounded-2xl bg-gradient-to-r from-navy to-blue-action p-8 text-white flex flex-col sm:flex-row items-center gap-8 justify-between shadow-lg">
               <div>
                 <h3 className="font-display text-2xl font-bold mb-2">Quer se aprofundar neste tema?</h3>
                 <p className="text-white/80">Conheça nossos cursos de Pós-graduação e Especilização.</p>
               </div>
               <a href="/cursos" className="whitespace-nowrap rounded-lg bg-orange-primary px-6 py-3 font-bold text-white transition hover:bg-orange-600">Ver cursos</a>
            </div>
          </article>

          {/* Sidebar */}
          <aside className="space-y-10">
            <div className="bg-bg-light rounded-xl p-6 border border-slate-200">
              <h3 className="font-bold text-navy mb-4">Pesquisar no Blog</h3>
              <form action="/blog" method="GET" className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden />
                <input name="search" placeholder="Buscar..." className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 outline-none ring-orange-primary/20 focus:ring-2" />
              </form>
            </div>

            {related.length > 0 && (
              <div>
                <h3 className="font-display text-xl font-bold text-navy mb-6 flex items-center gap-2"><Sparkles className="h-5 w-5 text-orange-primary"/> Artigos Relacionados</h3>
                <div className="space-y-6">
                  {related.map(rel => (
                    <a key={rel.id} href={`/blog/${rel.slug}`} className="group flex gap-4">
                      <img src={rel.coverImageUrl || 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=200&q=80'} alt="" className="h-20 w-20 rounded-lg object-cover" />
                      <div>
                        <span className="text-[10px] font-bold uppercase text-blue-action mb-1 block">{rel.category}</span>
                        <h4 className="font-bold text-navy text-sm leading-snug group-hover:text-orange-primary transition">{rel.title}</h4>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl overflow-hidden shadow-soft">
               <img src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80" alt="Ebook" className="w-full h-40 object-cover" />
               <div className="bg-white p-5">
                  <h4 className="font-bold text-navy mb-2">E-book Gratuito: Práticas Inclusivas</h4>
                  <p className="text-sm text-slate-600 mb-4">Baixe nosso checklist completo para organização escolar.</p>
                  <a href="/#ebooks" className="block w-full text-center rounded-lg border-2 border-orange-primary py-2 text-sm font-bold text-orange-primary hover:bg-orange-primary hover:text-white transition">Baixar agora</a>
               </div>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

// ── Ebooks Page ─────────────────────────────────────────────────────────────

interface MauticFormEmbedProps {
  formId: number | string;
  ebook: Ebook;
  onSubmitted: () => void;
}

const MAUTIC_BASE_URL = 'https://mautic.isentidos.com.br';

function MauticFormEmbed({ formId, ebook, onSubmitted }: MauticFormEmbedProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const submittingRef = React.useRef(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let cancelled = false;
    let timeoutTimer: number | undefined;

    el.innerHTML = '';
    setStatus('loading');
    setErrorMessage('');

    const formUrl = `/api/mautic/forms/${encodeURIComponent(String(formId))}`;
    console.log('[ebook:mautic] load:start', {
      url: `${MAUTIC_BASE_URL}/form/generate.js?id=${encodeURIComponent(String(formId))}`,
      formId,
      ebookId: ebook.id,
      ebookTitle: ebook.title,
    });

    const handleSubmit = async (event: globalThis.Event) => {
      event.preventDefault();
      if (submittingRef.current) return;
      const form = event.currentTarget as HTMLFormElement;
      const formData = new FormData(form);
      const getField = (...names: string[]) => {
        for (const name of names) {
          const value = formData.get(`mauticform[${name}]`) || formData.get(name);
          if (value) return String(value).trim();
        }
        return '';
      };
      const payload = {
        ebookId: String(ebook.id),
        ebookTitle: ebook.title,
        mauticFormId: Number(formId),
        name: getField('nome', 'name', 'firstname'),
        email: getField('email'),
        phone: getField('whatsapp', 'telefone', 'phone'),
        consentLgpd: true,
      };

      console.log('[ebook:mautic] form:submit', { formId, ebookId: ebook.id });
      submittingRef.current = true;
      setSubmitting(true);
      try {
        const response = await fetch('/api/ebook-leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await response.json().catch(() => ({}));
        console.log('[ebook:mautic] proxy:done', {
          status: response.status,
          mautic: json?.data?.mautic,
        });
        if (!response.ok) throw new Error(json.error || 'Não foi possível enviar seus dados.');
        if (ebook.fileUrl) window.open(ebook.fileUrl, '_blank', 'noopener,noreferrer');
        onSubmitted();
      } catch (error) {
        console.error('[ebook:mautic] proxy:error', error);
        setErrorMessage(error instanceof Error ? error.message : 'Erro ao enviar. Use o formulário alternativo.');
        setStatus('failed');
      } finally {
        submittingRef.current = false;
        setSubmitting(false);
      }
    };

    const loadForm = async () => {
      try {
        const response = await fetch(formUrl);
        const json = await response.json().catch(() => ({}));
        if (!response.ok || !json.data?.html) {
          throw new Error(json.error || 'Formulário Mautic indisponível.');
        }
        if (cancelled) return;

        el.innerHTML = json.data.html;
        const form = el.querySelector('form');
        form?.setAttribute('target', '_self');
        form?.addEventListener('submit', handleSubmit);

        if (!(window as any).MauticSDKLoaded) {
          (window as any).MauticSDKLoaded = true;
          const script = document.createElement('script');
          script.type = 'text/javascript';
          script.async = true;
          script.src = json.data.sdkUrl || `${MAUTIC_BASE_URL}/media/js/mautic-form.js`;
          script.onload = () => {
            console.log('[ebook:mautic] sdk:loaded', { formId, url: script.src });
            (window as any).MauticSDK?.onLoad?.();
          };
          script.onerror = () => {
            console.warn('[ebook:mautic] sdk:error', { formId, url: script.src });
          };
          document.head.appendChild(script);
          (window as any).MauticDomain = MAUTIC_BASE_URL;
          (window as any).MauticLang = { submittingMessage: 'Enviando...' };
        } else {
          (window as any).MauticSDK?.onLoad?.();
        }

        console.log('[ebook:mautic] form:ready', {
          formId,
          formName: json.data.formName,
          fields: json.data.fields,
        });
        setStatus('ready');
        if (timeoutTimer) window.clearTimeout(timeoutTimer);
      } catch (error) {
        console.error('[ebook:mautic] load:error', error);
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Não foi possível carregar o formulário do Mautic agora.');
          setStatus('failed');
        }
      }
    };

    timeoutTimer = window.setTimeout(() => {
      if (cancelled) return;
      console.warn('[ebook:mautic] load:timeout', { formId, url: formUrl });
      setErrorMessage('O formulário externo demorou para responder.');
      setStatus('failed');
    }, 8000);

    loadForm();

    return () => {
      cancelled = true;
      if (timeoutTimer) window.clearTimeout(timeoutTimer);
      const form = el.querySelector('form');
      form?.removeEventListener('submit', handleSubmit);
      el.innerHTML = '';
    };
  }, [formId, ebook.id, ebook.title, ebook.fileUrl, onSubmitted]);

  return (
    <div className="space-y-4">
      {status === 'loading' && (
        <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-orange-primary" />
          <p className="text-sm font-semibold text-slate-600">Carregando formulário seguro...</p>
        </div>
      )}
      <div
        ref={containerRef}
        className={`mautic-form-container min-h-[200px] ${status === 'failed' ? 'hidden' : ''} ${submitting ? 'pointer-events-none opacity-60' : ''}`}
        style={{ '--mautic-brand': '#ea580c' } as React.CSSProperties}
      />
      {submitting && (
        <div className="flex items-center justify-center gap-2 rounded-lg bg-orange-50 p-3 text-sm font-bold text-orange-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          Enviando seus dados...
        </div>
      )}
      {status === 'failed' && (
        <InternalEbookLeadForm
          ebook={ebook}
          errorMessage={errorMessage}
          onSubmitted={onSubmitted}
        />
      )}
    </div>
  );
}

interface InternalEbookLeadFormProps {
  ebook: Ebook;
  errorMessage?: string;
  onSubmitted: () => void;
}

function InternalEbookLeadForm({ ebook, errorMessage, onSubmitted }: InternalEbookLeadFormProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submitFallback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = new FormData(event.currentTarget);
    const payload = {
      ebookId: String(ebook.id),
      ebookTitle: ebook.title,
      mauticFormId: ebook.mauticFormId ?? null,
      name: String(form.get('name') || '').trim(),
      email: String(form.get('email') || '').trim(),
      phone: String(form.get('phone') || '').trim(),
      consentLgpd: form.get('consentLgpd') === 'on',
    };

    setSaving(true);
    setError('');
    console.log('[ebook:fallback] submit:start', {
      ebookId: ebook.id,
      formId: ebook.mauticFormId,
    });

    try {
      const res = await fetch('/api/ebook-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      console.log('[ebook:fallback] submit:done', {
        status: res.status,
        mautic: json?.data?.mautic,
      });
      if (!res.ok) throw new Error(json.error || 'Não foi possível registrar seus dados.');
      if (ebook.fileUrl) window.open(ebook.fileUrl, '_blank', 'noopener,noreferrer');
      onSubmitted();
    } catch (err) {
      console.error('[ebook:fallback] submit:error', err);
      setError(err instanceof Error ? err.message : 'Erro ao enviar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submitFallback} className="space-y-4 rounded-xl border border-orange-100 bg-orange-50/50 p-4">
      <div className="flex gap-3 rounded-lg bg-white p-3 text-sm text-slate-600">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-primary" />
        <p>
          {errorMessage || 'O formulário externo não respondeu.'} Use este cadastro seguro para liberar o download.
        </p>
      </div>
      <label className="block">
        <span className="text-sm font-bold text-navy">Nome completo</span>
        <input name="name" required minLength={3} autoComplete="name" className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-primary focus:ring-2 focus:ring-orange-primary/20" />
      </label>
      <label className="block">
        <span className="text-sm font-bold text-navy">E-mail</span>
        <input name="email" required type="email" autoComplete="email" className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-primary focus:ring-2 focus:ring-orange-primary/20" />
      </label>
      <label className="block">
        <span className="text-sm font-bold text-navy">Telefone / WhatsApp</span>
        <input name="phone" required minLength={8} autoComplete="tel" className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-primary focus:ring-2 focus:ring-orange-primary/20" />
      </label>
      <label className="flex items-start gap-2 text-xs leading-relaxed text-slate-600">
        <input name="consentLgpd" type="checkbox" defaultChecked className="mt-1 h-4 w-4 rounded border-slate-300 accent-orange-primary" />
        Autorizo o Instituto Sentidos a armazenar meus dados para envio do material e comunicações relacionadas, conforme a LGPD.
      </label>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-primary px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {saving ? 'Enviando...' : 'Enviar e baixar'}
      </button>
    </form>
  );
}

const ebookCategories = ['Todos', 'Anais de Eventos', 'Livro Digital'];
const ebookCategoryGradients: Record<string, string> = {
  'Anais de Eventos': 'from-purple-700 to-purple-900',
  'Livro Digital': 'from-teal-600 to-teal-900',
};

function EbooksPage() {
  const [ebooks, setEbooks] = useState<Ebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [selectedEbook, setSelectedEbook] = useState<Ebook | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const completeEbookDownload = React.useCallback(() => {
    console.log('[ebook:modal] submit:confirmed');
    setSubmitted(true);
  }, []);

  useEffect(() => {
    fetch('/api/ebooks')
      .then((r) => r.json())
      .then((data) => {
        if (data.data?.length) {
          setEbooks(data.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.mauticFormSubmitted || String(e.data).includes('mautic')) {
        console.log('[ebook:mautic] message', { origin: e.origin, data: e.data });
        completeEbookDownload();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [completeEbookDownload]);

  useEffect(() => {
    setSubmitted(false);
  }, [selectedEbook]);

  useEffect(() => {
    if (selectedEbook) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedEbook]);

  const filteredEbooks =
    categoryFilter === 'Todos'
      ? ebooks
      : ebooks.filter((e) => e.category === categoryFilter);

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />

      {/* Hero section */}
      <section className="relative overflow-hidden bg-navy py-20 text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-orange-primary/10 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-blue-action/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 text-center lg:px-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-primary/30 bg-orange-primary/10 px-4 py-1.5 text-sm font-bold text-orange-300">
            <Download className="h-4 w-4" />
            100% Gratuito · Sem Custo
          </div>

          <h1 className="font-display text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
            Biblioteca de <span className="text-orange-primary">E-books</span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg text-white/75 leading-relaxed">
            Materiais científicos e práticos sobre Educação Especial e Inclusiva, TEA e muito mais.
            Preencha o formulário e receba o material gratuitamente no seu e-mail.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm">
            {[
              { icon: '📖', label: `${ebooks.length || 5} materiais` },
              { icon: '📧', label: 'Enviado por e-mail' },
              { icon: '✅', label: 'Conteúdo científico' },
              { icon: '🆓', label: 'Sempre gratuito' },
            ].map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-white/70">
                <span>{icon}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Category tabs */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur shadow-sm">
        <div className="mx-auto max-w-5xl px-4 lg:px-8">
          <div className="flex items-center gap-2 overflow-x-auto py-3">
            {ebookCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`shrink-0 rounded-full px-5 py-2 text-sm font-bold transition-all ${
                  categoryFilter === cat
                    ? 'bg-orange-primary text-white shadow-md scale-105'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-orange-primary hover:text-orange-primary'
                }`}
              >
                {cat}
                {cat !== 'Todos' && (
                  <span
                    className={`ml-2 rounded-full px-1.5 py-0.5 text-xs ${
                      categoryFilter === cat ? 'bg-white/20' : 'bg-slate-100'
                    }`}
                  >
                    {ebooks.filter((e) => e.category === cat).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Ebooks List */}
      <section className="mx-auto max-w-5xl px-4 py-16 lg:px-8">
        {loading ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-96 animate-pulse rounded-2xl bg-slate-200" />
            ))}
          </div>
        ) : (
          <>
            <p className="mb-8 text-sm font-semibold text-slate-500">
              {filteredEbooks.length}{' '}
              {filteredEbooks.length === 1 ? 'material disponível' : 'materiais disponíveis'}
            </p>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {filteredEbooks.map((ebook) => (
                <article
                  key={ebook.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
                >
                  <div
                    className={`relative flex h-56 items-center justify-center overflow-hidden bg-gradient-to-br ${
                      ebookCategoryGradients[ebook.category] || 'from-navy to-blue-action'
                    }`}
                  >
                    {ebook.coverUrl ? (
                      <img
                        src={ebook.coverUrl}
                        alt={ebook.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <BookOpen className="h-16 w-16 text-white/40" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    <div className="absolute left-3 top-3 rounded-full bg-black/40 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
                      {ebook.category}
                    </div>
                    <div className="absolute right-3 top-3 rounded-full bg-green-500 px-3 py-1 text-xs font-bold text-white shadow">
                      GRÁTIS
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <div className="mb-3 flex gap-3 text-xs text-slate-400">
                      {ebook.pages && (
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {ebook.pages}
                        </span>
                      )}
                      {ebook.pages && ebook.year && <span>·</span>}
                      {ebook.year && <span>{ebook.year}</span>}
                    </div>

                    <h2 className="mb-3 font-display text-base font-bold leading-snug text-navy line-clamp-3">
                      {ebook.title}
                    </h2>

                    <p className="mb-5 flex-1 text-sm leading-relaxed text-slate-600 line-clamp-3">
                      {ebook.description}
                    </p>

                    <button
                      onClick={() => setSelectedEbook(ebook)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-primary py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-orange-600 hover:shadow-lg active:scale-95"
                    >
                      <Download className="h-4 w-4" />
                      Fazer Download Grátis
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {/* CTA section */}
      <section className="mx-auto max-w-5xl px-4 pb-16 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-navy to-blue-action p-10 text-white shadow-xl">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/5" />
          <div className="relative flex flex-col items-center gap-6 text-center md:flex-row md:text-left">
            <div className="flex-1">
              <p className="mb-1 text-sm font-bold uppercase tracking-wider text-orange-300">
                Quer se aprofundar?
              </p>
              <h2 className="font-display text-2xl font-bold">Conheça nossas Pós-graduações</h2>
              <p className="mt-2 text-white/70">
                Formação completa, com certificado reconhecido e atendimento personalizado.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3">
              <a
                href="/cursos"
                className="rounded-xl bg-orange-primary px-8 py-3 font-bold text-white shadow-lg transition hover:bg-orange-600 text-center"
              >
                Ver cursos
              </a>
              <a
                href="/#contato"
                className="rounded-xl border border-white/30 px-8 py-3 text-sm font-bold text-white transition hover:bg-white/10 text-center"
              >
                Falar com consultor
              </a>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />

      {/* Download Modal */}
      {selectedEbook && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedEbook(null);
          }}
        >
          <div
            className="absolute inset-0 bg-navy/80 backdrop-blur-sm"
            onClick={() => setSelectedEbook(null)}
          />

          <div
            className="relative z-10 flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl md:flex-row"
            style={{ maxHeight: '90vh' }}
          >
            {/* Left Column - Cover / Info */}
            <div
              className={`flex shrink-0 flex-col justify-between bg-gradient-to-br p-8 text-white md:w-64 ${
                ebookCategoryGradients[selectedEbook.category] || 'from-navy to-blue-action'
              }`}
            >
              <div>
                {selectedEbook.coverUrl && (
                  <img
                    src={selectedEbook.coverUrl}
                    alt={selectedEbook.title}
                    className="mb-5 w-full rounded-xl object-cover shadow-xl"
                  />
                )}
                <span className="mb-2 inline-block rounded-full bg-white/20 px-3 py-0.5 text-xs font-bold">
                  {selectedEbook.category}
                </span>
                <h3 className="mt-2 font-display text-base font-bold leading-snug">
                  {selectedEbook.title}
                </h3>
                {(selectedEbook.pages || selectedEbook.year) && (
                  <p className="mt-3 text-xs text-white/60">
                    {[selectedEbook.pages, selectedEbook.year].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
              <div className="mt-6 rounded-xl bg-white/10 p-3 text-xs text-white/80">
                📧 Você receberá o material no e-mail após o cadastro.
              </div>
            </div>

            {/* Right Column - Form */}
            <div className="flex flex-1 flex-col overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 p-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-orange-primary">
                    Download Gratuito
                  </p>
                  <h2 className="font-display text-lg font-bold text-navy">
                    Preencha para receber o e-book
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedEbook(null)}
                  className="rounded-lg border border-slate-200 p-2 text-slate-400 transition hover:border-red-300 hover:text-red-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 p-6">
                {submitted ? (
                  <div className="flex flex-col items-center gap-4 py-10 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="font-display text-xl font-bold text-navy">Obrigado!</h3>
                    <p className="text-sm text-slate-600">
                      Seu e-book foi enviado para o seu e-mail. Verifique também a caixa de spam.
                    </p>
                    {selectedEbook.fileUrl && (
                      <a
                        href={selectedEbook.fileUrl}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-2 rounded-xl bg-green-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-green-700 shadow-md hover:shadow-lg"
                      >
                        📥 Baixar E-book Agora
                      </a>
                    )}
                    <button
                      onClick={() => setSelectedEbook(null)}
                      className="mt-2 rounded-xl bg-orange-primary px-6 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600"
                    >
                      Fechar
                    </button>
                  </div>
                ) : selectedEbook.mauticFormId ? (
                  <MauticFormEmbed
                    formId={selectedEbook.mauticFormId}
                    ebook={selectedEbook}
                    onSubmitted={completeEbookDownload}
                  />
                ) : (
                  <InternalEbookLeadForm
                    ebook={selectedEbook}
                    errorMessage="Formulário Mautic não configurado para este e-book."
                    onSubmitted={completeEbookDownload}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Events Page ─────────────────────────────────────────────────────────────

function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterModality, setFilterModality] = useState('Todos');

  useEffect(() => {
    fetch('/api/events')
      .then(r => r.json())
      .then(data => {
        if (data.data) {
          setEvents(data.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredEvents = filterModality === 'Todos'
    ? events
    : events.filter(e => {
        const mod = e.modality === 'online_ao_vivo' ? 'Online ao vivo' : 'Presencial';
        return mod === filterModality;
      });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <div>
        <SiteHeader />

        {/* Hero Section */}
        <section className="relative overflow-hidden bg-navy py-20 text-white">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-orange-primary/10 blur-3xl" />
            <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-blue-action/10 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-5xl px-4 text-center lg:px-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-primary/30 bg-orange-primary/10 px-4 py-1.5 text-sm font-bold text-orange-300">
              <CalendarDays className="h-4 w-4" />
              Eventos & Workshops Inclusivos
            </div>

            <h1 className="font-display text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
              Nossos <span className="text-orange-primary">Eventos</span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-lg text-white/75 leading-relaxed">
              Participe de palestras, aulas abertas e workshops conduzidos por especialistas do Instituto Sentidos e amplie seus conhecimentos em educação especial.
            </p>
          </div>
        </section>

        {/* Filter Section */}
        <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur shadow-sm">
          <div className="mx-auto max-w-5xl px-4 lg:px-8">
            <div className="flex items-center gap-2 overflow-x-auto py-3">
              {['Todos', 'Presencial', 'Online ao vivo'].map((mod) => (
                <button
                  key={mod}
                  onClick={() => setFilterModality(mod)}
                  className={`shrink-0 rounded-full px-5 py-2 text-sm font-bold transition-all ${
                    filterModality === mod
                      ? 'bg-orange-primary text-white shadow-md shadow-orange-primary/20'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {mod}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* List of Events */}
        <main className="mx-auto max-w-5xl px-4 py-12 lg:px-8">
          {loading ? (
            <div className="flex min-h-[200px] items-center justify-center font-bold text-navy">
              Carregando eventos...
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center shadow-sm">
              <CalendarDays className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-4 font-display text-lg font-bold text-navy">Nenhum evento no momento</h3>
              <p className="mt-2 text-sm text-slate-500">
                Fique atento aos nossos canais ou fale conosco para saber sobre as próximas turmas e palestras.
              </p>
              <a
                href="https://wa.me/5599319993940"
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-orange-primary px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-orange-600"
              >
                Falar com a Equipe
              </a>
            </div>
          ) : (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {filteredEvents.map((ev) => {
                const isOnline = ev.modality === 'online_ao_vivo';
                const formattedDate = ev.startsAt
                  ? new Date(ev.startsAt).toLocaleDateString('pt-BR')
                  : 'A confirmar';

                // Use prefilled whatsapp link as fallback
                const eventLink = ev.link || `https://wa.me/5599319993940?text=${encodeURIComponent(
                  `Olá, gostaria de saber mais informações e me inscrever no evento: ${ev.title}`
                )}`;

                return (
                  <div
                    key={ev.id}
                    className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-xl hover:-translate-y-1 border border-slate-100"
                  >
                    {/* Event Cover / Gradient Image */}
                    <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-navy to-blue-action flex items-center justify-center">
                      {ev.coverUrl ? (
                        <img
                          src={ev.coverUrl}
                          alt={ev.title}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <CalendarDays className="h-16 w-16 text-white/30" />
                      )}
                      <span
                        className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-bold text-white shadow-md ${
                          isOnline ? 'bg-blue-600' : 'bg-orange-primary'
                        }`}
                      >
                        {isOnline ? 'Online ao vivo' : 'Presencial'}
                      </span>
                    </div>

                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formattedDate}
                        </div>
                        <h3 className="font-display text-xl font-bold text-navy group-hover:text-orange-primary transition duration-150 line-clamp-2">
                          {ev.title}
                        </h3>
                        <p className="mt-3 text-sm text-slate-600 line-clamp-3">
                          {ev.description}
                        </p>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-sm font-bold text-navy">
                          {Number(ev.price) === 0 ? 'Gratuito' : `R$ ${Number(ev.price).toFixed(2)}`}
                        </span>
                        <a
                          href={eventLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm font-bold text-orange-primary hover:underline"
                        >
                          {ev.link ? 'Participar' : 'Inscrever-se'}
                          <ChevronRight className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}

// ── Main App Router ──────────────────────────────────────────────────────────

function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <SiteHeader />
      <main className="flex-1 max-w-4xl mx-auto px-4 py-16">
        <article className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-100 prose prose-slate max-w-none">
          <p className="text-xs font-bold uppercase tracking-wider text-orange-primary mb-2">Segurança e LGPD</p>
          <h1 className="font-display text-4xl font-extrabold text-navy mb-6">Política de Privacidade</h1>
          <p className="text-slate-500 text-sm mb-8">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
          
          <div className="space-y-6 text-slate-700 leading-relaxed text-sm">
            <p>
              O <strong>Instituto Sentidos</strong> valoriza a sua privacidade e se compromete a proteger os seus dados pessoais em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD). Esta Política de Privacidade explica como coletamos, usamos, armazenamos e protegemos seus dados ao utilizar nossas páginas e nosso sistema de embaixadores/indicações.
            </p>

            <h2 className="font-display text-xl font-bold text-navy mt-8">1. Informações que Coletamos</h2>
            <p>Coletamos dados necessários para viabilizar as indicações de cursos e relacionamento institucional, tais como:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><strong>Dados de Identificação:</strong> Nome completo, e-mail, telefone/WhatsApp.</li>
              <li><strong>Dados do Embaixador:</strong> Código de indicação gerado ao se cadastrar no programa.</li>
              <li><strong>Dados de Navegação:</strong> Endereço IP, cookies de sessão, dados analíticos de acesso.</li>
            </ul>

            <h2 className="font-display text-xl font-bold text-navy mt-8">2. Finalidade do Tratamento dos Dados</h2>
            <p>Utilizamos seus dados para as seguintes finalidades legítimas:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Gerenciar o programa de indicação ("Indique e Ganhe") e calcular faixas de descontos/benefícios.</li>
              <li>Entrar em contato com leads indicados interessados nos programas educacionais do Instituto.</li>
              <li>Melhorar continuamente a navegabilidade, segurança e usabilidade de nosso site.</li>
              <li>Garantir a conformidade legal e segurança contra fraudes no sistema.</li>
            </ul>

            <h2 className="font-display text-xl font-bold text-navy mt-8">3. Seus Direitos sob a LGPD</h2>
            <p>Como titular dos dados pessoais, você pode solicitar a qualquer momento ao Instituto Sentidos:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Confirmação da existência de tratamento de dados.</li>
              <li>Acesso aos seus dados coletados e correção de dados incompletos ou inexatos.</li>
              <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade.</li>
              <li>Revogação do consentimento para tratamento de dados sob esta política.</li>
            </ul>

            <h2 className="font-display text-xl font-bold text-navy mt-8">4. Compartilhamento e Segurança dos Dados</h2>
            <p>
              Os dados coletados são armazenados em ambiente seguro e sob rígidas regras de controle de acesso. Não comercializamos seus dados em hipótese alguma. O compartilhamento ocorre exclusivamente com ferramentas parceiras integradas de CRM (como GoHighLevel) para processamento do atendimento comercial, mantendo o mesmo nível de proteção exigido pela LGPD.
            </p>

            <h2 className="font-display text-xl font-bold text-navy mt-8">5. Contato para Dúvidas ou Requisições</h2>
            <p>
              Para exercer seus direitos de titular ou esclarecer qualquer ponto desta Política, entre em contato com nosso Encarregado de Proteção de Dados (DPO) através do e-mail oficial de suporte do Instituto Sentidos ou pelo canal oficial de WhatsApp.
            </p>
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}

function TermsOfUsePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <SiteHeader />
      <main className="flex-1 max-w-4xl mx-auto px-4 py-16">
        <article className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-100 prose prose-slate max-w-none">
          <p className="text-xs font-bold uppercase tracking-wider text-orange-primary mb-2">Regras e Diretrizes</p>
          <h1 className="font-display text-4xl font-extrabold text-navy mb-6">Termos de Uso</h1>
          <p className="text-slate-500 text-sm mb-8">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
          
          <div className="space-y-6 text-slate-700 leading-relaxed text-sm">
            <p>
              Seja bem-vindo ao site oficial e plataforma do <strong>Instituto Sentidos</strong>. Ao acessar ou interagir com nosso site, se cadastrar em nosso programa de indicação ou solicitar informações sobre nossos cursos, você concorda em cumprir e se vincular integralmente aos seguintes Termos de Uso. Se você não concorda com qualquer termo, por favor, não utilize a plataforma.
            </p>

            <h2 className="font-display text-xl font-bold text-navy mt-8">1. Uso da Plataforma e Cadastro</h2>
            <p>
              A plataforma destina-se a fins informativos sobre cursos livres e pós-graduações ofertados pelo Instituto Sentidos, bem como a operacionalização do programa de vantagens e indicações "Indique e Ganhe". O usuário se compromete a fornecer informações verdadeiras, atualizadas e completas em todos os formulários.
            </p>

            <h2 className="font-display text-xl font-bold text-navy mt-8">2. Diretrizes do Programa "Indique e Ganhe"</h2>
            <p>O embaixador participante declara-se ciente e concorda com as seguintes regras:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>O link de indicação gerado é de uso pessoal e intransferível.</li>
              <li>São expressamente proibidas práticas de SPAM, publicações enganosas ou fraudes para inflar artificialmente o número de indicações.</li>
              <li>A apuração de descontos e matrículas é auditável pelo Instituto Sentidos, e benefícios gerados de forma fraudulenta ou irregular serão imediatamente invalidados.</li>
              <li>O desconto concedido aplica-se estritamente às regras estabelecidas em cada turma/curso, não sendo conversível em dinheiro líquido.</li>
            </ul>

            <h2 className="font-display text-xl font-bold text-navy mt-8">3. Propriedade Intelectual</h2>
            <p>
              Todo o conteúdo visual, marcas, logotipos, textos, vídeos, ebooks e códigos de software presentes nesta plataforma são de propriedade exclusiva do Instituto Sentidos ou terceiros autorizados, sendo protegidos pelas leis de direitos autorais. É proibida a reprodução, cópia ou distribuição comercial de qualquer material sem consentimento prévio por escrito.
            </p>

            <h2 className="font-display text-xl font-bold text-navy mt-8">4. Limitação de Responsabilidade</h2>
            <p>
              O Instituto Sentidos envida seus melhores esforços para manter a plataforma estável e atualizada. No entanto, não nos responsabilizamos por interrupções temporárias de serviço decorrentes de falhas técnicas externas, de operadoras de internet ou problemas de compatibilidade no dispositivo do usuário.
            </p>

            <h2 className="font-display text-xl font-bold text-navy mt-8">5. Alterações nos Termos e Legislação Aplicável</h2>
            <p>
              Estes Termos podem ser atualizados periodicamente para refletir melhorias técnicas ou adequações regulatórias. O uso continuado da plataforma após alterações significa aceitação implícita dos novos termos. Estes termos são regidos pelas leis da República Federativa do Brasil, elegendo-se o foro da Comarca de Caxias/MA para sanar eventuais controvérsias.
            </p>
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}

export default function App() {
  const path = window.location.pathname;
  
  const [lgpdAccepted, setLgpdAccepted] = useState(() => {
    return localStorage.getItem('isentidos_lgpd_accepted') === 'true';
  });
  const [showCookieBanner, setShowCookieBanner] = useState(!lgpdAccepted);

  const acceptCookies = () => {
    localStorage.setItem('isentidos_lgpd_accepted', 'true');
    setLgpdAccepted(true);
    setShowCookieBanner(false);
  };

  // VLibras injection effect
  useEffect(() => {
    const isAdmin = path.startsWith('/admin');
    if (isAdmin) {
      const widget = document.querySelector('[vw]');
      if (widget) widget.remove();
      const script = document.querySelector('script[src*="vlibras"]');
      if (script) script.remove();
      const vlContainer = document.getElementById('vlibras-container');
      if (vlContainer) vlContainer.remove();
      return;
    }

    if (document.querySelector('[vw]')) return;

    const vwDiv = document.createElement('div');
    vwDiv.setAttribute('vw', '');
    vwDiv.className = 'enabled';
    vwDiv.innerHTML = `
      <div vw-access-button class="active"></div>
      <div vw-plugin-wrapper>
        <div class="vw-plugin-top-wrapper"></div>
      </div>
    `;
    document.body.appendChild(vwDiv);

    const script = document.createElement('script');
    script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
    script.async = true;
    script.onload = () => {
      try {
        if ((window as any).VLibras) {
          new (window as any).VLibras.Widget('https://vlibras.gov.br/app');
        }
      } catch (err) {
        console.error('Error initializing VLibras:', err);
      }
    };
    document.body.appendChild(script);

    return () => {
      vwDiv.remove();
      script.remove();
      const vlContainer = document.getElementById('vlibras-container');
      if (vlContainer) vlContainer.remove();
    };
  }, [path.startsWith('/admin')]);

  useEffect(() => {
    if (path.startsWith('/admin')) {
      const existingScript = document.querySelector('script[src*="leadconnectorhq.com"]');
      if (existingScript) existingScript.remove();
      const widget = document.getElementById('chat-widget-container') || document.querySelector('.lc_chat-widget') || document.querySelector('[id*="chat-widget"]');
      if (widget) widget.remove();
      const iframe = document.querySelector('iframe[src*="chat-widget"]');
      if (iframe) iframe.remove();
      return;
    }
    const existingScript = document.querySelector('script[src*="leadconnectorhq.com"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = "https://widgets.leadconnectorhq.com/loader.js";
      script.setAttribute('data-resources-url', "https://widgets.leadconnectorhq.com/chat-widget/loader.js");
      script.setAttribute('data-widget-id', "6a0ccb634d25f21aa1d04079");
      script.async = true;
      document.body.appendChild(script);
    }
  }, [path]);

  useEffect(() => {
    if (path.startsWith('/admin')) return;
    fetch('/api/site-content')
      .then((r) => r.json())
      .then((data) => {
        const settings = data.data?.settings || data.settings;
        if (settings) {
          if (settings.metaPixelId && !document.getElementById('meta-pixel-script')) {
            const script = document.createElement('script');
            script.id = 'meta-pixel-script';
            script.innerHTML = `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${settings.metaPixelId}');
              fbq('track', 'PageView');
            `;
            document.head.appendChild(script);
            const noscript = document.createElement('noscript');
            noscript.id = 'meta-pixel-noscript';
            noscript.innerHTML = '<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=' + settings.metaPixelId + '&ev=PageView&noscript=1" />';
            document.body.appendChild(noscript);
          }
          if (settings.googleAnalyticsId && !document.getElementById('ga-script')) {
            const script1 = document.createElement('script');
            script1.id = 'ga-script-async';
            script1.async = true;
            script1.src = 'https://www.googletagmanager.com/gtag/js?id=' + settings.googleAnalyticsId;
            document.head.appendChild(script1);
            const script2 = document.createElement('script');
            script2.id = 'ga-script';
            script2.innerHTML = `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${settings.googleAnalyticsId}');
            `;
            document.head.appendChild(script2);
          }
          if (settings.googleTagManagerId && !document.getElementById('gtm-script')) {
            const script = document.createElement('script');
            script.id = 'gtm-script';
            script.innerHTML = `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${settings.googleTagManagerId}');
            `;
            document.head.appendChild(script);
            const noscript = document.createElement('noscript');
            noscript.id = 'gtm-noscript';
            noscript.innerHTML = '<iframe src="https://www.googletagmanager.com/ns.html?id=' + settings.googleTagManagerId + '" height="0" width="0" style="display:none;visibility:hidden"></iframe>';
            document.body.appendChild(noscript);
          }
          if (settings.mauticBaseUrl && settings.mauticTrackingEnabled && !document.getElementById('mautic-script')) {
            const script = document.createElement('script');
            script.id = 'mautic-script';
            script.innerHTML = `
              (function(w,d,t,u,n,a,m){w['MauticTrackingObject']=n;
                  w[n]=w[n]||function(){(w[n].q=w[n].q||[]).push(arguments)},a=d.createElement(t),
                  m=d.getElementsByTagName(t)[0];a.async=1;a.src=u;m.parentNode.insertBefore(a,m)
              })(window,document,'script','${settings.mauticBaseUrl}/mtc.js','mt');
              mt('send', 'pageview');
            `;
            document.head.appendChild(script);
          }
          if (settings.googleAdsId && !document.getElementById('google-ads-script')) {
            const script1 = document.createElement('script');
            script1.id = 'google-ads-script-async';
            script1.async = true;
            script1.src = 'https://www.googletagmanager.com/gtag/js?id=' + settings.googleAdsId;
            document.head.appendChild(script1);
            const script2 = document.createElement('script');
            script2.id = 'google-ads-script';
            script2.innerHTML = `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${settings.googleAdsId}');
            `;
            document.head.appendChild(script2);
          }
          if (settings.customScripts && !document.getElementById('custom-scripts-container')) {
            const div = document.createElement('div');
            div.id = 'custom-scripts-container';
            div.style.display = 'none';
            div.innerHTML = settings.customScripts;
            document.body.appendChild(div);
            const scripts = div.getElementsByTagName('script');
            for (let s of Array.from(scripts)) {
              const script = document.createElement('script');
              if (s.src) script.src = s.src;
              else script.innerHTML = s.innerHTML;
              document.head.appendChild(script);
            }
          }
        }
      })
      .catch(() => {});
  }, [path]);

  let pageComponent;
  if (path.startsWith('/admin')) {
    pageComponent = <AdminApp />;
  } else if (path === '/politica-de-privacidade') {
    pageComponent = <PrivacyPolicyPage />;
  } else if (path === '/termos-de-uso') {
    pageComponent = <TermsOfUsePage />;
  } else if (path.startsWith('/indique-e-ganhe')) {
    return <IndiqueEGanhePage />;
  }
  else if (path.startsWith('/indicacao/')) {
    const code = path.split('/')[2] ?? '';
    pageComponent = <ReferralPage referralCode={code} />;
  } else if (path.startsWith('/turma/')) {
    const parts = path.split('/').filter(Boolean);
    const slug = parts[1] ?? '';
    const ref = parts[2];
    pageComponent = <TurmaPage courseSlug={slug} referralCode={ref} />;
  } else if (path === '/cursos') {
    pageComponent = <CoursesPage />;
  } else if (path.startsWith('/cursos/')) {
    const slug = path.split('/')[2] ?? '';
    pageComponent = <CourseDetailsPage courseSlug={slug} />;
  } else if (path === '/ebooks') {
    pageComponent = <EbooksPage />;
  } else if (path === '/eventos') {
    pageComponent = <EventsPage />;
  } else if (path === '/blog') {
    pageComponent = <BlogListPage />;
  } else if (path.startsWith('/blog/')) {
    const slug = path.split('/')[2] ?? '';
    pageComponent = <BlogArticlePage postSlug={slug} />;
  } else {
    pageComponent = <PublicSite />;
  }

  return (
    <>
      {!path.startsWith('/admin') && <AccessibilityWidget />}
      {pageComponent}
      {showCookieBanner && !path.startsWith('/admin') && (
        <div className="fixed bottom-6 left-6 right-6 z-50 mx-auto max-w-2xl rounded-2xl border border-white/10 bg-navy/95 p-6 text-white shadow-2xl backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in animate-slide-up">
          <div className="text-left text-sm">
            <h4 className="font-display font-bold text-base text-orange-primary flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" /> Cookies e Privacidade (LGPD)
            </h4>
            <p className="mt-2 text-white/80">
              Nós utilizamos cookies e outras tecnologias para melhorar a sua experiência de navegação, analisar o tráfego do site e personalizar o conteúdo de acordo com a LGPD. Ao continuar navegando, você concorda com a nossa <a href="/politica-de-privacidade" className="font-semibold text-orange-primary hover:underline">Política de Privacidade</a>.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <button onClick={acceptCookies} className="rounded-xl bg-orange-primary px-5 py-3 font-bold text-white transition hover:bg-orange-600 shadow-md shadow-orange-primary/20">
              Aceitar Todos
            </button>
          </div>
        </div>
      )}
    </>
  );
}
