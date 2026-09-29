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

// The text of every `@media <media> { ... }` block, found by matching braces so
// a search can never run past a block's end into the rules after it.
function mediaBlocks(media) {
  const blocks = [];
  const head = `@media ${media}`;
  let at = css.indexOf(head);
  while (at !== -1) {
    const open = css.indexOf("{", at);
    let depth = 1;
    let i = open + 1;
    while (depth && i < css.length) {
      if (css[i] === "{") depth++;
      if (css[i] === "}") depth--;
      i++;
    }
    blocks.push(css.slice(open + 1, i - 1));
    at = css.indexOf(head, i);
  }
  return blocks;
}

// The body of the first rule whose selector list is exactly `selectors`,
// either at the top level or inside a `media` block.
function body(selectors, media = null) {
  const list = selectors.map((s) => s.replace(/[.*+?^${}()|[\]\\>]/g, "\\$&")).join(" ?, ?");
  const pattern = new RegExp(`(?:^|[{}]) ?${list} ?\\{([^}]*)\\}`);
  for (const text of media ? mediaBlocks(media) : [css]) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return null;
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

test("on phones every footer bar stacks its text above a full-width action", () => {
  const bar = body([".analysis-action-bar"], "(max-width: 650px)");
  assert.match(bar ?? "", /flex-direction: column/);
  assert.match(bar, /align-items: stretch/);
  // Not scoped to one screen: the analysis and qualitative footers squeezed too.
  assert.doesNotMatch(css, /\.analysis-action-bar\.dataset-review-actions/);
});

test("on phones a credit-priced action stretches, with its cost note under it", () => {
  assert.match(body([".analysis-action-bar .credit-action"], "(max-width: 650px)") ?? "", /align-items: stretch/);
  const notice = body([".analysis-action-bar .credit-action-notice"], "(max-width: 650px)");
  assert.match(notice ?? "", /max-width: 100%/);
  assert.match(notice, /text-align: left/);
});

test("both rows that open a confirmation carry the wrapping class", () => {
  assert.match(screen, /"dataset-variable-row personal-data-row"/);
  assert.match(screen, /"dataset-variable-row clean rating-reverse-row"/);
});
