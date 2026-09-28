/**
 * Input sanitization and validation utilities for TechBETA 2026 Management System
 */

/**
 * Strips HTML tags, trims whitespace, and limits character length
 */
export function sanitizeString(val: unknown, maxLength: number = 255): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  // Strip dangerous HTML/script characters
  const clean = str.replace(/[<>]/g, '');
  return clean.slice(0, maxLength);
}

/**
 * Validates and normalizes 10-digit Indian mobile numbers
 */
export function validatePhoneNumber(phone: unknown): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  if (!phone || typeof phone !== 'string' && typeof phone !== 'number') {
    return { valid: false, normalized: '', error: 'Phone number is required.' };
  }

  // Remove non-digit characters
  let digits = String(phone).replace(/\D/g, '');

  // Strip leading +91 or 91 country code if 12 digits
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }

  // Strip leading 0 if 11 digits
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // Enforce exactly 10 digits starting with 6, 7, 8, or 9
  if (!/^[6-9]\d{9}$/.test(digits)) {
    return {
      valid: false,
      normalized: digits,
      error: 'Please enter a valid 10-digit Indian mobile number (starting with 6-9).',
    };
  }

  return { valid: true, normalized: digits };
}

/**
 * Validates and normalizes email addresses
 */
export function validateEmail(email: unknown): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  if (!email || typeof email !== 'string') {
    return { valid: false, normalized: '', error: 'Email is required.' };
  }

  const normalized = email.trim().toLowerCase().slice(0, 150);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(normalized)) {
    return { valid: false, normalized, error: 'Please enter a valid email address.' };
  }

  return { valid: true, normalized };
}

/**
 * Validates and clamps payment amounts
 */
export function validateAmount(amount: unknown, defaultAmount: number = 250): number {
  if (amount === undefined || amount === null || amount === '') {
    return defaultAmount;
  }
  const parsed = Number(amount);
  if (isNaN(parsed) || parsed < 0) {
    return defaultAmount;
  }
  // Clamp to realistic maximum for symposium registrations (e.g. ₹50,000)
  return Math.min(Math.floor(parsed), 50000);
}

/**
 * Normalizes event lists (ensures strings, trimmed, no duplicates)
 */
export function sanitizeEventList(events: unknown, maxItems: number = 10): string[] {
  let list: unknown[] = [];
  if (Array.isArray(events)) {
    list = events;
  } else if (typeof events === 'string') {
    try {
      const parsed = JSON.parse(events);
      list = Array.isArray(parsed) ? parsed : [events];
    } catch {
      list = [events];
    }
  }

  return list
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => sanitizeString(item, 80))
    .slice(0, maxItems);
}

export interface SanitizedRegistrationInput {
  name: string;
  email: string;
  phone: string;
  college: string;
  department: string;
  year: string;
  teamId?: string;
  teamName?: string;
  technicalEvents: string[];
  nonTechnicalEvents: string[];
  paymentUtr: string;
  amount: number;
  isVerified: boolean;
  isEntered: boolean;
  entryNotes: string;
}

/**
 * Validates the complete registration payload for POST /api/registrations
 */
export function validateRegistrationPayload(body: any): {
  valid: boolean;
  errors: string[];
  data?: SanitizedRegistrationInput;
} {
  const errors: string[] = [];

  // Name
  const name = sanitizeString(body?.name, 100);
  if (!name || name.length < 2) {
    errors.push('Full name must be at least 2 characters long.');
  }

  // College
  const college = sanitizeString(body?.college, 150);
  if (!college || college.length < 2) {
    errors.push('College name is required.');
  }

  // Phone
  const phoneValidation = validatePhoneNumber(body?.phone);
  if (!phoneValidation.valid) {
    errors.push(phoneValidation.error || 'Valid 10-digit phone number is required.');
  }

  // Email (optional for spot registration, but if provided must be valid)
  let email = '';
  if (body?.email && String(body.email).trim().length > 0) {
    const emailValidation = validateEmail(body.email);
    if (!emailValidation.valid) {
      errors.push(emailValidation.error || 'Invalid email address format.');
    } else {
      email = emailValidation.normalized;
    }
  } else if (phoneValidation.valid) {
    email = `${phoneValidation.normalized}@spot.techbeta.in`;
  }

  // Department & Year
  const department = sanitizeString(body?.department || 'Information Technology', 100);
  const year = sanitizeString(body?.year || '1st Year', 50);

  // Team
  const teamId = body?.teamId ? sanitizeString(body.teamId, 60) : undefined;
  const teamName = body?.teamName ? sanitizeString(body.teamName, 100) : undefined;

  // Events
  const technicalEvents = sanitizeEventList(body?.technicalEvents);
  const nonTechnicalEvents = sanitizeEventList(body?.nonTechnicalEvents);

  // Payment
  const paymentUtr = sanitizeString(body?.paymentUtr || 'SPOT-CASH', 60);
  const amount = validateAmount(body?.amount, 250);

  // Status
  const isVerified = body?.isVerified !== undefined ? Boolean(body.isVerified) : true;
  const isEntered = body?.isEntered !== undefined ? Boolean(body.isEntered) : false;
  const entryNotes = sanitizeString(body?.entryNotes || 'Spot Registration', 200);

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: {
      name,
      email,
      phone: phoneValidation.normalized,
      college,
      department,
      year,
      teamId,
      teamName,
      technicalEvents,
      nonTechnicalEvents,
      paymentUtr,
      amount,
      isVerified,
      isEntered,
      entryNotes,
    },
  };
}
