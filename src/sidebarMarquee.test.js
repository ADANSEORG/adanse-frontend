import { test } from "node:test";
import assert from "node:assert/strict";

import {
  MARQUEE_MIN_DURATION_SECONDS,
  MARQUEE_SPEED_PX_PER_SECOND,
  marqueeShift,
} from "./sidebarMarquee.js";

test("a title that fits stays static", () => {
  assert.equal(marqueeShift(120, 180), null);
  assert.equal(marqueeShift(180, 180), null); // exactly fits
});

test("a title wider than its container slides by exactly its overflow", () => {
  assert.equal(marqueeShift(400, 180).distance, 220);
});

test("sub-pixel overflow is rounded up so the last pixel is reachable", () => {
  assert.equal(marqueeShift(180.4, 180).distance, 1);
});

test("speed is constant at about 40px per second", () => {
  assert.equal(MARQUEE_SPEED_PX_PER_SECOND, 40);
  assert.equal(marqueeShift(500, 180).duration, 320 / 40); // 8s
  assert.equal(marqueeShift(820, 180).duration, 640 / 40); // 16s: longer = longer
});

test("short overflows get the 1.5s minimum, not a twitch", () => {
  assert.equal(MARQUEE_MIN_DURATION_SECONDS, 1.5);
  assert.equal(marqueeShift(200, 180).duration, 1.5); // 20px would be 0.5s
});

test("the speed and floor can be overridden", () => {
  assert.equal(marqueeShift(380, 180, { speed: 100 }).duration, 2);
  assert.equal(marqueeShift(200, 180, { minDuration: 3 }).duration, 3);
});

test("unmeasurable widths are treated as no overflow", () => {
  assert.equal(marqueeShift(undefined, 180), null);
  assert.equal(marqueeShift(NaN, 180), null);
  assert.equal(marqueeShift(300, null), null);
});
