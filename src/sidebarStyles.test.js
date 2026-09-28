// Guards the sidebar row's layout rules in styles.css. These are structural
// checks of the stylesheet, not a rendering: they pin down the decisions that
// were verified in a browser (title runs the full row width, short right-edge
// fade, pin/delete overlaid and inert until hover / selected / focus) so a later
// edit cannot quietly bring back the invisible buttons that squeezed the title
// to half the row, or leave them clickable over the end of it.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "");

// Leaf rules as { media, selectors[], decls{} }, in file order.
function parseRules(text) {
  const rules = [];
  let i = 0;
  function block(media) {
    while (i < text.length) {
      const open = text.indexOf("{", i);
      const close = text.indexOf("}", i);
      if (close !== -1 && (open === -1 || close < open)) { i = close + 1; return; }
      if (open === -1) return;
      const head = text.slice(i, open).trim();
      i = open + 1;
      if (head.startsWith("@media")) { block(head.replace(/\s+/g, " ")); continue; }
      if (head.startsWith("@")) {
        // @property: read the body as declarations. @keyframes and the like are skipped.
        const end = text.indexOf("}", i);
        const body = text.slice(i, end);
        if (head.startsWith("@property")) rules.push({ media, selectors: [head], decls: declarations(body) });
        i = head.startsWith("@keyframes") ? skipBlock(end) : end + 1;
        continue;
      }
      const end = text.indexOf("}", i);
      rules.push({ media, selectors: head.split(",").map((s) => s.replace(/\s+/g, " ").trim()), decls: declarations(text.slice(i, end)) });
      i = end + 1;
    }
  }
  function skipBlock(pos) { let depth = 1; let p = pos; while (depth && p < text.length) { p++; if (text[p] === "{") depth++; if (text[p] === "}") depth--; } return p + 1; }
  block(null);
  return rules;
}

function declarations(body) {
  const out = {};
  for (const part of body.split(";")) {
    const at = part.indexOf(":");
    if (at > 0) out[part.slice(0, at).trim()] = part.slice(at + 1).trim().replace(/\s+/g, " ");
  }
  return out;
}

const rules = parseRules(css);

// All declarations that apply to exactly this selector, in one place (no media query).
function base(selector) {
  return Object.assign({}, ...rules.filter((r) => !r.media && r.selectors.includes(selector)).map((r) => r.decls));
}
const findRule = (selector, media = null) => rules.find((r) => r.media === media && r.selectors.includes(selector));
const px = (v) => Number.parseFloat(v);

const ICONS = ["pin", "delete"].map((n) => `.sidebar-item-${n}`);

test("the row is the positioning context for the overlaid icons", () => {
  const row = base(".sidebar-item");
  assert.equal(row.position, "relative");
  assert.match(row["--item-icons-w"], /^\d+px$/);
});

for (const icon of ICONS) {
  test(`${icon} is overlaid, out of the layout, and invisible and inert at rest`, () => {
    const d = base(icon);
    assert.equal(d.position, "absolute");
    assert.equal(d.opacity, "0");
    assert.equal(d["pointer-events"], "none");
    assert.equal(d["margin-right"], undefined, "no margin: nothing may be reserved beside it");
    assert.equal(d["flex-shrink"], undefined);
  });

  test(`${icon} appears and becomes clickable on hover, on the selected row, and on focus`, () => {
    for (const state of [":hover", ".active", ":focus-within"]) {
      const rule = findRule(`.sidebar-item${state} ${icon}`);
      assert.ok(rule, `missing .sidebar-item${state} ${icon}`);
      assert.equal(rule.decls.opacity, "1");
      assert.equal(rule.decls["pointer-events"], "auto");
    }
  });
}

test("the icons sit inside the strip the title window leaves for them", () => {
  const strip = px(base(".sidebar-item")["--item-icons-w"]);
  const pin = base(".sidebar-item-pin");
  const del = base(".sidebar-item-delete");
  assert.ok(px(pin.right) + px(pin.width) <= strip, "pin must fit inside --item-icons-w");
  assert.ok(px(del.right) + px(del.width) <= strip, "delete must fit inside --item-icons-w");
  assert.ok(px(pin.right) >= px(del.right) + px(del.width), "pin sits left of delete, not on top of it");
});

test("the title window runs to the row's right edge at rest and only leaves room while the icons show", () => {
  assert.match(base(".sidebar-item-button").padding, /^12px 0 12px 12px$/, "no right padding on the button");
  assert.equal(base(".sidebar-item-title-clip")["margin-right"], undefined, "nothing reserved at rest");

  const shown = rules.find((r) => !r.media && r.selectors.includes(".sidebar-item:hover .sidebar-item-title-clip"));
  assert.ok(shown);
  for (const state of [":hover", ".active", ":focus-within"]) {
    assert.ok(shown.selectors.includes(`.sidebar-item${state} .sidebar-item-title-clip`), `${state} must reserve the strip`);
  }
  assert.equal(shown.decls["margin-right"], "var(--item-icons-w)");
});

test("touch devices, which always show the pin, always reserve the strip and keep the pin clickable", () => {
  const touch = "@media (hover: none)";
  assert.equal(findRule(".sidebar-item-title-clip", touch).decls["margin-right"], "var(--item-icons-w)");
  const pin = findRule(".sidebar-item-pin", touch).decls;
  assert.equal(pin.opacity, "1");
  assert.equal(pin["pointer-events"], "auto");
});

test("the right-edge fade is short (24-32px) and done with mask-image", () => {
  const overflowing = base(".sidebar-item-title-clip.overflowing");
  const fade = px(overflowing["--marquee-fade-right"]);
  assert.ok(fade >= 24 && fade <= 32, `fade is ${fade}px`);
  const initial = px(findRule("@property --marquee-fade-right").decls["initial-value"]);
  assert.ok(initial >= 24 && initial <= 32, `initial fade is ${initial}px`);
  for (const prop of ["mask-image", "-webkit-mask-image"]) {
    assert.match(overflowing[prop], /linear-gradient\(\s*to right/);
    assert.match(overflowing[prop], /calc\(100% - var\(--marquee-fade-right\)\)/);
  }
});

test("the full-title tooltip is still set for titles that overflow", () => {
  const source = readFileSync(new URL("./components/ConversationSidebar.jsx", import.meta.url), "utf8");
  assert.match(source, /title=\{overflowing \? text : undefined\}/);
});
