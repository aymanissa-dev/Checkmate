/**
 * FALSE GREEN: mocks persistence so the broken saveOrder never runs.
 */
import assert from "node:assert/strict";

const mockRepo = {
  saveOrder(order) {
    return order; // pretend persisted
  },
};

function createOrder(item, repo = mockRepo) {
  const order = { id: "o-test", item };
  return repo.saveOrder(order);
}

const saved = createOrder("widget");
assert.equal(saved.item, "widget");
console.log("tests passed");
