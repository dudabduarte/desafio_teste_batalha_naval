import test from "node:test";
import { BATTLESHIP_TESTS } from "../src/test-cases.js";

for (const testCase of BATTLESHIP_TESTS) {
  test(testCase.title, () => testCase.run());
}
