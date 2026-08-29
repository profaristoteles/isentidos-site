-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'student', 'consultant', 'editor');

-- CreateEnum
CREATE TYPE "CourseType" AS ENUM ('livre', 'preparatorio', 'pos_graduacao', 'mestrado', 'doutorado', 'extensao', 'supletivo_eja', 'internacional');

-- CreateEnum
CREATE TYPE "CourseModality" AS ENUM ('presencial', 'online_ao_vivo', 'ead', 'internacional');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('novo', 'em_atendimento', 'matriculado', 'desistente');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('pending', 'active', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "cpf" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'student',
    "password_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "syllabus" TEXT,
    "about" TEXT,
    "type" "CourseType" NOT NULL,
    "modality" "CourseModality" NOT NULL,
    "workload" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "max_installments" INTEGER NOT NULL DEFAULT 1,
    "enrollment_fee" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "installment_value" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "area" TEXT NOT NULL,
    "partner_institution" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "cover_image_url" TEXT,
    "video_url" TEXT,
    "benefits" JSONB,
    "modules" JSONB,
    "teachers" JSONB,
    "testimonials" JSONB,
    "min_students" INTEGER NOT NULL DEFAULT 15,
    "lead_connector_form_id" TEXT,
    "mautic_form_id" INTEGER,
    "is_system_record" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_referral_tiers" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "min_referrals" INTEGER NOT NULL,
    "discount_percent" INTEGER NOT NULL,

    CONSTRAINT "course_referral_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banners" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "cta_label" TEXT NOT NULL DEFAULT 'Saiba mais',
    "cta_url" TEXT NOT NULL DEFAULT '#cursos',
    "image_url" TEXT,
    "position" TEXT NOT NULL DEFAULT 'home_hero',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_classes" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "vacancies" INTEGER NOT NULL DEFAULT 0,
    "available_vacancies" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'open',

    CONSTRAINT "course_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "course_id" TEXT,
    "preferred_format" "CourseModality",
    "source" TEXT NOT NULL DEFAULT 'site',
    "referral_code" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'novo',
    "notes" TEXT,
    "consent_lgpd" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_codes" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "pix_key" TEXT,
    "pix_key_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "referral_code_id" TEXT NOT NULL,
    "lead_id" TEXT,
    "enrollment_id" TEXT,
    "status" "ReferralStatus" NOT NULL DEFAULT 'pending',
    "discount_applied" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "pix_reward_value" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "pix_status" TEXT NOT NULL DEFAULT 'pending',
    "pix_paid_at" TIMESTAMP(3),
    "pix_payment_proof" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "converted_at" TIMESTAMP(3),

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_settings" (
    "id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "reward_type" TEXT NOT NULL DEFAULT 'pix',
    "pix_reward_by_category" JSONB NOT NULL,
    "monthly_pix_cap" DECIMAL(10,2) NOT NULL DEFAULT 1000.00,
    "discount_type" TEXT NOT NULL DEFAULT 'percent',
    "discount_value" DECIMAL(10,2) NOT NULL DEFAULT 10,
    "max_discount_percent" INTEGER NOT NULL DEFAULT 50,
    "is_cumulative" BOOLEAN NOT NULL DEFAULT true,
    "eligible_course_types" TEXT[],
    "auto_approve" BOOLEAN NOT NULL DEFAULT false,
    "link_expiry_days" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_posts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "cover_image_url" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "author_id" TEXT,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verification_code" TEXT NOT NULL,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ebooks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Livro Digital',
    "cover_url" TEXT,
    "file_url" TEXT,
    "mautic_form_id" INTEGER,
    "pages" TEXT,
    "year" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ebooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "modality" "CourseModality" NOT NULL,
    "starts_at" TIMESTAMP(3),
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cover_url" TEXT,
    "link" TEXT DEFAULT '',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "domain" TEXT NOT NULL DEFAULT 'isentidos.com.br',
    "whatsapp" TEXT NOT NULL DEFAULT '(99) 3199-93940',
    "apiGeminiKey" TEXT NOT NULL DEFAULT '',
    "apiOpenAIKey" TEXT NOT NULL DEFAULT '',
    "apiOpenRouterKey" TEXT NOT NULL DEFAULT '',
    "apiGroqKey" TEXT NOT NULL DEFAULT '',
    "activeAiProvider" TEXT NOT NULL DEFAULT 'local',
    "metaPixelId" TEXT NOT NULL DEFAULT '',
    "googleAnalyticsId" TEXT NOT NULL DEFAULT '',
    "googleTagManagerId" TEXT NOT NULL DEFAULT '',
    "googleAdsId" TEXT NOT NULL DEFAULT '',
    "customScripts" TEXT NOT NULL DEFAULT '',
    "siteName" TEXT NOT NULL DEFAULT 'Instituto Sentidos',
    "instagram" TEXT NOT NULL DEFAULT '',
    "facebook" TEXT NOT NULL DEFAULT '',
    "linkedin" TEXT NOT NULL DEFAULT '',
    "youtube" TEXT NOT NULL DEFAULT '',
    "twitter" TEXT NOT NULL DEFAULT '',
    "smtp_host" TEXT NOT NULL DEFAULT '',
    "smtp_port" TEXT NOT NULL DEFAULT '587',
    "smtp_user" TEXT NOT NULL DEFAULT '',
    "smtp_pass" TEXT NOT NULL DEFAULT '',
    "smtp_from_email" TEXT NOT NULL DEFAULT '',
    "outbound_webhook_url" TEXT NOT NULL DEFAULT '',
    "mautic_base_url" TEXT NOT NULL DEFAULT 'https://mautic.isentidos.com.br',
    "mautic_tracking_enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_items" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isButton" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "parent_id" TEXT,

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_cpf_key" ON "users"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "courses_slug_key" ON "courses"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "leads_course_id_email_key" ON "leads"("course_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "referral_codes_code_key" ON "referral_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "blog_posts"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_verification_code_key" ON "certificates"("verification_code");

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");

-- AddForeignKey
ALTER TABLE "course_referral_tiers" ADD CONSTRAINT "course_referral_tiers_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_classes" ADD CONSTRAINT "course_classes_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referral_code_id_fkey" FOREIGN KEY ("referral_code_id") REFERENCES "referral_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
