import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface MetaCapiLeadPayload {
  eventId: string;
  leadId?: string;
  courseId?: string;
  courseCode?: string;
  courseTitle: string;
  modality: string;
  eventSourceUrl?: string;
  name?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  fbc?: string | null;
  fbp?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
}

export interface MetaCapiResponse {
  success: boolean;
  eventsReceived?: number;
  fbtraceId?: string;
  error?: string;
  rawResponse?: any;
  testEventCodeUsed?: string;
}

/**
 * Normalization & SHA-256 Hashing according to Meta Business SDK / CAPI Specs
 */
function normalizeAndHash(value?: string | null): string | undefined {
  if (!value) return undefined;
  const clean = value.trim().toLowerCase();
  if (!clean) return undefined;
  return crypto.createHash('sha256').update(clean).digest('hex');
}

function normalizeAndHashPhone(phone?: string | null): string | undefined {
  if (!phone) return undefined;
  let digits = phone.replace(/\D/g, '');
  if (!digits) return undefined;
  // If Brazilian number without country code, prepend 55
  if (digits.length >= 10 && digits.length <= 11 && !digits.startsWith('55')) {
    digits = '55' + digits;
  }
  return crypto.createHash('sha256').update(digits).digest('hex');
}

function normalizeAndHashName(fullName?: string | null): { fn?: string; ln?: string } {
  if (!fullName) return {};
  const clean = fullName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {};
  const fn = normalizeAndHash(parts[0]);
  const ln = parts.length > 1 ? normalizeAndHash(parts.slice(1).join(' ')) : undefined;
  return { fn, ln };
}

function normalizeAndHashCity(city?: string | null): string | undefined {
  if (!city) return undefined;
  const clean = city
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .trim()
    .toLowerCase();
  return clean ? normalizeAndHash(clean) : undefined;
}

function normalizeAndHashState(state?: string | null): string | undefined {
  if (!state) return undefined;
  const clean = state.trim().toLowerCase().slice(0, 2);
  return clean.length === 2 ? normalizeAndHash(clean) : undefined;
}

/**
 * Dispatch Lead event to Meta Conversions API
 */
