-- AlterTable
ALTER TABLE "system_settings" ADD COLUMN     "evo_crm_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "evo_crm_base_url" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "evo_crm_api_token" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "evo_crm_pipeline_id" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "evo_crm_stage_id" TEXT NOT NULL DEFAULT '';
