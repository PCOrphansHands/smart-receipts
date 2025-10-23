/**
 * API Error Handler Utility
 * Provides graceful error handling for backend API calls
 */

interface ApiError {
  message: string;
  isBackendOffline: boolean;
  shouldNotifyUser: boolean;
}

/**
 * Checks if an error is due to backend being offline
 */
function isBackendOfflineError(error: unknown): boolean {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  if (error instanceof Response) {
    return error.status === 500 || error.status === 502 || error.status === 503;
  }

  if (typeof error === 'object' && error !== null) {
    const err = error as { status?: number; code?: string };
    return err.status === 500 || err.code === 'ECONNREFUSED';
  }

  return false;
}

/**
 * Handles API errors gracefully with user-friendly messages
 */
export function handleApiError(error: unknown, context: string = 'API call'): ApiError {
  const isOffline = isBackendOfflineError(error);

  if (isOffline) {
    if (import.meta.env.DEV) {
      // In development, this is expected when backend isn't running
      console.warn(
        `⚠️  Backend offline: ${context} failed.`,
        '\nThe backend server may not be running.',
        '\nStart it with: make run-backend'
      );
    } else {
      console.error(`Backend server unavailable during: ${context}`);
    }

    return {
      message: 'Backend server is not available. Please try again later.',
      isBackendOffline: true,
      shouldNotifyUser: !import.meta.env.DEV, // Don't bother users in dev mode
    };
  }

  // Other errors
  console.error(`Error during ${context}:`, error);

  return {
    message: `Failed to ${context}. Please try again.`,
    isBackendOffline: false,
    shouldNotifyUser: true,
  };
}

/**
 * Wrapper for brain API calls with error handling
 */
export async function safeApiCall<T>(
  apiCall: () => Promise<Response>,
  context: string,
  fallbackValue?: T
): Promise<{ data: T | null; error: ApiError | null }> {
  try {
    const response = await apiCall();

    if (!response.ok) {
      const error = handleApiError(response, context);
      return { data: fallbackValue ?? null, error };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    const apiError = handleApiError(error, context);
    return { data: fallbackValue ?? null, error: apiError };
  }
}
