// Guards the review screen's confirmation and footer layout in styles.css.
// Structural checks of the stylesheet, not a rendering: they pin down what was
// verified in a browser at desktop and phone width. The rows are FLEX rows, so a
// confirmation only gets a line of its own under the row if the row wraps and
// the confirmation takes the full width (`grid-column` did nothing there, which
// left the Include-anyway confirmation squeezed in beside the column's name).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\s+/g, " ");
const screen = readFileSync(new URL("./components/DatasetReview.jsx", import.meta.url), "utf8");

// The body of the first rule whose selector list is exactly `selectors`,
// optionally inside `media`.
function body(selectors, media = null) {
  const list = selectors.map((s) => s.replace(/[.*+?^${}()|[\]\\>]/g, "\\$&")).join(" ?, ?");
  const rule = `${list} ?\\{([^}]*)\\}`;
  const pattern = media
    ? new RegExp(`@media ${media.replace(/[()]/g, "\\$&")} ?\\{[^@]*?${rule}`)
    : new RegExp(`(?:^|\\}) ?${rule}`);
  const match = css.match(pattern);
  return match ? match[1] : null;
}

test("rows that open a confirmation wrap, so it can go under them", () => {
  assert.match(body([".personal-data-row", ".rating-reverse-row"]) ?? "", /flex-wrap: wrap/);
});

test("the confirmation takes a full line of its own, as a flex item", () => {
  const confirm = body([".personal-data-confirm"]);
  assert.match(confirm ?? "", /flex: 1 1 100%/);
  assert.doesNotMatch(confirm, /grid-column/, "the rows are flex rows: grid-column does nothing");
});

test("on wider screens the row's main column grows from zero, so the status stays beside it", () => {
  const main = body(
    [".personal-data-row > .dataset-variable-main", ".rating-reverse-row > .dataset-variable-main"],
    "(min-width: 651px)"
  );
  assert.match(main ?? "", /flex: 1 1 0/);
});

test("on phones the review screen's footer stacks its text above the buttons", () => {
  const bar = body([".analysis-action-bar.dataset-review-actions"], "(max-width: 650px)");
  assert.match(bar ?? "", /flex-direction: column/);
  assert.match(bar, /align-items: stretch/);
  assert.match(screen, /className="analysis-action-bar dataset-review-actions"/);
});

test("both rows that open a confirmation carry the wrapping class", () => {
  assert.match(screen, /"dataset-variable-row personal-data-row"/);
  assert.match(screen, /"dataset-variable-row clean rating-reverse-row"/);
});
