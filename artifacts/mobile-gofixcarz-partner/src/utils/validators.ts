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
