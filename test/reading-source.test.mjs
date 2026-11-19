import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
	createTextSurface,
	resolveReadingRegions,
	findRenderedBlock,
} = require("../src/reading/source.js");
const { listCodeBlocks } = require("../src/editor/blocks.js");

test("文本替身能换算行号与偏移", () => {
	const surface = createTextSurface("a\nbb\nccc");
	assert.equal(surface.getValue(), "a\nbb\nccc");
	assert.equal(surface.lineCount(), 3);
	assert.equal(surface.getLine(1), "bb");
	assert.equal(surface.posToOffset({ line: 1, ch: 2 }), 4);
	assert.deepEqual(surface.offsetToPos(4), { line: 1, ch: 2 });
	assert.deepEqual(surface.offsetToPos(0), { line: 0, ch: 0 });
});

test("精确匹配时给出块序号和块内偏移", () => {
	const doc = ["前言", "```text", "Cull 选项[back/Front]", "```"].join("\n");
	const surface = createTextSurface(doc);
	const blocks = listCodeBlocks(surface);
	const records = [
		{
			id: "a",
			expression: "选项[back/Front]",
			occurrence: 0,
			anchor: { label: "选项", language: "text", blockIndex: 0, lineHint: 2, prefix: "Cull ", suffix: "" },
		},
	];

	const regions = resolveReadingRegions(surface, blocks, records);
	assert.equal(regions.length, 1);
	assert.equal(regions[0].blockIndex, 0);
	assert.equal(regions[0].localFrom, 5);
	assert.equal(regions[0].expression, "选项[back/Front]");
	assert.equal(regions[0].label, "选项");
	assert.equal(regions[0].displayMode, "standard");

	const block = blocks[0];
	const content = doc.slice(block.contentFrom, block.contentTo);
	assert.equal(content.slice(5, 5 + "选项[back/Front]".length), "选项[back/Front]");
});

test("正文被改动后仍能靠锚点定位到新内容", () => {
	const doc = ["```text", "Cull 选项[back/Front/Off]", "```"].join("\n");
	const surface = createTextSurface(doc);
	const blocks = listCodeBlocks(surface);
	const records = [
		{
			id: "a",
			expression: "选项[back/Front]",
			occurrence: 0,
			anchor: { label: "选项", language: "text", blockIndex: 0, lineHint: 1, prefix: "Cull ", suffix: "" },
		},
	];

	const regions = resolveReadingRegions(surface, blocks, records);
	assert.equal(regions.length, 1);
	assert.equal(regions[0].expression, "选项[back/Front/Off]");
	assert.equal(regions[0].length, "选项[back/Front/Off]".length);
});

test("锚点无法区分时不硬折", () => {
	const doc = ["```text", "参数[a]", "```", "```text", "参数[a]", "```"].join("\n");
	const surface = createTextSurface(doc);
	const blocks = listCodeBlocks(surface);
	const records = [
		{
			id: "a",
			expression: "参数[a]",
			occurrence: 0,
			anchor: { label: "参数", language: "text", blockIndex: -1, lineHint: null, prefix: "", suffix: "" },
		},
	];

	assert.deepEqual(resolveReadingRegions(surface, blocks, records), []);
});

test("编辑视图展开过的记录不参与阅读视图折叠", () => {
	const doc = ["```text", "参数[a]", "```"].join("\n");
	const surface = createTextSurface(doc);
	const blocks = listCodeBlocks(surface);
	const records = [
		{
			id: "a",
			expression: "参数[a]",
			occurrence: 0,
			expanded: true,
			anchor: { label: "参数", language: "text", blockIndex: 0, lineHint: 1, prefix: "", suffix: "" },
		},
	];

	assert.deepEqual(resolveReadingRegions(surface, blocks, records), []);
});

test("渲染文本能对回源码里的代码块", () => {
	const doc = ["标题", "```js", "Cull Back", "```"].join("\n");
	const surface = createTextSurface(doc);
	const blocks = listCodeBlocks(surface);

	assert.equal(findRenderedBlock(blocks, doc, "Cull Back\n")?.index, 0);
	assert.equal(findRenderedBlock(blocks, doc, "Cull Back")?.index, 0);
	assert.equal(findRenderedBlock(blocks, doc, "Cull Front"), null);
	assert.equal(findRenderedBlock(blocks, doc, ""), null);
});
