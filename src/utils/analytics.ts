/**
 * DataLayer and Client-Side Analytics Engine
 * Instituto Sentidos
 * 
 * Supports standard GTM dataLayer, GA4 gtag, and Meta Pixel.
 * Ensures strong event_id is shared across browser events and backend payloads.
 */

import { generateEventId, initAttribution } from './attribution';

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
  }
}

// Track last fired page view to prevent accidental duplicates in React SPAs
let consentModeInitialized = false;

export function initGoogleConsentMode() {
  if (typeof window === 'undefined' || consentModeInitialized) return;
  consentModeInitialized = true;

  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function () {
      window.dataLayer?.push(arguments);
    };
  }

  // Check persisted user choice
  let defaultStatus = 'denied';
  try {
    const saved = localStorage.getItem('isentidos_lgpd_consent');
    if (saved === 'granted') defaultStatus = 'granted';
  } catch (e) {
    // LocalStorage blocked
  }

  window.gtag('consent', 'default', {
    ad_storage: defaultStatus,
    analytics_storage: defaultStatus,
    ad_user_data: defaultStatus,
    ad_personalization: defaultStatus,
    wait_for_update: 500,
  });

  window.dataLayer.push({
    event: 'default_consent',
    ad_storage: defaultStatus,
    analytics_storage: defaultStatus,
    ad_user_data: defaultStatus,
    ad_personalization: defaultStatus,
  });
}

export function ensureDataLayer() {
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];
    initGoogleConsentMode();
  }
}

/**
 * Pushes raw event to dataLayer
 */
export function pushDataLayer(event: string, params: Record<string, any> = {}) {
  ensureDataLayer();
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({
      event,
      timestamp: new Date().toISOString(),
      ...params,
    });
  }
}

// Track last fired page view to prevent duplicate events on React remounts
let lastPageViewUrl = '';
let lastPageViewTime = 0;

/**
 * Track PageView
 */
export function trackPageView(pagePath?: string, title?: string) {
  if (typeof window === 'undefined') return;

  const currentPath = pagePath || window.location.pathname + window.location.search;
  const now = Date.now();

  // Deduplication: prevent duplicate page_view within 500ms for the exact same path
  if (lastPageViewUrl === currentPath && now - lastPageViewTime < 500) {
    return;
  }
  lastPageViewUrl = currentPath;
  lastPageViewTime = now;

  const attribution = initAttribution();

  pushDataLayer('page_view', {
    page_path: currentPath,
    page_title: title || document.title,
    utm_source: attribution.currentTouch.utmSource || undefined,
    utm_campaign: attribution.currentTouch.utmCampaign || undefined,
  });

  // Safe call to gtag if initialized
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'page_view', {
      page_path: currentPath,
      page_title: title || document.title,
    });
  }
}

/**
 * Track ViewContent / view_item when viewing a course detail or landing page
 */
export interface CourseViewData {
  courseCode?: string;
  courseTitle: string;
  modality: string;
  category?: string;
  price?: number | string;
}

// Track last viewed course to prevent duplicate ViewContent triggers on React remounts
let lastViewCourseKey = '';
let lastViewCourseTime = 0;

export function trackCourseView(data: CourseViewData) {
  if (typeof window === 'undefined') return;

  const courseKey = (data.courseCode || data.courseTitle) + '_' + data.modality;
  const now = Date.now();
  if (lastViewCourseKey === courseKey && now - lastViewCourseTime < 1000) {
    return;
  }
  lastViewCourseKey = courseKey;
  lastViewCourseTime = now;

  const eventId = generateEventId('view');

  pushDataLayer('view_item', {
    event_id: eventId,
    course_code: data.courseCode || undefined,
    item_id: data.courseCode || data.courseTitle,
    item_name: data.courseTitle,
    item_category: data.modality,
    price: typeof data.price === 'number' ? data.price : undefined,
  });

  // Meta Pixel ViewContent with eventID for deduplication
  if (typeof window.fbq === 'function') {
    window.fbq('track', 'ViewContent', {
      content_name: data.courseTitle,
      content_category: data.modality,
      content_ids: data.courseCode ? [data.courseCode] : undefined,
      content_type: 'product',
    }, { eventID: eventId });
  }
}

