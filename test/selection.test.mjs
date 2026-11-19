import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createFakeEditor } from "./helpers/fake-editor.mjs";

const require = createRequire(import.meta.url);
const { parseSelectedParameter } = require("../src/editor/selection.js");
const { listCodeBlocks } = require("../src/editor/blocks.js");
const { selectRecordCandidate } = require("../src/editor/recover.js");

const DOC = [
	"标题",
	"```text",
	"Cull 选项[back/Front]",
	"ZWrite 选项[On/Off]",
	"```",
].join("\n");

test("代码块内的完整选区能解析成四个偏移量", () => {
	const start = DOC.indexOf("选项[back");
	const end = start + "选项[back/Front]".length;
	const editor = createFakeEditor(DOC, { from: start, to: end });
	const parsed = parseSelectedParameter(editor);

	assert.ok(parsed);
	assert.equal(parsed.label, "选项");
	assert.equal(parsed.expression, "选项[back/Front]");
	assert.equal(DOC.slice(parsed.labelFrom, parsed.labelTo), "选项");
	assert.equal(DOC.slice(parsed.bracketFrom, parsed.bracketTo), "[back/Front]");
});

test("代码块之外的选区不会被接受", () => {
	const editor = createFakeEditor("标题 参数[a]", { from: 3, to: 11 });
	assert.equal(parseSelectedParameter(editor), null);
});

test("方括号不配平或没有标签时返回 null", () => {
	const editor = createFakeEditor(DOC, {
		from: DOC.indexOf("[back"),
		to: DOC.indexOf("[back") + 5,
	});
	assert.equal(parseSelectedParameter(editor), null);

	const noLabel = createFakeEditor(DOC, { from: DOC.indexOf("["), to: DOC.indexOf("]") + 1 });
	assert.equal(parseSelectedParameter(noLabel), null);
});

test("完全相同的表达式在锚点足够强时能区分出现次数", () => {
	const text = [
		"```text",
		"参数[a]",
		"```",
		"中间段落",
		"```text",
		"参数[a]",
		"```",
	].join("\n");
	const editor = createFakeEditor(text);
	const blocks = listCodeBlocks(editor);
	const secondOffset = text.lastIndexOf("参数[a]");

	const record = {
		expression: "参数[a]",
		occurrence: 1,
		anchor: {
			label: "参数",
			language: "text",
			blockIndex: 1,
			lineHint: 5,
			prefix: "中间段落",
			suffix: "",
		},
	};
	const match = selectRecordCandidate(editor, record, blocks);
	assert.equal(match.position, secondOffset);
});

test("锚点无法区分时宁可放弃", () => {
	const text = ["```text", "参数[a]", "```", "```text", "参数[a]", "```"].join("\n");
	const editor = createFakeEditor(text);
	const blocks = listCodeBlocks(editor);
	const record = {
		expression: "参数[a]",
		occurrence: 0,
		anchor: { label: "参数", language: "text", blockIndex: -1, lineHint: null, prefix: "", suffix: "" },
	};
	assert.equal(selectRecordCandidate(editor, record, blocks), null);
});

test("内容改动后靠标签回退定位，锚点太弱则放弃", () => {
	const text = ["```text", "参数[新值]", "```"].join("\n");
	const editor = createFakeEditor(text);
	const blocks = listCodeBlocks(editor);

	const strong = {
		expression: "参数[旧值]",
		occurrence: 0,
		anchor: { label: "参数", language: "text", blockIndex: 1, lineHint: 1, prefix: "", suffix: "" },
	};
	assert.equal(selectRecordCandidate(editor, strong, blocks)?.expression, "参数[新值]");

	const weak = {
		expression: "参数[旧值]",
		occurrence: 0,
		anchor: { label: "参数", language: "", blockIndex: -1, lineHint: null, prefix: "", suffix: "" },
	};
	assert.equal(selectRecordCandidate(editor, weak, blocks), null);
});
