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
	assert.equal(expression, "混合模式[\n  Normal//正常混合\n  Add\n]");
	assert.deepEqual(parseParameterOptions(expression), [
		{ value: "Normal", comment: "正常混合" },
		{ value: "Add", comment: "" },
	]);
});

test("下划线不再需要转义，可以出现在值、注释和名称里", () => {
	const expression = serializeParameterOptions("_MainTex_ST", [
		{ value: "UNITY_OBJECT_TO_WORLD", comment: "需要 _MainTex 的缩放" },
	]);
	assert.match(expression, /^_MainTex_ST\[/);
	assert.deepEqual(parseParameterOptions(expression), [
		{ value: "UNITY_OBJECT_TO_WORLD", comment: "需要 _MainTex 的缩放" },
	]);
});

test("注释里的换行会被压成一行", () => {
	const expression = serializeParameterOptions("模式", [
		{ value: "A", comment: "第一行\n第二行" },
	]);
	assert.equal(expression, "模式[\n  A//第一行 第二行\n]");
});

test("方括号与 // 仍然受限制", () => {
	assert.throws(() => serializeParameterOptions("a[b", [{ value: "x", comment: "" }]), /方括号/);
	assert.throws(() => serializeParameterOptions("名称", [{ value: "x]y", comment: "" }]), /方括号/);
	assert.throws(() => serializeParameterOptions("名称", [{ value: "a//b", comment: "" }]), /\/\//);
	assert.throws(() => serializeParameterOptions("名称", [{ value: "x", comment: "[注]" }]), /方括号/);
	assert.throws(() => serializeParameterOptions("名称", []), /至少添加一个选项/);
	assert.throws(() => serializeParameterOptions("  ", [{ value: "x", comment: "" }]), /参数名称/);
});

test("不是合法表达式的文本解析为空列表", () => {
	assert.deepEqual(parseParameterOptions("没有方括号"), []);
	assert.deepEqual(parseParameterOptions("A[未闭合"), []);
});

test("空行被忽略，行内多余空白被去掉", () => {
	assert.deepEqual(parseParameterOptions("A[\n\n   x  //  说明  \n\n  y\n]"), [
		{ value: "x", comment: "说明" },
		{ value: "y", comment: "" },
	]);
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
