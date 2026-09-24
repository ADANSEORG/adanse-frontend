/*
 * Pure math for the sidebar title "marquee": a title wider than its
 * container slides left by exactly its overflow so the end becomes readable.
 * Kept out of the component so it's testable under plain node:test.
 *
 * Constant speed (so a long title doesn't whiz past), with a floor on the
 * duration (so a title that overflows by a few pixels doesn't twitch).
 */

export const MARQUEE_SPEED_PX_PER_SECOND = 40;
export const MARQUEE_MIN_DURATION_SECONDS = 1.5;

// Returns null when the title fits (it must stay static), otherwise the
// distance to slide and how long that takes.
export function marqueeShift(
  textWidth,
  visibleWidth,
  {
    speed = MARQUEE_SPEED_PX_PER_SECOND,
    minDuration = MARQUEE_MIN_DURATION_SECONDS,
  } = {}
) {
  if (!Number.isFinite(textWidth) || !Number.isFinite(visibleWidth)) {
    return null;
  }

  const distance = Math.ceil(textWidth - visibleWidth);

  if (distance <= 0) return null;

  return {
    distance,
    duration: Math.max(minDuration, distance / speed),
  };
}
