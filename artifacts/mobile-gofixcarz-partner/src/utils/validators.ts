// ---------------------------------------------------------------------------
// Form validation helpers — designed for use with React Hook Form
// ---------------------------------------------------------------------------

/** Email format validation. */
export const emailValidator = {
  required: 'Email address is required.',
  pattern: {
    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address.',
  },
};

/** Generic required string validator. */
export function requiredField(fieldName: string) {
  return {
    required: `${fieldName} is required.`,
  };
}

/** Password validators (min 8 chars, at least one number). */
export const passwordValidator = {
  required: 'Password is required.',
  minLength: {
    value: 8,
    message: 'Password must be at least 8 characters.',
  },
  pattern: {
    value: /^(?=.*[0-9]).+$/,
    message: 'Password must contain at least one number.',
  },
};

/** Confirm-password validator factory — pass `watch('password')` as the arg. */
export function confirmPasswordValidator(password: string) {
  return {
    required: 'Please confirm your password.',
    validate: (value: string) => value === password || 'Passwords do not match.',
  };
}

/** Indian mobile number validator (10 digits, optionally prefixed with +91). */
export const phoneValidator = {
  required: 'Phone number is required.',
  pattern: {
    value: /^(\+91)?[6-9]\d{9}$/,
    message: 'Please enter a valid 10-digit Indian mobile number.',
  },
};

/**
 * Cleans and normalizes an Indian mobile number.
 * Automatically strips country code prefix (+91 / 91 / 0) when autofilled or pasted.
 * Always returns at most 10 digits.
 */
export function cleanMobileNumber(raw: string): string {
  if (!raw) return '';

  let text = raw.trim();

  // 1. Strip explicit +91 or + prefix
  if (text.startsWith('+91')) {
    text = text.slice(3);
  } else if (text.startsWith('+')) {
    text = text.slice(1);
  }

  // Extract digits only
  let digits = text.replace(/\D/g, '');

  // 2. If digits start with 91 and total length > 10 (e.g., "919876543210" -> "9876543210")
  if (digits.length > 10 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }
  // 3. If digits start with 91 and 3rd digit is a valid Indian mobile starting digit (6, 7, 8, 9)
  // (e.g. "9198765432" where 91 is country code + 98765432 is number)
  else if (digits.length >= 10 && digits.startsWith('91') && /^[6-9]/.test(digits.slice(2))) {
    digits = digits.slice(2);
  }
  // 4. Strip trunk prefix '0' (e.g., "09876543210" -> "9876543210")
  else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  return digits.slice(0, 10);
}

/** Name validator — letters and spaces only, 2–50 chars. */
export const nameValidator = {
  required: 'Name is required.',
  minLength: {
    value: 2,
    message: 'Name must be at least 2 characters.',
  },
  maxLength: {
    value: 50,
    message: 'Name must not exceed 50 characters.',
  },
  pattern: {
    value: /^[a-zA-Z\s]+$/,
    message: 'Name can only contain letters and spaces.',
  },
};

