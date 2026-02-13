import { Alert } from 'react-native';

export type FirestoreErrorType = 
  | 'network'
  | 'permission'
  | 'not-found'
  | 'unknown';

export interface AppError {
  type: FirestoreErrorType;
  message: string;
  originalError: any;
  retryable: boolean;
}

/**
 * Parse Firestore errors into user-friendly messages
 */
export function parseFirestoreError(error: any): AppError {
  const errorCode = error?.code || '';
  const errorMessage = error?.message || '';

  // Network errors
  if (
    errorCode === 'unavailable' ||
    errorCode === 'failed-precondition' ||
    errorMessage.includes('network') ||
    errorMessage.includes('offline')
  ) {
    return {
      type: 'network',
      message: 'No internet connection. Please check your network and try again.',
      originalError: error,
      retryable: true,
    };
  }

  // Permission errors
  if (
    errorCode === 'permission-denied' ||
    errorMessage.includes('permission')
  ) {
    return {
      type: 'permission',
      message: 'You don\'t have permission to perform this action.',
      originalError: error,
      retryable: false,
    };
  }

  // Not found errors
  if (
    errorCode === 'not-found' ||
    errorMessage.includes('not found')
  ) {
    return {
      type: 'not-found',
      message: 'The requested item was not found.',
      originalError: error,
      retryable: false,
    };
  }

  // Unknown errors
  return {
    type: 'unknown',
    message: 'Something went wrong. Please try again.',
    originalError: error,
    retryable: true,
  };
}

/**
 * Show error alert with optional retry button
 */
export function showErrorAlert(
  error: AppError,
  onRetry?: () => void
) {
  const buttons: any[] = [
    { text: 'OK', style: 'cancel' }
  ];

  if (error.retryable && onRetry) {
    buttons.unshift({
      text: 'Retry',
      onPress: onRetry,
    });
  }

  Alert.alert(
    'Error',
    error.message,
    buttons
  );
}

/**
 * Wrapper for async operations with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  onError?: (error: AppError) => void,
  onRetry?: () => void
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    const appError = parseFirestoreError(error);
    
    if (onError) {
      onError(appError);
    } else {
      showErrorAlert(appError, onRetry);
    }
    
    return null;
  }
}

/**
 * Retry logic with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry permission errors
      const appError = parseFirestoreError(error);
      if (appError.type === 'permission' || appError.type === 'not-found') {
        throw error;
      }
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  
  throw lastError;
}
