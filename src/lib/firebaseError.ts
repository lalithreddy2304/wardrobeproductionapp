type FirebaseLikeError = Error & {
  code?: string;
  customData?: unknown;
  serverResponse?: unknown;
};

export function firebaseErrorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as FirebaseLikeError).code)
    : undefined;
}

export function firebaseErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    const code = firebaseErrorCode(error);
    return code ? `${code}: ${error.message}` : error.message;
  }
  return fallback;
}

export function logFirebaseError(context: string, error: unknown) {
  if (error instanceof Error) {
    const firebaseError = error as FirebaseLikeError;
    console.error(context, {
      code: firebaseError.code,
      message: firebaseError.message,
      stack: firebaseError.stack,
      customData: firebaseError.customData,
      serverResponse: firebaseError.serverResponse,
    });
    return;
  }

  console.error(context, {
    code: undefined,
    message: String(error),
    stack: undefined,
  });
}
