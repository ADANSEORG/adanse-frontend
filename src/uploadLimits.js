const configuredMb = Number(
  import.meta.env?.VITE_MAX_UPLOAD_MB
);

export const MAX_UPLOAD_MB =
  Number.isFinite(configuredMb) && configuredMb > 0
    ? configuredMb
    : 10;

export const MAX_UPLOAD_BYTES =
  MAX_UPLOAD_MB * 1024 * 1024;

export function uploadSizeError(file) {
  if (!file || !Number.isFinite(Number(file.size))) {
    return "";
  }

  if (Number(file.size) > MAX_UPLOAD_BYTES) {
    return `File is too large. Maximum upload size is ${MAX_UPLOAD_MB} MB.`;
  }

  return "";
}

export function assertUploadSize(file) {
  const message = uploadSizeError(file);

  if (message) {
    const error = new Error(message);
    error.status = 413;
    throw error;
  }
}
