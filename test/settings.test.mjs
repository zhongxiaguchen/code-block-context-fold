import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { normalizeSettings, DEFAULT_SETTINGS } = require("../src/settings/defaults.js");
const { buildOverview, labelOf, previewOf } = require("../src/settings/overview.js");

test("设置缺省时回落到默认值", () => {
	assert.deepEqual(normalizeSettings(undefined), {
		defaultDisplayMode: "standard",
		readingView: true,
	});
	assert.deepEqual(normalizeSettings(null), { ...DEFAULT_SETTINGS });
});

test("非法值被纠正，合法值被保留", () => {
	assert.equal(normalizeSettings({ defaultDisplayMode: "options" }).defaultDisplayMode, "options");
	assert.equal(normalizeSettings({ defaultDisplayMode: "乱填" }).defaultDisplayMode, "standard");
	assert.equal(normalizeSettings({ readingView: false }).readingView, false);
	assert.equal(normalizeSettings({ readingView: "false" }).readingView, true);
});

test("标签取锚点里的记录，缺失时从表达式推导", () => {
	assert.equal(labelOf({ anchor: { label: "选项" }, expression: "选项[a]" }), "选项");
	assert.equal(labelOf({ expression: "参数[a/b]" }), "参数");
});

test("预览取第一个选项，过长会截断", () => {
	assert.equal(previewOf({ expression: "参数[\n  a//注释\n  b\n]" }), "a//注释");
	assert.equal(previewOf({ expression: "参数[单行]" }), "单行");
	const long = "x".repeat(60);
	assert.equal(previewOf({ expression: `参数[${long}]` }).length, 43);
	assert.ok(previewOf({ expression: `参数[${long}]` }).endsWith("…"));
});

test("总览按笔记分组，失效记录单独列出", () => {
	const data = {
		foldsByFile: {
			"b.md": [
				{ id: "1", expression: "参数[a]", anchor: { label: "参数" }, displayMode: "options", expanded: true },
			],
			"a.md": [
				{ id: "2", expression: "选项[x]" },
				{ id: "3", expression: "选项[y]" },
			],
			"": [],
		},
	};
	const exists = (path) => path !== "gone.md";

	const overview = buildOverview(data, exists);
	assert.equal(overview.groups.length, 2);
	assert.deepEqual(overview.groups.map((group) => group.path), ["a.md", "b.md"]);
	assert.equal(overview.total, 3);
	assert.equal(overview.groups[1].records[0].displayMode, "options");
	assert.equal(overview.groups[1].records[0].expanded, true);
	assert.deepEqual(overview.stale, []);
});

test("笔记不存在时归入失效而不是普通分组", () => {
	const data = {
		foldsByFile: {
			"gone.md": [{ id: "1", expression: "参数[a]" }],
			"here.md": [{ id: "2", expression: "参数[b]" }],
		},
	};
	const overview = buildOverview(data, (path) => path === "here.md");
	assert.deepEqual(overview.groups.map((group) => group.path), ["here.md"]);
	assert.deepEqual(overview.stale, [{ path: "gone.md", count: 1 }]);
	assert.equal(overview.total, 1);
});

test("空数据不会抛错", () => {
	assert.deepEqual(buildOverview({}, () => true), { groups: [], stale: [], total: 0 });
	assert.deepEqual(buildOverview(undefined, () => true), { groups: [], stale: [], total: 0 });
});
