// Shared between the signup, reset-password, and change-password forms
// so the rule can't drift between them. 6 is also Supabase Auth's own
// default minimum password length.
export const MIN_PASSWORD_LENGTH = 6;

export function validateNewPassword(password, confirmPassword) {
  if (!password || !confirmPassword) {
    return "Enter and confirm your new password.";
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Your password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }

  return null;
}
