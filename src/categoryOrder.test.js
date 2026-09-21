import { test } from "node:test";
import assert from "node:assert/strict";

import {
  MAX_SAVED_ORDER_LENGTH,
  isOrderableColumn,
  orderableColumns,
  moveUp,
  moveDown,
  isValidOrder,
  orderHasChanged,
  orderStatusLabel,
} from "./categoryOrder.js";

test("isOrderableColumn accepts a categorical column with 2-12 distinct values", () => {
  assert.equal(
    isOrderableColumn({ semantic_type: "categorical", distinct_values: ["Low", "High"] }),
    true
  );
  assert.equal(
    isOrderableColumn({
      semantic_type: "categorical",
      distinct_values: Array.from({ length: 12 }, (_, i) => `cat${i}`),
    }),
    true
  );
});

test("isOrderableColumn rejects a non-categorical column", () => {
  assert.equal(
    isOrderableColumn({ semantic_type: "numeric", distinct_values: ["1", "2"] }),
    false
  );
});

test("isOrderableColumn rejects a single-category column", () => {
  assert.equal(
    isOrderableColumn({ semantic_type: "categorical", distinct_values: ["Only"] }),
    false
  );
});

test("isOrderableColumn rejects a column with more than 12 categories", () => {
  assert.equal(
    isOrderableColumn({
      semantic_type: "categorical",
      distinct_values: Array.from({ length: 13 }, (_, i) => `cat${i}`),
    }),
    false
  );
});

test("isOrderableColumn rejects a column with no recorded distinct_values", () => {
  // profile_columns() omits distinct_values above its own 20-category cap.
  assert.equal(isOrderableColumn({ semantic_type: "categorical" }), false);
  assert.equal(
    isOrderableColumn({ semantic_type: "categorical", distinct_values: null }),
    false
  );
});

test("orderableColumns filters a full profile down to the orderable categorical columns", () => {
  const profile = [
    { name: "gender", semantic_type: "categorical", distinct_values: ["Male", "Female"] },
    { name: "cgpa", semantic_type: "numeric" },
    { name: "respondent_id", semantic_type: "categorical" }, // no distinct_values (too many)
    {
      name: "performance_category",
      semantic_type: "categorical",
      distinct_values: ["Low", "Medium", "High"],
    },
  ];
  assert.deepEqual(
    orderableColumns(profile).map((c) => c.name),
    ["gender", "performance_category"]
  );
});

test("orderableColumns handles a missing/empty profile without throwing", () => {
  assert.deepEqual(orderableColumns(undefined), []);
  assert.deepEqual(orderableColumns([]), []);
});

test("moveUp swaps an item with its predecessor", () => {
  assert.deepEqual(moveUp(["Low", "Medium", "High"], 1), ["Medium", "Low", "High"]);
  assert.deepEqual(moveUp(["Low", "Medium", "High"], 2), ["Low", "High", "Medium"]);
});

test("moveUp is a no-op at the top of the list", () => {
  const order = ["Low", "Medium", "High"];
  assert.deepEqual(moveUp(order, 0), order);
});

test("moveDown swaps an item with its successor", () => {
  assert.deepEqual(moveDown(["Low", "Medium", "High"], 0), ["Medium", "Low", "High"]);
});

test("moveDown is a no-op at the bottom of the list", () => {
  const order = ["Low", "Medium", "High"];
  assert.deepEqual(moveDown(order, 2), order);
});

test("moveUp/moveDown handle an out-of-range index without throwing", () => {
  const order = ["Low", "Medium", "High"];
  assert.deepEqual(moveUp(order, 99), order);
  assert.deepEqual(moveDown(order, -1), order);
});

test("isValidOrder accepts an exact permutation of the distinct values", () => {
  assert.equal(isValidOrder(["High", "Low", "Medium"], ["Low", "Medium", "High"]), true);
});

test("isValidOrder rejects a missing value", () => {
  assert.equal(isValidOrder(["High", "Low"], ["Low", "Medium", "High"]), false);
});

test("isValidOrder rejects an invented value", () => {
  assert.equal(
    isValidOrder(["Low", "Medium", "Very High"], ["Low", "Medium", "High"]),
    false
  );
});

test("isValidOrder rejects a duplicated value", () => {
  assert.equal(isValidOrder(["Low", "Low", "High"], ["Low", "Medium", "High"]), false);
});

test("isValidOrder rejects more than the server's max category count", () => {
  const big = Array.from({ length: MAX_SAVED_ORDER_LENGTH + 1 }, (_, i) => `cat${i}`);
  assert.equal(isValidOrder(big, big), false);
});

test("isValidOrder rejects non-array input without throwing", () => {
  assert.equal(isValidOrder(null, ["Low", "High"]), false);
  assert.equal(isValidOrder(["Low", "High"], null), false);
});

test("orderHasChanged detects a rearrangement", () => {
  assert.equal(orderHasChanged(["High", "Low", "Medium"], ["Low", "Medium", "High"]), true);
});

test("orderHasChanged is false for an identical order", () => {
  assert.equal(orderHasChanged(["Low", "Medium", "High"], ["Low", "Medium", "High"]), false);
});

test("orderHasChanged is true when the lengths differ", () => {
  assert.equal(orderHasChanged(["Low", "Medium"], ["Low", "Medium", "High"]), true);
});

test("orderStatusLabel reflects whether a custom order is saved", () => {
  assert.equal(orderStatusLabel(["High", "Low", "Medium"]), "Custom order");
  assert.equal(orderStatusLabel(undefined), "Automatic order");
  assert.equal(orderStatusLabel([]), "Automatic order");
});
