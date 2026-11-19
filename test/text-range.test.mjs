import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { locateRange } = require("../src/editor/text-range.js");

test("区间落在同一个节点内", () => {
	assert.deepEqual(locateRange([10], 2, 6), {
		startIndex: 0,
		startOffset: 2,
		endIndex: 0,
		endOffset: 6,
	});
});

test("区间跨两个节点", () => {
	assert.deepEqual(locateRange([5, 5], 2, 7), {
		startIndex: 0,
		startOffset: 2,
		endIndex: 1,
		endOffset: 2,
	});
});

test("结束后正好落在节点边界时归属前一个节点", () => {
	assert.deepEqual(locateRange([5, 5], 0, 5), {
		startIndex: 0,
		startOffset: 0,
		endIndex: 0,
		endOffset: 5,
	});
});

test("起点落在节点边界时归属后一个节点", () => {
	assert.deepEqual(locateRange([5, 5], 5, 8), {
		startIndex: 1,
		startOffset: 0,
		endIndex: 1,
		endOffset: 3,
	});
});

test("跨多个节点时只报告起止", () => {
	assert.deepEqual(locateRange([3, 3, 3, 3], 1, 11), {
		startIndex: 0,
		startOffset: 1,
		endIndex: 3,
		endOffset: 2,
	});
});

test("空区间、越界和空节点列表都返回 null", () => {
	assert.equal(locateRange([5], 3, 3), null);
	assert.equal(locateRange([5], 4, 99), null);
	assert.equal(locateRange([5], 10, 12), null);
	assert.equal(locateRange([], 0, 1), null);
	assert.equal(locateRange([5], -1, 2), null);
});

test("长度为 0 的文本节点被跳过", () => {
	assert.deepEqual(locateRange([0, 4, 0, 4], 4, 6), {
		startIndex: 3,
		startOffset: 0,
		endIndex: 3,
		endOffset: 2,
	});
});
