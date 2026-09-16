import { test } from "node:test";
import assert from "node:assert/strict";

import {
  otpDigitAt,
  padOtp,
  pasteOtpDigits,
  setOtpDigit,
  cleanOtpCode,
} from "./otp.js";

test("otpDigitAt reads a digit, and treats missing/padding as empty", () => {
  assert.equal(otpDigitAt("1234", 0), "1");
  assert.equal(otpDigitAt("1234", 3), "4");
  assert.equal(otpDigitAt("1234", 4), ""); // past the end of the string
  assert.equal(otpDigitAt("1 34", 1), ""); // a padding space
});

test("padOtp pads with the placeholder and never exceeds length", () => {
  assert.equal(padOtp("12", 8), "12      ");
  assert.equal(padOtp("123456789", 8), "12345678");
});

/*
 * This is the bug that shipped first: joining an array of single
 * characters where empty slots are "" (not a real placeholder) collapses
 * position, because "".join("") on a sparse-looking array just
 * concatenates the non-empty parts. Typing into box 2 while boxes 0-1 are
 * still empty must NOT make that digit reappear in box 0.
 */
test("setOtpDigit keeps a later digit in its own position when earlier boxes are empty", () => {
  const value = setOtpDigit("", 8, 2, "5");

  assert.equal(otpDigitAt(value, 0), "");
  assert.equal(otpDigitAt(value, 1), "");
  assert.equal(otpDigitAt(value, 2), "5");
  assert.equal(otpDigitAt(value, 3), "");
});

test("setOtpDigit fills sequentially the way normal typing does", () => {
  let value = "";
  for (const [index, digit] of "1234".split("").entries()) {
    value = setOtpDigit(value, 8, index, digit);
  }
  assert.equal(cleanOtpCode(value), "1234");
});

test("setOtpDigit clears a box back to empty without disturbing others", () => {
  let value = setOtpDigit("", 8, 0, "1");
  value = setOtpDigit(value, 8, 1, "2");
  value = setOtpDigit(value, 8, 0, ""); // clear box 0

  assert.equal(otpDigitAt(value, 0), "");
  assert.equal(otpDigitAt(value, 1), "2");
});

test("pasteOtpDigits fills from the paste point and preserves what came before it", () => {
  const withPrefix = setOtpDigit("", 8, 0, "9");
  const value = pasteOtpDigits(withPrefix, 8, 1, "1234567");

  assert.equal(cleanOtpCode(value), "91234567");
});

test("pasteOtpDigits truncates a paste that overruns the remaining boxes", () => {
  const value = pasteOtpDigits("", 8, 6, "123456"); // only 2 boxes left (6, 7)

  assert.equal(otpDigitAt(value, 6), "1");
  assert.equal(otpDigitAt(value, 7), "2");
  assert.equal(cleanOtpCode(value), "12");
});

test("cleanOtpCode strips every placeholder space, not just leading/trailing", () => {
  assert.equal(cleanOtpCode("12      "), "12");
  assert.equal(cleanOtpCode(padOtp("", 8)), "");
  assert.equal(cleanOtpCode("12345678"), "12345678");
});
