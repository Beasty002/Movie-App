/**
 * Data Validation Utilities
 * Provides safe property access and data validation before usage
 */

/**
 * Safely access nested object properties without throwing errors
 * Example: getNestedValue(user, 'profile.address.street')
 */
export function getNestedValue<T = any>(
    obj: any,
    path: string,
    defaultValue?: T
): T | undefined {
    try {
        if (!obj || typeof obj !== 'object') {
            return defaultValue;
        }

        const keys = path.split('.');
        let value: any = obj;

        for (const key of keys) {
            if (value === null || value === undefined || typeof value !== 'object') {
                return defaultValue;
            }
            value = value[key];
        }

        return value !== undefined ? value : defaultValue;
    } catch (error) {
        console.warn(`[VALIDATION] Failed to access path "${path}":`, error);
        return defaultValue;
    }
}

/**
 * Validate object has required properties
 */
export function validateRequired(
    obj: any,
    requiredKeys: string[]
): { valid: boolean; missing: string[] } {
    if (!obj || typeof obj !== 'object') {
        return { valid: false, missing: requiredKeys };
    }

    const missing = requiredKeys.filter((key) => !(key in obj) || obj[key] === undefined);
    return { valid: missing.length === 0, missing };
}

/**
 * Type-safe property access for objects
 */
export function safeGet<T extends object, K extends keyof T>(
    obj: T | null | undefined,
    key: K,
    defaultValue?: T[K]
): T[K] | undefined {
    if (!obj || typeof obj !== 'object') {
        return defaultValue;
    }
    return obj[key] !== undefined ? obj[key] : defaultValue;
}

/**
 * Validate array is not empty and has expected type
 */
export function validateArray<T>(
    arr: any,
    expectedLength?: number
): arr is T[] {
    if (!Array.isArray(arr)) {
        return false;
    }
    if (expectedLength !== undefined && arr.length !== expectedLength) {
        return false;
    }
    return true;
}

/**
 * Validate string is not empty
 */
export function validateString(str: any): str is string {
    return typeof str === 'string' && str.trim().length > 0;
}

/**
 * Validate number is valid and finite
 */
export function validateNumber(num: any): num is number {
    return typeof num === 'number' && isFinite(num);
}

/**
 * Validate email format
 */
export function validateEmail(email: any): boolean {
    if (!validateString(email)) {
        return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function validateUrl(url: any): boolean {
    if (!validateString(url)) {
        return false;
    }
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Safe JSON parse
 */
export function safeJsonParse<T = any>(
    jsonString: any,
    defaultValue?: T
): T | undefined {
    try {
        if (!validateString(jsonString)) {
            return defaultValue;
        }
        return JSON.parse(jsonString);
    } catch (error) {
        console.warn('[VALIDATION] JSON parse failed:', error);
        return defaultValue;
    }
}

/**
 * Validate object matches expected shape
 */
export function validateShape<T extends Record<string, any>>(
    obj: any,
    shape: Record<keyof T, string>
): obj is T {
    if (!obj || typeof obj !== 'object') {
        return false;
    }

    for (const [key, expectedType] of Object.entries(shape)) {
        const value = obj[key];
        if (typeof value !== expectedType) {
            console.warn(
                `[VALIDATION] Property "${key}" expected type "${expectedType}" but got "${typeof value}"`
            );
            return false;
        }
    }

    return true;
}

/**
 * Filter out null/undefined values from object
 */
export function filterEmpty<T extends Record<string, any>>(obj: T): Partial<T> {
    const filtered: any = {};

    for (const [key, value] of Object.entries(obj)) {
        if (value !== null && value !== undefined) {
            filtered[key] = value;
        }
    }

    return filtered;
}

/**
 * Safely compare two objects for equality
 */
export function deepEqual(obj1: any, obj2: any): boolean {
    try {
        return JSON.stringify(obj1) === JSON.stringify(obj2);
    } catch {
        return obj1 === obj2;
    }
}
