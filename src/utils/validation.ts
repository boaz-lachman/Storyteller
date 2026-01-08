/**
 * Form validation helpers
 */

/**
 * Validates if a string is not empty
 */
export const isNotEmpty = (value: string): boolean => {
  return value.trim().length > 0;
};

/**
 * Validates email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates password strength
 * Requirements: at least 6 characters
 */
export const isValidPassword = (password: string): boolean => {
  return password.length >= 6;
};

/**
 * Validates if two passwords match
 */
export const passwordsMatch = (
  password: string,
  confirmPassword: string
): boolean => {
  return password === confirmPassword;
};

/**
 * Validates importance value (1-10)
 */
export const isValidImportance = (value: number): boolean => {
  return Number.isInteger(value) && value >= 1 && value <= 10;
};

/**
 * Validates if a number is within a range
 */
export const isValidRange = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max;
};

/**
 * Validates string length
 */
export const isValidLength = (
  value: string,
  min: number,
  max?: number
): boolean => {
  const length = value.trim().length;
  if (max !== undefined) {
    return length >= min && length <= max;
  }
  return length >= min;
};

/**
 * Validates required field
 */
export const required = (value: any): boolean => {
  if (typeof value === 'string') {
    return isNotEmpty(value);
  }
  return value !== null && value !== undefined;
};

/**
 * Validation result type
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate multiple fields and return results
 */
export const validateFields = (
  validations: Record<string, ValidationResult>
): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  let isValid = true;

  Object.entries(validations).forEach(([field, result]) => {
    if (!result.isValid) {
      isValid = false;
      if (result.error) {
        errors[field] = result.error;
      }
    }
  });

  return { isValid, errors };
};

/**
 * Common validation error messages
 */
export const validationMessages = {
  required: 'This field is required',
  email: 'Please enter a valid email address',
  password: 'Password must be at least 6 characters',
  passwordMatch: 'Passwords do not match',
  importance: 'Importance must be between 1 and 10',
  minLength: (min: number) => `Must be at least ${min} characters`,
  maxLength: (max: number) => `Must be no more than ${max} characters`,
  lengthRange: (min: number, max: number) =>
    `Must be between ${min} and ${max} characters`,
};
