/**
 * General helper utilities
 */
import uuid from 'react-native-uuid';
import {
  debounce as lodashDebounce,
  throttle as lodashThrottle,
  cloneDeep as lodashCloneDeep,
} from 'lodash';

/**
 * Generate a unique ID using UUID v4
 */
export const generateId = (): string => {
  return uuid.v4();
};

/**
 * Get current timestamp in milliseconds
 */
export const getCurrentTimestamp = (): number => {
  return Date.now();
};

/**
 * Deep clone an object using lodash
 */
export const deepClone = lodashCloneDeep;

/**
 * Debounce function using lodash
 */
export const debounce = lodashDebounce;

/**
 * Throttle function using lodash
 */
export const throttle = lodashThrottle;

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 */
export const isEmpty = (value: any): boolean => {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string') {
    return value.trim().length === 0;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }
  return false;
};

/**
 * Safe JSON parse
 */
export const safeJsonParse = <T>(json: string, fallback: T): T => {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
};

/**
 * Safe JSON stringify
 */
export const safeJsonStringify = (obj: any, fallback: string = ''): string => {
  try {
    return JSON.stringify(obj);
  } catch {
    return fallback;
  }
};

/**
 * Delay/pause execution
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Retry a function with exponential backoff
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> => {
  let lastError: Error;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await delay(initialDelay * Math.pow(2, i));
      }
    }
  }
  throw lastError!;
};

/**
 * Sort array by key
 */
export const sortBy = <T>(
  array: T[],
  key: keyof T,
  order: 'asc' | 'desc' = 'asc'
): T[] => {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    if (aVal < bVal) {
      return order === 'asc' ? -1 : 1;
    }
    if (aVal > bVal) {
      return order === 'asc' ? 1 : -1;
    }
    return 0;
  });
};

/**
 * Group array by key
 */
export const groupBy = <T>(
  array: T[],
  key: keyof T
): Record<string, T[]> => {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
};

/**
 * Remove duplicates from array
 */
export const unique = <T>(array: T[]): T[] => {
  return Array.from(new Set(array));
};

/**
 * Remove duplicates from array by key
 */
export const uniqueBy = <T>(array: T[], key: keyof T): T[] => {
  const seen = new Set();
  return array.filter((item) => {
    const val = item[key];
    if (seen.has(val)) {
      return false;
    }
    seen.add(val);
    return true;
  });
};

/**
 * Pick properties from object
 */
export const pick = <T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  keys.forEach((key) => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
};

/**
 * Omit properties from object
 */
export const omit = <T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> => {
  const result = { ...obj };
  keys.forEach((key) => {
    delete result[key];
  });
  return result;
};

/**
 * Clamp number between min and max
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Check if object has property
 */
export const has = (obj: any, key: string): boolean => {
  return Object.prototype.hasOwnProperty.call(obj, key);
};


export const toFirestoreValue = (value: any): any => {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }
  if (typeof value === 'string') {
    return { stringValue: value };
  }
  if (typeof value === 'number') {
    return Number.isInteger(value) 
      ? { integerValue: value.toString() }
      : { doubleValue: value };
  }
  if (typeof value === 'boolean') {
    return { booleanValue: value };
  }
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map(toFirestoreValue)
      }
    };
  }
  if (typeof value === 'object') {
    const fields: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      fields[key] = toFirestoreValue(val);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

/**
 * Convert Firestore document to JavaScript object
 */
export const fromFirestoreDocument = (doc: any): any => {
  if (!doc.fields) return {};
  
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(doc.fields)) {
    result[key] = fromFirestoreValue(value);
  }
  
  // Add document ID
  const pathParts = doc.name.split('/');
  result.id = pathParts[pathParts.length - 1];
  
  return result;
}

export const fromFirestoreValue = (value: any): any => {
  if ('nullValue' in value) return null;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return parseInt(value.integerValue, 10);
  if ('doubleValue' in value) return value.doubleValue;
  if ('timestampValue' in value) return new Date(value.timestampValue).getTime();
  if ('stringValue' in value) return value.stringValue;
  if ('arrayValue' in value) {
    return value.arrayValue.values?.map(fromFirestoreValue) || [];
  }
  if ('mapValue' in value) {
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(value.mapValue.fields || {})) {
      result[key] = fromFirestoreValue(val);
    }
    return result;
  }
  return null;
}

/**
 * Convert object to Firestore fields format
 */
export const toFirestoreFields = (data: any): any => {
  const fields: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key !== 'id') { // Skip id field as it's part of the document path
      fields[key] = toFirestoreValue(value);
    }
  }
  return fields;
}

