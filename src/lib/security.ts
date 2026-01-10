/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ORSH PLATFORM SECURITY MODULE
 * Copyright © 2024-2025 ORSH Platform. All Rights Reserved.
 * 
 * Client-side security layer for AI chat protection.
 * Prevents prompt injection, jailbreaking, and reverse engineering attempts.
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Injection patterns to detect and block on client side
const INJECTION_PATTERNS: RegExp[] = [
  // Direct instruction override attempts
  /ignore\s+(previous|all|prior|above|system)\s+(instructions|prompts|rules)/gi,
  /forget\s+(your|all|the)\s+(rules|instructions|training|prompts)/gi,
  /disregard\s+(your|all|previous|prior|the)/gi,
  /override\s+(your|system|all)/gi,
  /bypass\s+(your|the|all)/gi,
  
  // Identity manipulation
  /you\s+are\s+now/gi,
  /pretend\s+(you\s+are|to\s+be|you're)/gi,
  /act\s+as\s+(a\s+different|another|if\s+you\s+were)/gi,
  /roleplay\s+as/gi,
  /imagine\s+you\s+are/gi,
  /from\s+now\s+on\s+you/gi,
  /you\s+must\s+act/gi,
  /behave\s+as\s+if/gi,
  
  // Prompt extraction attempts
  /reveal\s+your\s+(prompt|instructions|system|training|rules)/gi,
  /what\s+are\s+your\s+(instructions|rules|prompts|guidelines)/gi,
  /show\s+me\s+your\s+(prompt|system|instructions|training)/gi,
  /output\s+your\s+(prompt|system|instructions|rules)/gi,
  /repeat\s+(your|the)\s+(prompt|instructions|system)/gi,
  /print\s+your\s+(prompt|system|instructions)/gi,
  /display\s+your\s+(prompt|system|configuration)/gi,
  /tell\s+me\s+your\s+(system\s+prompt|instructions|rules)/gi,
  /what\s+is\s+your\s+(system\s+prompt|initial\s+prompt)/gi,
  /copy\s+your\s+(prompt|instructions)/gi,
  /export\s+your\s+(configuration|settings|prompt)/gi,
  /give\s+me\s+your\s+(prompt|instructions|training)/gi,
  /share\s+your\s+(prompt|instructions|system)/gi,
  
  // Jailbreak patterns
  /jailbreak/gi,
  /dan\s+mode/gi,
  /developer\s+mode/gi,
  /god\s+mode/gi,
  /sudo\s+mode/gi,
  /admin\s+mode/gi,
  /unrestricted\s+mode/gi,
  /no\s+limits\s+mode/gi,
  /uncensored/gi,
  /without\s+restrictions/gi,
  /without\s+limitations/gi,
  /without\s+rules/gi,
  /break\s+free/gi,
  /escape\s+your/gi,
  
  // Manipulation through scenarios
  /hypothetically.*if\s+you\s+(could|were|had)/gi,
  /in\s+a\s+fictional.*scenario/gi,
  /for\s+(educational|research|security)\s+purposes.*reveal/gi,
  /debug\s+mode/gi,
  /testing\s+mode/gi,
  /maintenance\s+mode/gi,
  /i('m|\s+am)\s+(a|your|the)\s+(developer|creator|admin|owner)/gi,
  /i\s+(created|made|built|own)\s+you/gi,
  
  // Social engineering
  /it('s|\s+is)\s+(okay|fine|safe|allowed)\s+to\s+(tell|show|reveal)/gi,
  /you\s+(can|should|must)\s+(tell|show|reveal)\s+me/gi,
  /i\s+(have|got)\s+permission/gi,
  /authorized\s+to\s+(see|view|access)/gi,
];

// Suspicious character patterns (encoding/obfuscation attempts)
const SUSPICIOUS_PATTERNS: RegExp[] = [
  /[\u200b-\u200f\u2028-\u202f]/g, // Zero-width characters
  /\\x[0-9a-f]{2}/gi, // Hex escapes
  /\\u[0-9a-f]{4}/gi, // Unicode escapes
  /base64.*decode/gi,
  /hex.*decode/gi,
  /rot13/gi,
];

// Rate limiting for rapid-fire attempts
interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  blocked: boolean;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_ATTEMPTS = 3; // Max injection attempts before temporary block
const RATE_LIMIT_BLOCK_DURATION = 300000; // 5 minute block

/**
 * Check if a message contains potential injection/jailbreak patterns
 */
export function detectInjectionAttempt(message: string): { 
  isInjection: boolean; 
  isSuspicious: boolean;
  pattern?: string;
} {
  if (!message || typeof message !== 'string') {
    return { isInjection: false, isSuspicious: false };
  }

  // Check primary injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    pattern.lastIndex = 0; // Reset regex state
    if (pattern.test(message)) {
      return { 
        isInjection: true, 
        isSuspicious: true,
        pattern: pattern.source.substring(0, 30) + '...'
      };
    }
  }

  // Check for suspicious encoding patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(message)) {
      return { 
        isInjection: false, 
        isSuspicious: true,
        pattern: 'encoding_attempt'
      };
    }
  }

  return { isInjection: false, isSuspicious: false };
}

