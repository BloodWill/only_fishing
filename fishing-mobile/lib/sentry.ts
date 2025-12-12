// lib/sentry.ts
// ===========================================
// SENTRY CRASH REPORTING SETUP
// ===========================================

import * as Sentry from '@sentry/react-native';
import { SENTRY_DSN, isSentryConfigured } from './config';

/**
 * Initialize Sentry crash reporting
 * Call this once at app startup (in _layout.tsx)
 */
export const initSentry = (): void => {
  if (!isSentryConfigured()) {
    if (__DEV__) {
      console.log('⚪ Sentry not configured - skipping initialization');
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    
    // Capture 100% in dev, 20% in production
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    
    // Only send errors in production
    enabled: !__DEV__,
    
    debug: __DEV__,
    environment: __DEV__ ? 'development' : 'production',
  });

  console.log('✅ Sentry initialized');
};

/**
 * Capture an exception manually
 */
export const captureException = (error: Error, context?: Record<string, any>): void => {
  if (!isSentryConfigured()) {
    console.error('Error (Sentry not configured):', error);
    return;
  }

  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
};

/**
 * Capture a message
 */
export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info'): void => {
  if (!isSentryConfigured()) {
    console.log(`Message (Sentry not configured): ${message}`);
    return;
  }
  Sentry.captureMessage(message, level);
};

/**
 * Set user info for error tracking
 */
export const setUser = (userId: string, email?: string, username?: string): void => {
  if (!isSentryConfigured()) return;
  Sentry.setUser({ id: userId, email, username });
};

/**
 * Clear user info (on logout)
 */
export const clearUser = (): void => {
  if (!isSentryConfigured()) return;
  Sentry.setUser(null);
};

/**
 * Add breadcrumb for debugging context
 */
export const addBreadcrumb = (
  message: string,
  category: string = 'app',
  data?: Record<string, any>
): void => {
  if (!isSentryConfigured()) return;
  Sentry.addBreadcrumb({ message, category, data, level: 'info' });
};

export default {
  initSentry,
  captureException,
  captureMessage,
  setUser,
  clearUser,
  addBreadcrumb,
};
