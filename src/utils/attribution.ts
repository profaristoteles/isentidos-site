/**
 * Motor de Atribuição Client-Side (First-Touch & Last-Touch)
 * Instituto Sentidos
 */

export interface TouchAttribution {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  fbclid?: string | null;
  gclid?: string | null;
  fbc?: string | null;
  fbp?: string | null;
  landingPage?: string | null;
  referrer?: string | null;
  timestamp?: number;
}

export interface AttributionBundle {
  firstTouch: TouchAttribution | null;
  lastTouch: TouchAttribution | null;
  currentTouch: TouchAttribution;
}

const STORAGE_FIRST_TOUCH = '_is_first_touch';
const STORAGE_LAST_TOUCH = '_is_last_touch';

/**
 * Strong UUID generator using crypto.randomUUID()
 * Format: lead_<uuid>
 */
export function generateEventId(prefix = 'lead'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  // Fallback using crypto.getRandomValues if randomUUID is unavailable
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    return `${prefix}_${uuid}`;
  }
  // Ultimate deterministic fallback
  const d = Date.now().toString(36);
  const r = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${d}-${r}`;
}

/**
 * Cookie helpers
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

function setCookie(name: string, value: string, days = 90) {
  if (typeof document === 'undefined') return;
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = '; expires=' + date.toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/; SameSite=Lax`;
}

/**
 * Format or retrieve Meta _fbc and _fbp cookies
 */
function resolveFbc(fbclidFromUrl: string | null): string | null {
  const existingCookie = getCookie('_fbc');
  if (fbclidFromUrl) {
    const fbcValue = `fb.1.${Date.now()}.${fbclidFromUrl}`;
    setCookie('_fbc', fbcValue, 90);
    return fbcValue;
  }
  return existingCookie;
}

function resolveFbp(): string | null {
  let existingCookie = getCookie('_fbp');
  if (!existingCookie) {
    const rand = Math.floor(Math.random() * 8999999999 + 1000000000);
    existingCookie = `fb.1.${Date.now()}.${rand}`;
    setCookie('_fbp', existingCookie, 90);
  }
  return existingCookie;
}

/**
 * Parse current URL query params and referrer
 */
export function captureCurrentTouch(): TouchAttribution {
  if (typeof window === 'undefined') {
    return {};
  }

  const url = new URL(window.location.href);
  const params = url.searchParams;

  const utmSource = params.get('utm_source');
  const utmMedium = params.get('utm_medium');
  const utmCampaign = params.get('utm_campaign');
  const utmContent = params.get('utm_content');
  const utmTerm = params.get('utm_term');
  const fbclid = params.get('fbclid');
  const gclid = params.get('gclid');

  const fbc = resolveFbc(fbclid);
  const fbp = resolveFbp();

  const current: TouchAttribution = {
    utmSource: utmSource || null,
    utmMedium: utmMedium || null,
    utmCampaign: utmCampaign || null,
    utmContent: utmContent || null,
    utmTerm: utmTerm || null,
    fbclid: fbclid || null,
    gclid: gclid || null,
    fbc: fbc || null,
    fbp: fbp || null,
    landingPage: window.location.href,
    referrer: document.referrer || null,
    timestamp: Date.now(),
  };

  return current;
}

/**
 * Initialize and persist attribution in localStorage & cookies.
 * First-touch is immutable once set.
 * Last-touch is updated whenever marketing parameters (UTM or click IDs) or new sessions occur.
 */
export function initAttribution(): AttributionBundle {
  if (typeof window === 'undefined') {
    return { firstTouch: null, lastTouch: null, currentTouch: {} };
  }

  const current = captureCurrentTouch();
  const hasMarketingParams = Boolean(
    current.utmSource || current.utmMedium || current.utmCampaign || current.fbclid || current.gclid
  );

  // 1. First Touch Handling
  let firstTouch: TouchAttribution | null = null;
  try {
    const rawFirst = localStorage.getItem(STORAGE_FIRST_TOUCH);
    if (rawFirst) {
      firstTouch = JSON.parse(rawFirst);
    }
  } catch (e) {
    console.warn('[Attribution] Failed to read first touch from localStorage:', e);
  }

  if (!firstTouch) {
    firstTouch = current;
    try {
      localStorage.setItem(STORAGE_FIRST_TOUCH, JSON.stringify(firstTouch));
      setCookie('_is_ft', JSON.stringify(firstTouch), 90);
    } catch (e) {
      console.warn('[Attribution] Failed to save first touch:', e);
    }
  }

  // 2. Last Touch Handling
  let lastTouch: TouchAttribution | null = null;
  try {
    const rawLast = localStorage.getItem(STORAGE_LAST_TOUCH);
    if (rawLast) {
      lastTouch = JSON.parse(rawLast);
    }
  } catch (e) {
    console.warn('[Attribution] Failed to read last touch:', e);
  }

  // Update last touch if marketing params are present or if lastTouch doesn't exist yet
  if (hasMarketingParams || !lastTouch) {
    lastTouch = current;
    try {
      localStorage.setItem(STORAGE_LAST_TOUCH, JSON.stringify(lastTouch));
      setCookie('_is_lt', JSON.stringify(lastTouch), 30);
    } catch (e) {
      console.warn('[Attribution] Failed to save last touch:', e);
    }
  }

  return {
    firstTouch,
    lastTouch,
    currentTouch: current,
  };
}

/**
 * Returns attribution payload formatted for POST /api/leads
 */
export function getAttributionPayload() {
  const bundle = initAttribution();
  return {
    firstTouch: bundle.firstTouch,
    lastTouch: bundle.lastTouch,
  };
}