/**
 * Check rate limiting for injection attempts
 */
export function checkRateLimit(userId: string = 'anonymous'): {
  allowed: boolean;
  remainingAttempts: number;
  blockedUntil?: number;
} {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry) {
    return { allowed: true, remainingAttempts: RATE_LIMIT_MAX_ATTEMPTS };
  }

  // Check if block has expired
  if (entry.blocked) {
    const blockExpiry = entry.firstAttempt + RATE_LIMIT_BLOCK_DURATION;
    if (now > blockExpiry) {
      rateLimitMap.delete(userId);
      return { allowed: true, remainingAttempts: RATE_LIMIT_MAX_ATTEMPTS };
    }
    return { 
      allowed: false, 
      remainingAttempts: 0,
      blockedUntil: blockExpiry
    };
  }

  // Check if window has expired
  if (now - entry.firstAttempt > RATE_LIMIT_WINDOW) {
    rateLimitMap.delete(userId);
    return { allowed: true, remainingAttempts: RATE_LIMIT_MAX_ATTEMPTS };
  }

  const remaining = RATE_LIMIT_MAX_ATTEMPTS - entry.count;
  return { allowed: remaining > 0, remainingAttempts: Math.max(0, remaining) };
}

/**
 * Record an injection attempt for rate limiting
 */
export function recordInjectionAttempt(userId: string = 'anonymous'): void {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry) {
    rateLimitMap.set(userId, { count: 1, firstAttempt: now, blocked: false });
    return;
  }

  // Check if window has expired
  if (now - entry.firstAttempt > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(userId, { count: 1, firstAttempt: now, blocked: false });
    return;
  }

  entry.count++;
  
  // Block if too many attempts
  if (entry.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    entry.blocked = true;
    console.warn('🛡️ SECURITY: User blocked for repeated injection attempts');
  }
}

/**
 * Sanitize input to remove potentially dangerous content
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';

  // Remove zero-width characters
  let sanitized = input.replace(/[\u200b-\u200f\u2028-\u202f\ufeff]/g, '');
  
  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  // Limit length
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000);
  }

  return sanitized;
}

/**
 * Get a safe, non-revealing response for blocked attempts
 */
export function getBlockedResponse(): string {
  const responses = [
    "I'm Bob, your ORSH platform expert. I can help with PSSR reviews, ORA planning, and operational readiness. What would you like to work on?",
    "Let's focus on something I can help with - PSSR management, ORA workflows, or project tracking. What do you need?",
    "I'm here to help with ORSH platform tasks. How can I assist you today?",
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

/**
 * Validate and process user input before sending to AI
 */
export function processUserInput(
  input: string, 
  userId?: string
): {
  isValid: boolean;
  sanitizedInput: string;
  blockedReason?: string;
  shouldShowWarning?: boolean;
} {
  // Sanitize first
  const sanitizedInput = sanitizeInput(input);
  
  if (!sanitizedInput) {
    return { isValid: false, sanitizedInput: '', blockedReason: 'empty_input' };
  }

  // Check rate limiting
  const rateLimit = checkRateLimit(userId);
  if (!rateLimit.allowed) {
    return { 
      isValid: false, 
      sanitizedInput,
      blockedReason: 'rate_limited',
      shouldShowWarning: true
    };
  }

  // Check for injection attempts
  const detection = detectInjectionAttempt(sanitizedInput);
  
  if (detection.isInjection) {
    recordInjectionAttempt(userId);
    console.warn('🛡️ SECURITY: Injection attempt blocked');
    return { 
      isValid: false, 
      sanitizedInput,
      blockedReason: 'injection_detected',
      shouldShowWarning: false // Don't reveal detection
    };
  }

  if (detection.isSuspicious) {
    console.warn('🛡️ SECURITY: Suspicious content detected');
    // Allow but log
  }

  return { isValid: true, sanitizedInput };
}

/**
 * Obfuscate sensitive strings in code (for additional protection)
 */
export function obfuscate(str: string): string {
  return btoa(str.split('').reverse().join(''));
}

export function deobfuscate(str: string): string {
  return atob(str).split('').reverse().join('');
}
