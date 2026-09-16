/*
 * =========================================================
 * OTP CODE STATE
 *
 * Pure helpers behind the 8-box confirmation-code input in
 * AuthScreen.jsx. Kept separate from the component so the
 * positional logic (the part that's actually easy to get
 * wrong) can be unit tested without rendering React.
 * =========================================================
 */

/*
 * Empty boxes are stored as a literal space, not "", so a box's position
 * survives Array.join("") even when earlier boxes are still empty -- with
 * "" as the placeholder, ["", "", "5"].join("") collapses to "5" and the
 * digit would silently reappear in box 0 on the next render.
 */
export const OTP_EMPTY = " ";

export function padOtp(value, length) {
  return value.padEnd(length, OTP_EMPTY).slice(0, length);
}

export function otpDigitAt(value, index) {
  const char = value[index];
  return char && char !== OTP_EMPTY ? char : "";
}

export function setOtpDigit(value, length, index, char) {
  const next = padOtp(value, length).split("");
  next[index] = char || OTP_EMPTY;
  return next.join("");
}

export function pasteOtpDigits(value, length, index, pasted) {
  const next = padOtp(value, length).split("");

  for (
    let i = 0;
    i < pasted.length && index + i < length;
    i++
  ) {
    next[index + i] = pasted[i];
  }

  return next.join("");
}

export function cleanOtpCode(value) {
  return value.replace(/\s+/g, "");
}
