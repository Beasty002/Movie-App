/**
 * Error Handling Utilities
 * Provides safe async operation handlers with proper error catching and logging
 */

import { Alert } from 'react-native';

export interface AsyncHandlerOptions {
    showAlert?: boolean;
    alertTitle?: string;
    alertMessage?: string;
    onError?: (error: Error) => void;
}

/**
 * Wraps async operations with error handling
 * Ensures errors are caught and logged, preventing unhandled promise rejections
 */
export async function safeAsync<T>(
    asyncFn: () => Promise<T>,
    options: AsyncHandlerOptions = {}
): Promise<T | null> {
    const {
        showAlert = false,
        alertTitle = 'Error',
        alertMessage = 'An unexpected error occurred',
        onError,
    } = options;

    try {
        return await asyncFn();
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('[SAFE ASYNC ERROR]', err.message, err.stack);

        if (onError) {
            onError(err);
        }

        if (showAlert) {
            Alert.alert(alertTitle, alertMessage, [{ text: 'OK' }]);
        }

        return null;
    }
}

/**
 * Wraps a promise chain with error handling
 * Use this for .then().catch() style operations
 */
export function safePromise<T>(
    promise: Promise<T>,
    onError?: (error: Error) => void
): Promise<T | null> {
    return promise
        .then((result) => result)
        .catch((error) => {
            const err = error instanceof Error ? error : new Error(String(error));
            console.error('[SAFE PROMISE ERROR]', err.message, err.stack);

            if (onError) {
                onError(err);
            }

            return null;
        });
}

/**
 * Safe timeout wrapper
 */
export function safeTimeout(
    callback: () => void | Promise<void>,
    ms: number
): ReturnType<typeof setTimeout> {
    return setTimeout(async () => {
        try {
            await callback();
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            console.error('[SAFE TIMEOUT ERROR]', err.message, err.stack);
        }
    }, ms);
}

/**
 * Retry async operation with exponential backoff
 */
export async function retryAsync<T>(
    asyncFn: () => Promise<T>,
    maxAttempts: number = 3,
    delayMs: number = 1000
): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            console.log(`[RETRY] Attempt ${attempt}/${maxAttempts}`);
            return await asyncFn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            console.error(`[RETRY ERROR] Attempt ${attempt} failed:`, lastError.message);

            if (attempt < maxAttempts) {
                const delay = delayMs * Math.pow(2, attempt - 1);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError || new Error('All retry attempts failed');
}

/**
 * Execute function with timeout
 */
export async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string = 'Operation timed out'
): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
        ),
    ]);
}
