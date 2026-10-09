import React, { useState, useEffect, useRef, FormEvent } from 'react';
import {
  GraduationCap,
  Award,
  CheckCircle2,
  Users,
  Clock,
  Sparkles,
  ChevronRight,
  ChevronDown,
  MessageCircle,
  ShieldCheck,
  Calendar,
  AlertCircle,
  Star,
  Check,
} from 'lucide-react';
import { Course } from '../../shared/types';
import { generateEventId, getAttributionPayload } from '../utils/attribution';
import {
  trackCourseView,
  trackContactClick,
  trackFormStart,
  trackLeadSubmission,
} from '../utils/analytics';

interface PilotCourseLandingProps {
  course: Course;
  whatsappNumber: string;
  onNavigateHome?: () => void;
}

export function PilotCourseLanding({ course, whatsappNumber }: PilotCourseLandingProps) {
  const [formStarted, setFormStarted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [graduation, setGraduation] = useState('');
  const [consentLgpd, setConsentLgpd] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'about' | 'modules' | 'syllabus' | 'faq'>('about');
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(null);

  const formRef = useRef<HTMLDivElement>(null);

  // Normalize WhatsApp link
  const cleanPhone = whatsappNumber.replace(/\D/g, '');
  const waTarget = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
  const whatsappUrl = `https://wa.me/${waTarget}?text=${encodeURIComponent(
    `Olá! Tenho interesse no curso ${course.title} (${course.courseCode || course.slug}). Poderia me tirar algumas dúvidas?`
  )}`;

  // Parse JSON fields safely
  const parseJson = (str?: string) => {
    try {
      return str ? JSON.parse(str) : [];
    } catch {
      return [];
    }
  };

  const modules = parseJson(course.modules);
  const teachers = parseJson(course.teachers);
  const testimonials = parseJson(course.testimonials);
  const benefits = parseJson(course.benefits);

  // 1. Fire ViewContent on landing load
  useEffect(() => {
    trackCourseView({
      courseCode: course.courseCode,
      courseTitle: course.title,
      modality: course.modality,
      category: course.area,
      price: course.installmentValue ? course.installmentValue * (course.maxInstallments || 1) : undefined,
    });
  }, [course]);

  // Urgency Calculation
  const enrolledCount = course.interestedCount || 0;
  const maxCap = course.maxStudents || null;
  const lowThreshold = course.lowAvailabilityThreshold || 5;
  const isLowAvailability = maxCap !== null && maxCap - enrolledCount <= lowThreshold && maxCap > enrolledCount;

  // Phone input formatting mask: (99) 99999-9999
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let digits = e.target.value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) {
      setPhone(digits.length ? `(${digits}` : '');
    } else if (digits.length <= 7) {
      setPhone(`(${digits.slice(0, 2)}) ${digits.slice(2)}`);
    } else {
      setPhone(`(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`);
    }
  };

  const handleInputFocus = () => {
    if (!formStarted) {
      setFormStarted(true);
      trackFormStart('pre_enrollment_native', course.courseCode);
    }
  };

  const handleWhatsAppClick = () => {
    trackContactClick({
      channel: 'whatsapp',
      courseCode: course.courseCode,
      courseTitle: course.title,
      modality: course.modality,
      ctaText: 'Tirar dúvidas no WhatsApp',
    });
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Pre-enrollment Lead Submission
  const handleSubmitLead = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const rawDigits = phone.replace(/\D/g, '');
    if (rawDigits.length < 10) {
      setErrorMessage('Por favor, informe um número de WhatsApp válido com DDD.');
      return;
    }

    if (!consentLgpd) {
      setErrorMessage('É necessário aceitar os termos de privacidade para continuar.');
      return;
    }

    setSubmitting(true);
    const eventId = generateEventId('lead');
    const attributions = getAttributionPayload();

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: rawDigits,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          graduation: graduation.trim() || undefined,
          courseCode: course.courseCode || undefined,
          courseSlug: course.slug,
          preferredFormat: course.modality === 'ONLINE' ? 'online_ao_vivo' : 'presencial',
          source: 'landing_piloto',
          notes: `Pré-matrícula Piloto: ${course.title} (${course.courseCode || 'sem código'})`,
          consentLgpd: true,
          eventId,
          funnelStatus: 'PRE_ENROLLED',
          attributions,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha no cadastro.');
      }

      // Track successful lead submission with event_id deduplication key
      trackLeadSubmission({
        eventId,
        courseCode: course.courseCode,
        courseTitle: course.title,
        modality: course.modality,
        formName: 'pre_enrollment_native',
      });

      setSubmitSuccess(true);
    } catch (err: any) {
      setErrorMessage('Ocorreu um erro ao registrar sua pré-matrícula. Tente novamente em instantes.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 font-sans">
      {/* ── Top Announcement Bar ── */}
      <div className="bg-gradient-to-r from-navy via-blue-900 to-navy text-white text-xs py-2.5 px-4 border-b border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2 font-medium">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Inscrições Abertas • Garanta sua vaga com condições especiais</span>
          </div>
          <div className="font-semibold text-orange-300 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Pré-matrícula 100% gratuita • Sem cobrança agora</span>
          </div>
        </div>
      </div>

      {/* ── Hero Section ── */}
      <header className="relative bg-navy text-white overflow-hidden pt-8 pb-16 lg:pt-12 lg:pb-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-700/20 via-navy to-navy pointer-events-none"></div>

        <div className="max-w-6xl mx-auto px-4 relative z-10">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-xs text-white/60 mb-6" aria-label="Navegação estrutural">
            <a href="/" className="hover:text-white transition">Início</a>
            <ChevronRight className="h-3.5 w-3.5 text-white/40" />
            <a href="/cursos" className="hover:text-white transition">Cursos</a>
            <ChevronRight className="h-3.5 w-3.5 text-white/40" />
            <span className="text-white/90 truncate">{course.title}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Coluna da Esquerda: Título, Badges e Destaques */}
            <div className="lg:col-span-7 space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-primary/20 text-orange-400 border border-orange-primary/30">
                  <GraduationCap className="h-3.5 w-3.5" />
                  {course.kind} • {course.modality === 'ONLINE' ? 'Online ao Vivo' : 'Presencial'}
                </span>

                {course.courseCode && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-white/10 text-white/80">
                    Cód: {course.courseCode}
                  </span>
                )}

                {isLowAvailability && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Últimas Vagas
                  </span>
                )}
              </div>

              {course.eyebrow && (
                <p className="text-sm font-semibold uppercase tracking-wide text-orange-300/90">
                  {course.eyebrow}
                </p>
              )}

              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
                {course.title}
              </h1>

              <p className="text-base sm:text-lg text-white/80 leading-relaxed max-w-2xl">
                {course.summary}
              </p>

              {/* Badges de Destaque / Garantia */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-3">
                  <Clock className="h-4 w-4 text-orange-400 shrink-0" />
                  <div>
                    <span className="block text-white/50 text-[10px] uppercase font-bold">Carga Horária</span>
                    <span className="font-bold text-white">{course.workload || '360 horas'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-3">
                  <Award className="h-4 w-4 text-orange-400 shrink-0" />
                  <div>
                    <span className="block text-white/50 text-[10px] uppercase font-bold">Certificação</span>
                    <span className="font-bold text-white">
                      {course.certificationOrg ? course.certificationOrg : 'Pós Lato Sensu'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-3 col-span-2 sm:col-span-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="block text-white/50 text-[10px] uppercase font-bold">Status</span>
                    <span className="font-bold text-emerald-400">
                      Inscrições Abertas
                    </span>
                  </div>
                </div>
              </div>

              {/* Botão de rolagem rápida em mobile */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3 lg:hidden">
                <button
                  onClick={scrollToForm}
                  className="w-full bg-orange-primary hover:bg-orange-600 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg transition"
                >
                  Fazer Pré-Matrícula Gratuita
                </button>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={handleWhatsAppClick}
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba56] text-white font-bold py-3.5 px-6 rounded-xl shadow transition"
                >
                  <MessageCircle className="h-5 w-5" />
                  Tirar Dúvidas no WhatsApp
                </a>
              </div>
            </div>

            {/* Coluna da Direita: Card de Pré-Matrícula Nativo */}
            <div className="lg:col-span-5" ref={formRef}>
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 text-slate-800">
                {submitSuccess ? (
                  <div className="py-8 text-center space-y-4 animate-fade-in">
                    <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                      <Check className="h-8 w-8 stroke-[3]" />
                    </div>
                    <h3 className="font-display text-2xl font-extrabold text-navy">
                      Pré-Matrícula Recebida!
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Obrigado, <strong>{name}</strong>! Seus dados foram registrados com sucesso.
                    </p>
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-xs text-emerald-800 text-left space-y-1">
                      <p className="font-bold">Próximos passos:</p>
                      <p>1. Nossa equipe entrará em contato pelo WhatsApp para validar seu interesse.</p>
                      <p>2. Você receberá todas as orientações sobre cronograma e início das aulas.</p>
                    </div>
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={handleWhatsAppClick}
                      className="inline-flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#20ba56] text-white font-bold py-3.5 px-6 rounded-xl shadow-md transition"
                    >
                      <MessageCircle className="h-5 w-5" />
                      Falar Agora no WhatsApp
                    </a>
                  </div>
                ) : (
                  <div>
                    <div className="mb-5">
                      <h3 className="font-display text-xl sm:text-2xl font-bold text-navy">
                        Pré-Matrícula Gratuita
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Preencha seus dados para garantir sua vaga sem nenhum custo neste momento.
                      </p>
                    </div>

                    {errorMessage && (
                      <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    <form onSubmit={handleSubmitLead} className="space-y-4">
                      <div>
                        <label htmlFor="lead-name" className="block text-xs font-bold text-slate-700 mb-1">
                          Nome Completo *
                        </label>
                        <input
                          id="lead-name"
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          onFocus={handleInputFocus}
                          placeholder="Digite seu nome completo"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-navy placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-primary/30 focus:border-orange-primary transition"
                        />
                      </div>

                      <div>
                        <label htmlFor="lead-email" className="block text-xs font-bold text-slate-700 mb-1">
                          E-mail Principal *
                        </label>
                        <input
                          id="lead-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onFocus={handleInputFocus}
                          placeholder="exemplo@email.com"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-navy placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-primary/30 focus:border-orange-primary transition"
                        />
                      </div>

                      <div>
                        <label htmlFor="lead-phone" className="block text-xs font-bold text-slate-700 mb-1">
                          WhatsApp / Celular com DDD *
                        </label>
                        <input
                          id="lead-phone"
                          type="tel"
                          required
                          value={phone}
                          onChange={handlePhoneChange}
                          onFocus={handleInputFocus}
                          placeholder="(99) 99999-9999"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-navy placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-primary/30 focus:border-orange-primary transition font-mono"
                        />
                      </div>

                      {/* Cidade e UF */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <label htmlFor="lead-city" className="block text-xs font-bold text-slate-700 mb-1">
                            Cidade
                          </label>
                          <input
                            id="lead-city"
                            type="text"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            onFocus={handleInputFocus}
                            placeholder="Sua cidade"
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-navy placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-primary/30 focus:border-orange-primary transition"
                          />
                        </div>
                        <div>
                          <label htmlFor="lead-state" className="block text-xs font-bold text-slate-700 mb-1">
                            UF
                          </label>
                          <select
                            id="lead-state"
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            onFocus={handleInputFocus}
                            className="w-full px-2 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-navy placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-primary/30 focus:border-orange-primary transition cursor-pointer"
                          >
                            <option value="">UF</option>
                            {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map((uf) => (
                              <option key={uf} value={uf}>{uf}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Formação / Graduação */}
                      <div>
                        <label htmlFor="lead-graduation" className="block text-xs font-bold text-slate-700 mb-1">
                          Sua Formação / Graduação
                        </label>
                        <input
                          id="lead-graduation"
                          type="text"
                          value={graduation}
                          onChange={(e) => setGraduation(e.target.value)}
                          onFocus={handleInputFocus}
                          placeholder="Ex.: Pedagogia, Psicologia, Letras..."
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-navy placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-primary/30 focus:border-orange-primary transition"
                        />
                      </div>

                      <div className="pt-1">
                        <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={consentLgpd}
                            onChange={(e) => setConsentLgpd(e.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-orange-primary focus:ring-orange-primary"
                          />
                          <span>
                            Concordo com o tratamento dos dados conforme a{' '}
                            <a href="/politica-de-privacidade" target="_blank" className="text-orange-primary underline">
                              Política de Privacidade
                            </a>{' '}
                            e em receber contato via WhatsApp sobre este curso.
                          </span>
                        </label>
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full mt-2 bg-orange-primary hover:bg-orange-600 active:scale-[0.99] text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-orange-primary/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                      >
                        {submitting ? (
                          <span>Enviando dados...</span>
                        ) : (
                          <>
                            <span>Garantir Minha Vaga Gratuitamente</span>
                            <ChevronRight className="h-4 w-4" />
                          </>
                        )}
                      </button>

                      <p className="text-[11px] text-center text-slate-400 pt-1">
                        🔒 Seus dados estão protegidos pela LGPD. Sem mensalidades automáticas.
                      </p>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Tabs Section: Apresentação, Matriz Curricular, Dúvidas ── */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            {/* Navegação por Abas */}
            <div className="flex border-b border-slate-200 bg-white rounded-2xl p-1 shadow-sm overflow-x-auto">
              <button
                onClick={() => setActiveTab('about')}
                className={`flex-1 py-3 px-5 text-sm font-bold rounded-xl transition ${
                  activeTab === 'about'
                    ? 'bg-orange-primary text-white shadow'
                    : 'text-slate-600 hover:text-navy hover:bg-slate-50'
                }`}
              >
                Sobre o Curso
              </button>
              {modules.length > 0 && (
                <button
                  onClick={() => setActiveTab('modules')}
                  className={`flex-1 py-3 px-5 text-sm font-bold rounded-xl transition ${
                    activeTab === 'modules'
                      ? 'bg-orange-primary text-white shadow'
                      : 'text-slate-600 hover:text-navy hover:bg-slate-50'
                  }`}
                >
                  Matriz Curricular ({modules.length})
                </button>
              )}
              {course.syllabus && (
                <button
                  onClick={() => setActiveTab('syllabus')}
                  className={`flex-1 py-3 px-5 text-sm font-bold rounded-xl transition ${
                    activeTab === 'syllabus'
                      ? 'bg-orange-primary text-white shadow'
                      : 'text-slate-600 hover:text-navy hover:bg-slate-50'
                  }`}
                >
                  Outras Informações
                </button>
              )}
              <button
                onClick={() => setActiveTab('faq')}
                className={`flex-1 py-3 px-5 text-sm font-bold rounded-xl transition ${
                  activeTab === 'faq'
                    ? 'bg-orange-primary text-white shadow'
                    : 'text-slate-600 hover:text-navy hover:bg-slate-50'
                }`}
              >
                Dúvidas Frequentes
              </button>
            </div>

            {/* Conteúdo das Abas */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-sm">
              {activeTab === 'about' && (
                <div className="space-y-6">
                  <h2 className="font-display text-2xl font-bold text-navy">
                    Apresentação do Curso
                  </h2>

                  {course.videoUrl && (
                    <div className="aspect-video w-full overflow-hidden rounded-2xl shadow-xl ring-4 ring-slate-100 bg-black mb-6">
                      <iframe className="h-full w-full object-cover" src={course.videoUrl.replace('watch?v=', 'embed/')} title="Apresentação do curso" allowFullScreen></iframe>
                    </div>
                  )}

                  {course.about ? (
                    <div
                      className="prose prose-slate max-w-none text-slate-600 leading-relaxed prose-p:mb-4 prose-ul:list-disc prose-ul:pl-6 prose-li:mb-2 prose-strong:text-navy prose-strong:font-bold"
                      dangerouslySetInnerHTML={{ __html: course.about }}
                    />
                  ) : (
                    <p className="text-slate-600 leading-relaxed">{course.summary}</p>
                  )}

                  {/* Certificação Validada Administrativamente */}
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 mt-6 space-y-2">
                    <div className="flex items-center gap-2 text-navy font-bold text-sm">
                      <Award className="h-5 w-5 text-orange-primary" />
                      <span>Certificação e Validade Acadêmica</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {course.certificationText ? (
                        course.certificationText
                      ) : course.certificationOrg ? (
                        `Certificado expedido por instituição credenciada: ${course.certificationOrg}${
                          course.certificationPortaria ? ` (Portaria nº ${course.certificationPortaria})` : ''
                        }.`
                      ) : (
                        'Certificado de Conclusão de Pós-Graduação Lato Sensu expedido conforme as diretrizes do Conselho Nacional de Educação (CNE/CES).'
                      )}
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'modules' && (
                <div className="space-y-6">
                  <h2 className="font-display text-2xl font-bold text-navy">
                    Matriz Curricular
                  </h2>
                  <p className="text-xs text-slate-500">
                    Disciplinas estruturadas para aliar teoria pedagógica sólida e prática profissional:
                  </p>

                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {modules.map((m: any, idx: number) => (
                      <div key={idx} className="p-4 hover:bg-slate-50 transition flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <div>
                            <h4 className="font-bold text-navy text-sm">{m.title || m.name}</h4>
                            {m.description && (
                              <p className="text-xs text-slate-500 mt-0.5">{m.description}</p>
                            )}
                          </div>
                        </div>
                        {m.workload && (
                          <span className="text-xs font-medium text-slate-400 shrink-0">
                            {m.workload}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'syllabus' && course.syllabus && (
                <div className="space-y-6">
                  <h2 className="font-display text-2xl font-bold text-navy">
                    Outras Informações
                  </h2>
                  <div
                    className="prose prose-slate max-w-none text-slate-600 leading-relaxed prose-p:mb-4 prose-ul:list-disc prose-ul:pl-6 prose-li:mb-2 prose-strong:text-navy prose-strong:font-bold"
                    dangerouslySetInnerHTML={{ __html: course.syllabus }}
                  />
                </div>
              )}

              {activeTab === 'faq' && (
                <div className="space-y-4">
                  <h2 className="font-display text-2xl font-bold text-navy mb-4">
                    Perguntas Frequentes
                  </h2>

                  {[
                    {
                      q: 'A pré-matrícula é realmente gratuita?',
                      a: 'Sim. A pré-matrícula tem custo zero. Ela serve para reservar sua vaga com condições especiais. Nossa equipe entrará em contato para confirmar sua inscrição e tirar qualquer dúvida.',
                    },
                    {
                      q: 'Como funciona a certificação do curso?',
                      a:
                        course.certificationText
                          ? course.certificationText
                          : 'Os cursos de pós-graduação e especialização do Instituto Sentidos são ofertados em consonância com as normas da legislação educacional vigente (Resoluções CNE/CES), com emissão de certificado oficial com validade acadêmica e profissional.',
                    },
                    {
                      q: 'Como são realizadas as aulas?',
                      a:
                        course.modality === 'ONLINE'
                          ? 'Na modalidade Online ao Vivo, as aulas acontecem em tempo real pela internet, com interação direta com os professores e colegas nas datas programadas.'
                          : 'Na modalidade Presencial, os encontros ocorrem no polo do Instituto Sentidos com metodologia ativa e prática em sala de aula.',
                    },
                    {
                      q: 'Quais documentos são necessários após a confirmação?',
                      a: 'Para a efetivação formal da matrícula, será solicitado cópia do RG, CPF, comprovante de residência e diploma/declaração de conclusão de curso superior.',
                    },
                  ].map((faq, idx) => {
                    const isOpen = openFaqIdx === idx;
                    return (
                      <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
                        <button
                          onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                          className="w-full flex items-center justify-between p-4 text-left font-bold text-navy text-sm hover:bg-slate-50 transition"
                        >
                          <span>{faq.q}</span>
                          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isOpen && (
                          <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-600 leading-relaxed">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Professores / Corpo Docente (se cadastrado) */}
            {teachers.length > 0 && (
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
                <h3 className="font-display text-xl font-bold text-navy">Corpo Docente</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {teachers.map((t: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50">
                      <div className="h-12 w-12 rounded-full bg-slate-200 overflow-hidden shrink-0">
                        {t.avatarUrl ? (
                          <img src={t.avatarUrl} alt={t.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center font-bold text-slate-400 text-sm">
                            {t.name?.[0] || 'P'}
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-navy text-sm">{t.name}</h4>
                        <p className="text-xs text-orange-primary font-medium">{t.role || 'Docente'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar / Informações Comerciais */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-5">
              <h3 className="font-display text-lg font-bold text-navy border-b border-slate-100 pb-3">
                Condições do Curso
              </h3>

              {course.installmentValue && course.installmentValue > 0 ? (
                <div className="p-4 rounded-xl bg-orange-50/50 border border-orange-100 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-orange-600 block">
                    Investimento Programado
                  </span>
                  {course.enrollmentFee && course.enrollmentFee > 0 && (
                    <div className="text-xs text-slate-600 font-semibold flex justify-between">
                      <span>Taxa de Matrícula:</span>
                      <span className="text-orange-primary font-bold">R$ {Number(course.enrollmentFee).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="text-2xl font-display font-extrabold text-navy">
                    {course.maxInstallments || 1}x <span className="text-sm font-normal text-slate-500">de</span> R$ {Number(course.installmentValue).toFixed(2)}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium pt-1 border-t border-orange-200/50">
                    Total do curso: R$ {Number((course.installmentValue * (course.maxInstallments || 1)) + (course.enrollmentFee || 0)).toFixed(2)}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 text-sm font-semibold text-navy">
                  Investimento: {course.investment}
                </div>
              )}

              <div className="space-y-3 pt-2">
                <button
                  onClick={scrollToForm}
                  className="w-full bg-orange-primary hover:bg-orange-600 text-white font-bold py-3.5 px-4 rounded-xl shadow transition text-sm cursor-pointer"
                >
                  {course.ctaPrimaryText || 'Fazer Pré-Matrícula Gratuita'}
                </button>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={handleWhatsAppClick}
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba56] text-white font-bold py-3 px-4 rounded-xl shadow-sm transition text-sm"
                >
                  <MessageCircle className="h-4 w-4" />
                  {course.ctaSecondaryText || 'Falar com Consultor'}
                </a>
              </div>
            </div>

            {/* Atendimento e Localização */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm text-xs text-slate-600 space-y-2">
              <h4 className="font-bold text-navy">Dúvidas ou Atendimento Institucional?</h4>
              <p>
                Nossos consultores acadêmicos estão disponíveis de segunda a sexta para esclarecer detalhes sobre grade, horários e documentação.
              </p>
              <div className="pt-2 font-semibold text-navy">
                WhatsApp: {whatsappNumber}
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* ── Seção de Benefícios (se houver) ── */}
      {benefits.length > 0 && (
        <section className="bg-gradient-to-b from-slate-100 to-white py-14 border-t border-slate-200">
          <div className="mx-auto max-w-6xl px-4">
            <div className="text-center mb-10">
              <h2 className="font-display text-3xl font-bold text-navy">Por que escolher este curso?</h2>
              <div className="h-1 w-16 bg-orange-primary mx-auto mt-4 rounded-full"></div>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {benefits.map((b: any, i: number) => (
                <div key={i} className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md transition text-center items-center">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-primary">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 font-bold text-navy text-base leading-tight">{b.title}</h3>
                  <p className="text-slate-600 text-xs leading-relaxed">{b.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Fixed Mobile Bottom Bar (Sticky CTA) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 sm:hidden shadow-2xl flex items-center gap-2">
        <button
          onClick={scrollToForm}
          className="flex-1 bg-orange-primary hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-xl text-xs shadow-md transition"
        >
          Pré-Matrícula Gratuita (R$ 0)
        </button>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          onClick={handleWhatsAppClick}
          className="p-3 bg-[#25D366] text-white rounded-xl shadow-md"
          aria-label="WhatsApp"
        >
          <MessageCircle className="h-5 w-5" />
        </a>
      </div>
    </div>
  );
}