/**
 * Track Contact (e.g. WhatsApp button click or phone click)
 */
export interface ContactClickData {
  channel: 'whatsapp' | 'phone' | 'email';
  courseCode?: string;
  courseTitle?: string;
  modality?: string;
  ctaText?: string;
}

export function trackContactClick(data: ContactClickData) {
  if (typeof window === 'undefined') return;

  const eventId = generateEventId('contact');

  pushDataLayer('contact', {
    event_id: eventId,
    contact_channel: data.channel,
    course_code: data.courseCode || undefined,
    course_title: data.courseTitle || undefined,
    modality: data.modality || undefined,
    cta_text: data.ctaText || undefined,
  });

  if (typeof window.fbq === 'function') {
    window.fbq('track', 'Contact', {
      content_name: data.courseTitle || 'WhatsApp Direto',
      content_category: data.channel,
    }, { eventID: eventId });
  }

  if (typeof window.gtag === 'function') {
    window.gtag('event', 'generate_lead_intent', {
      method: data.channel,
      item_name: data.courseTitle,
    });
  }
}

/**
 * Track Form Start
 */
export function trackFormStart(formName: string, courseCode?: string) {
  if (typeof window === 'undefined') return;

  pushDataLayer('form_start', {
    form_name: formName,
    course_code: courseCode || undefined,
  });
}

/**
 * Track Lead / Pre-Enrollment Submission
 * IMPORTANT: Pre-enrollment is FREE. We NEVER send value or fire Purchase!
 */
export interface LeadEventData {
  eventId: string; // Must be lead_<uuid>
  courseCode?: string;
  courseTitle: string;
  modality: string;
  formName: string;
}

// Lead tracking deduplication set
const trackedLeadEventIds = new Set<string>();

export function trackLeadSubmission(data: LeadEventData) {
  if (typeof window === 'undefined') return;

  // Deduplication guard: never fire the same eventId twice
  if (trackedLeadEventIds.has(data.eventId)) {
    return;
  }
  trackedLeadEventIds.add(data.eventId);

  // 1. Push to GTM dataLayer
  pushDataLayer('generate_lead', {
    event_id: data.eventId,
    form_name: data.formName,
    course_code: data.courseCode || undefined,
    course_title: data.courseTitle,
    modality: data.modality,
    is_pre_enrollment: true,
  });

  // Also push alias 'lead' for standard GTM recipes
  pushDataLayer('lead', {
    event_id: data.eventId,
    course_code: data.courseCode || undefined,
    course_title: data.courseTitle,
    modality: data.modality,
  });

  // 2. Meta Pixel Client-Side Track Lead with eventID for deduplication
  if (typeof window.fbq === 'function') {
    window.fbq('track', 'Lead', {
      content_name: data.courseTitle,
      content_category: data.modality,
      status: 'pre_enrolled',
    }, { eventID: data.eventId });
  }

  // 3. GA4 gtag event
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'generate_lead', {
      event_id: data.eventId,
      course_code: data.courseCode || undefined,
      course_title: data.courseTitle,
      modality: data.modality,
    });
  }
}

/**
 * LGPD Consent Mode Updater
 */
export function updateConsent(granted: boolean) {
  const status = granted ? 'granted' : 'denied';

  pushDataLayer('consent_status', {
    ad_storage: status,
    analytics_storage: status,
    ad_user_data: status,
    ad_personalization: status,
  });

  if (typeof window !== 'undefined') {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        ad_storage: status,
        analytics_storage: status,
        ad_user_data: status,
        ad_personalization: status,
      });
    }

    if (typeof window.fbq === 'function') {
      window.fbq('consent', granted ? 'grant' : 'revoke');
    }
  }
}
