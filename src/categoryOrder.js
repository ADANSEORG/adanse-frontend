/*
 * Pure logic for the manual category-order control on the dataset
 * review step (DatasetReview.jsx's CategoryOrderControl) -- kept
 * decoupled from React state so it's directly testable under plain
 * node:test, the same pattern analysisOverride.js uses. The actual
 * network call lives in api.js (saveCategoryOrder/clearCategoryOrder);
 * this module only decides which columns get the control, how the
 * up/down reordering behaves, and whether a given order is valid/save-
 * able.
 *
 * Display only: this never changes analysis results, only how Chapter 4
 * orders a column's categories the next time it's generated.
 */

export const MIN_CATEGORIES_FOR_ORDER_CONTROL = 2;
export const MAX_CATEGORIES_FOR_ORDER_CONTROL = 12;
// Matches the server-side cap (save_category_order() in thesis.py) --
// kept here too so the client never even offers to submit something the
// server would reject.
export const MAX_SAVED_ORDER_LENGTH = 20;

/*
 * True for a categorical column whose distinct-value count is in the
 * compact, easy-to-reorder-by-hand range this control is meant for.
 * profile_columns() only ever records distinct_values for a categorical
 * column at all when it has at most 20 unique values, so a column above
 * that already has no distinct_values list and is excluded here too.
 */
export function isOrderableColumn(column) {
  if (!column || column.semantic_type !== "categorical") return false;
  const values = column.distinct_values;
  if (!Array.isArray(values)) return false;
  return (
    values.length >= MIN_CATEGORIES_FOR_ORDER_CONTROL &&
    values.length <= MAX_CATEGORIES_FOR_ORDER_CONTROL
  );
}

/* Every categorical column from a dataset version's profile that
 * qualifies for the control, in profile order. */
export function orderableColumns(profile) {
  return (profile || []).filter(isOrderableColumn);
}

/*
 * Swap `index` with the item before it. No-op (returns the same array
 * reference) at the top of the list or for an out-of-range index, so a
 * caller can always call this unconditionally from a button handler
 * without its own bounds check.
 */
export function moveUp(order, index) {
  if (!Array.isArray(order) || index <= 0 || index >= order.length) {
    return order;
  }
  const next = order.slice();
  [next[index - 1], next[index]] = [next[index], next[index - 1]];
  return next;
}

/* Swap `index` with the item after it; a no-op at the bottom of the list. */
export function moveDown(order, index) {
  if (!Array.isArray(order) || index < 0 || index >= order.length - 1) {
    return order;
  }
  const next = order.slice();
  [next[index], next[index + 1]] = [next[index + 1], next[index]];
  return next;
}

/*
 * The same permutation rule the server enforces (save_category_order()
 * in thesis.py): `order` must contain each of `distinctValues` exactly
 * once, no more, no fewer, none invented, and no more than
 * MAX_SAVED_ORDER_LENGTH entries. Checked client-side so the Save
 * button can simply stay disabled rather than round-tripping an order
 * the server would reject anyway.
 */
export function isValidOrder(order, distinctValues) {
  if (!Array.isArray(order) || !Array.isArray(distinctValues)) return false;
  if (order.length === 0 || order.length !== distinctValues.length) return false;
  if (order.length > MAX_SAVED_ORDER_LENGTH) return false;

  const orderSet = new Set(order);
  if (orderSet.size !== order.length) return false; // a duplicate entry

  const distinctSet = new Set(distinctValues);
  if (distinctSet.size !== distinctValues.length) return false; // malformed input
  if (orderSet.size !== distinctSet.size) return false;

  for (const value of order) {
    if (!distinctSet.has(value)) return false; // an invented value
  }
  return true;
}

/*
 * True once the in-progress order actually differs from what's saved
 * (or, with no saved order yet, from the dataset's own default order) --
 * used to decide whether the Save button should be enabled at all, so a
 * no-op reordering (up then back down) doesn't submit a request.
 */
export function orderHasChanged(currentOrder, baselineOrder) {
  if (!Array.isArray(currentOrder) || !Array.isArray(baselineOrder)) return false;
  if (currentOrder.length !== baselineOrder.length) return true;
  return currentOrder.some((value, index) => value !== baselineOrder[index]);
}

/* "Automatic order" vs "Custom order" label for the compact summary row. */
export function orderStatusLabel(savedOrder) {
  return Array.isArray(savedOrder) && savedOrder.length > 0
    ? "Custom order"
    : "Automatic order";
}
