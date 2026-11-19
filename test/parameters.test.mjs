import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createFakeEditor } from "./helpers/fake-editor.mjs";

const require = createRequire(import.meta.url);
const { parseParameterOptions, serializeParameterOptions } = require("../src/format/parameters.js");
const { listCodeBlocks, findBlockForRange, findContainingCodeBlock } = require("../src/editor/blocks.js");

test("选项序列化后能被解析回来", () => {
	const expression = serializeParameterOptions("混合模式", [
		{ value: "Normal", comment: "正常混合" },
		{ value: "Add", comment: "" },
	]);
	assert.equal(expression, "混合模式[\n  Normal//正常混合_\n  Add\n]");
	assert.deepEqual(parseParameterOptions(expression), [
		{ value: "Normal", comment: "正常混合" },
		{ value: "Add", comment: "" },
	]);
});

test("名称或选项含禁用字符时拒绝序列化", () => {
	assert.throws(() => serializeParameterOptions("a_b", [{ value: "x", comment: "" }]), /参数名称/);
	assert.throws(() => serializeParameterOptions("名称", [{ value: "x_y", comment: "" }]), /选项不能/);
	assert.throws(() => serializeParameterOptions("名称", [{ value: "x", comment: "有[括号]" }]), /注释不能/);
	assert.throws(() => serializeParameterOptions("名称", []), /至少添加一个选项/);
});

test("不是合法表达式的文本解析为空列表", () => {
	assert.deepEqual(parseParameterOptions("没有方括号"), []);
	assert.deepEqual(parseParameterOptions("A[未闭合"), []);
});

test("代码块扫描包含语言、序号与内容区间", () => {
	const text = [
		"前言",
		"```js",
		"Cull Back",
		"```",
		"中间",
		"~~~",
		"ZWrite On",
		"~~~",
	].join("\n");
	const editor = createFakeEditor(text);
	const blocks = listCodeBlocks(editor);

	assert.equal(blocks.length, 2);
	assert.equal(blocks[0].language, "js");
	assert.equal(blocks[1].language, "");
	assert.equal(text.slice(blocks[0].contentFrom, blocks[0].contentTo), "Cull Back\n");
	assert.equal(text.slice(blocks[1].contentFrom, blocks[1].contentTo), "ZWrite On\n");

	const offset = text.indexOf("ZWrite");
	assert.equal(findBlockForRange(blocks, offset, offset + 6)?.index, 1);
	assert.equal(findBlockForRange(blocks, 0, 2), null);
	assert.equal(findContainingCodeBlock(editor, 2, 2)?.line, 1);
});

test("未闭合的代码块一直延伸到文档末尾", () => {
	const text = ["```", "没有结束围栏"].join("\n");
	const blocks = listCodeBlocks(createFakeEditor(text));
	assert.equal(blocks.length, 1);
	assert.equal(blocks[0].contentTo, text.length);
});