export async function sendMetaCapiLead(payload: MetaCapiLeadPayload): Promise<MetaCapiResponse> {
  const pixelId = process.env.META_PIXEL_ID || process.env.META_DATASET_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  const testEventCode = process.env.META_TEST_EVENT_CODE?.trim() || undefined;

  if (!pixelId || !accessToken) {
    console.warn('[Meta CAPI] Skipped: META_PIXEL_ID or META_CAPI_ACCESS_TOKEN not configured.');
    return {
      success: false,
      error: 'META_PIXEL_ID or META_CAPI_ACCESS_TOKEN not configured in backend environment.',
    };
  }

  // Idempotency check: verify if this eventId was already successfully dispatched to CAPI
  try {
    const existingLog = await prisma.marketingEventLog.findUnique({
      where: { eventId: payload.eventId },
    });
    if (existingLog && (existingLog.payload as any)?.metaSuccess === true) {
      console.log(`[Meta CAPI] Event ${payload.eventId} already successfully sent. Skipping duplicate.`);
      return {
        success: true,
        eventsReceived: 1,
        rawResponse: { message: 'Already processed (idempotent duplicate skipped)' },
      };
    }
  } catch (err) {
    // If table query fails, proceed gracefully
  }

  const { fn, ln } = normalizeAndHashName(payload.name);
  const hashedEmail = normalizeAndHash(payload.email);
  const hashedPhone = normalizeAndHashPhone(payload.phone);
  const hashedCity = normalizeAndHashCity(payload.city);
  const hashedState = normalizeAndHashState(payload.state);

  // Meta user_data object
  const userData: Record<string, any> = {
    ...(hashedEmail ? { em: [hashedEmail] } : {}),
    ...(hashedPhone ? { ph: [hashedPhone] } : {}),
    ...(fn ? { fn: [fn] } : {}),
    ...(ln ? { ln: [ln] } : {}),
    ...(hashedCity ? { ct: [hashedCity] } : {}),
    ...(hashedState ? { st: [hashedState] } : {}),
    ...(payload.fbc ? { fbc: payload.fbc } : {}),
    ...(payload.fbp ? { fbp: payload.fbp } : {}),
    ...(payload.clientIp ? { client_ip_address: payload.clientIp } : {}),
    ...(payload.userAgent ? { client_user_agent: payload.userAgent } : {}),
  };

  // Custom data: NO value, NO currency, NO purchase!
  const customData: Record<string, any> = {
    content_name: payload.courseTitle,
    content_category: payload.modality,
    content_ids: payload.courseCode ? [payload.courseCode] : undefined,
    course_modality: payload.modality,
  };

  const eventTime = Math.floor(Date.now() / 1000);

  const eventPayload: Record<string, any> = {
    event_name: 'Lead',
    event_time: eventTime,
    event_id: payload.eventId,
    action_source: 'website',
    event_source_url: payload.eventSourceUrl || 'https://isentidos.com.br/',
    user_data: userData,
    custom_data: customData,
  };

  const requestBody: Record<string, any> = {
    data: [eventPayload],
    ...(testEventCode ? { test_event_code: testEventCode } : {}),
  };

  const metaUrl = `https://graph.facebook.com/v22.0/${pixelId}/events`;

  let responseStatus = 0;
  let responseData: any = null;
  let isSuccess = false;

  try {
    const res = await fetch(metaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(requestBody),
    });

    responseStatus = res.status;
    responseData = await res.json();
    isSuccess = res.ok && (responseData?.events_received ?? 0) > 0;

    if (!res.ok) {
      console.error('[Meta CAPI] Error response:', responseStatus, responseData);
    } else {
      console.log('[Meta CAPI] Success:', {
        status: responseStatus,
        eventsReceived: responseData.events_received,
        fbtraceId: responseData.fbtrace_id,
        testEventCode: testEventCode || 'none',
      });
    }
  } catch (error: any) {
    console.error('[Meta CAPI] Network or Execution error:', error);
    responseData = { error: error.message };
  }

  // Sanitized payload for internal logging (zero raw PII in database log)
  const sanitizedLogPayload = {
    eventName: 'Lead',
    eventId: payload.eventId,
    eventTime,
    courseCode: payload.courseCode,
    modality: payload.modality,
    metaStatus: responseStatus,
    metaSuccess: isSuccess,
    eventsReceived: responseData?.events_received,
    fbtraceId: responseData?.fbtrace_id,
    testEventCode: testEventCode || null,
    metaResponse: responseData,
    userDataPresent: {
      em: !!hashedEmail,
      ph: !!hashedPhone,
      fn: !!fn,
      ln: !!ln,
      ct: !!hashedCity,
      st: !!hashedState,
      fbc: !!payload.fbc,
      fbp: !!payload.fbp,
      clientIp: !!payload.clientIp,
      userAgent: !!payload.userAgent,
    },
  };

  // Upsert record into MarketingEventLog
  try {
    await prisma.marketingEventLog.upsert({
      where: { eventId: payload.eventId },
      update: {
        payload: sanitizedLogPayload,
      },
      create: {
        eventId: payload.eventId,
        eventName: 'Lead',
        source: 'meta_capi',
        leadId: payload.leadId || null,
        courseId: payload.courseId || null,
        payload: sanitizedLogPayload,
      },
    });
  } catch (logErr) {
    console.error('[Meta CAPI] Failed to record in MarketingEventLog:', logErr);
  }

  return {
    success: isSuccess,
    eventsReceived: responseData?.events_received,
    fbtraceId: responseData?.fbtrace_id,
    testEventCodeUsed: testEventCode,
    rawResponse: responseData,
  };
}

/**
 * Technical IP Retention & Anonymization Policy (LGPD Compliance)
 * Anonymizes IP addresses in lead_attributions older than retentionDays (default: 30 days).
 * Truncates the last octet for IPv4 (e.g., 177.142.10.0) removing individual identifiability.
 */
export async function anonymizeOldAttributionIps(retentionDays = 30): Promise<number> {
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  try {
    const updated = await prisma.$executeRaw`
      UPDATE "lead_attributions"
      SET "ip_address" = CASE 
        WHEN "ip_address" LIKE '%.%' THEN regexp_replace("ip_address", '\.[0-9]+$', '.0')
        ELSE NULL
      END
      WHERE "recorded_at" < ${cutoffDate}
        AND "ip_address" IS NOT NULL
        AND "ip_address" NOT LIKE '%.0';
    `;
    return Number(updated);
  } catch (err) {
    console.error('[LGPD IP Anonymization] Failed to anonymize old IPs:', err);
    return 0;
  }
}

