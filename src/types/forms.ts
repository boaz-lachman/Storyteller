/**
 * Form state and validation types
 */

/**
 * Form field state
 */
export interface FormFieldState {
  value: any;
  error?: string;
  touched: boolean;
  dirty: boolean;
}

/**
 * Complete form state
 */
export interface FormState<T = Record<string, any>> {
  values: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  dirty: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
  submitCount: number;
}

/**
 * Form field error
 */
export interface FormFieldError {
  field: string;
  message: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Validation rule function
 */
export type ValidationRule = (
  value: any,
  formValues?: any
) => string | undefined | Promise<string | undefined>;

/**
 * Validation schema
 */
export type ValidationSchema = Record<string, ValidationRule | ValidationRule[]>;

/**
 * Form submission handler
 */
export type FormSubmitHandler<T> = (values: T) => void | Promise<void>;

/**
 * Form change handler
 */
export type FormChangeHandler = (name: string, value: any) => void;

/**
 * Form blur handler
 */
export type FormBlurHandler = (name: string) => void;

/**
 * Form reset handler
 */
export type FormResetHandler = () => void;

/**
 * Story form values
 */
export interface StoryFormValues {
  title: string;
  description?: string;
  length: 'short-story' | 'novella' | 'novel';
  theme: 'horror' | 'comedy' | 'drama' | 'sci-fi' | 'fantasy' | 'romance' | 'thriller' | 'mystery';
  tone: 'light' | 'dark' | 'neutral' | 'satirical' | 'serious';
  pov: 'first-person' | 'second-person' | 'third-person-limited' | 'third-person-omniscient';
  targetAudience: 'children' | 'young-adult' | 'adult';
  setting?: string;
  timePeriod?: string;
}

/**
 * Character form values
 */
export interface CharacterFormValues {
  name: string;
  description: string;
  importance: number;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
  traits: string;
  backstory?: string;
}

/**
 * Blurb form values
 */
export interface BlurbFormValues {
  title: string;
  description: string;
  importance: number;
  category?: 'plot-point' | 'conflict' | 'theme' | 'setting' | 'other';
}

/**
 * Scene form values
 */
export interface SceneFormValues {
  title: string;
  description: string;
  setting: string;
  importance: number;
  characters: string[];
  mood?: string;
  conflictLevel?: number;
}

/**
 * Chapter form values
 */
export interface ChapterFormValues {
  title: string;
  description: string;
  importance: number;
  order: number;
}

/**
 * Auth form values
 */
export interface LoginFormValues {
  email: string;
  password: string;
}

export interface SignupFormValues {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ForgotPasswordFormValues {
  email: string;
}

/**
 * Story generation form values
 */
export interface StoryGenerationFormValues {
  complexity: 'simple' | 'moderate' | 'complex';
  style?: string;
  additionalInstructions?: string;
}
