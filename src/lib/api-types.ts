/**
 * Shared API response types. Success shapes remain route-specific for backward compatibility.
 */

export type ApiErrorBody = {
  success: false;
  error: string;
  message?: string;
};

export type ApiSuccessBody<T> = {
  success: true;
  data: T;
};

export function isApiErrorBody(v: unknown): v is ApiErrorBody {
  return (
    typeof v === "object" &&
    v !== null &&
    (v as ApiErrorBody).success === false &&
    typeof (v as ApiErrorBody).error === "string"
  );
}
