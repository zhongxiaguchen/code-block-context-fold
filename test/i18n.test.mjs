import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { MESSAGES } = require("../src/i18n/strings.js");
const { t, setLanguage, detectLanguage } = require("../src/i18n/index.js");

const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

test("中英词表的 key 完全一致", () => {
	const en = Object.keys(MESSAGES.en).sort();
	const zh = Object.keys(MESSAGES.zh).sort();
	const missingInZh = en.filter((key) => !zh.includes(key));
	const missingInEn = zh.filter((key) => !en.includes(key));
	assert.deepEqual(missingInZh, [], `中文缺少：${missingInZh.join(", ")}`);
	assert.deepEqual(missingInEn, [], `英文缺少：${missingInEn.join(", ")}`);
});

test("没有空文案", () => {
	for (const [language, table] of Object.entries(MESSAGES)) {
		for (const [key, value] of Object.entries(table)) {
			assert.equal(typeof value, "string", `${language}/${key} 不是字符串`);
			assert.ok(value.trim().length > 0, `${language}/${key} 是空文案`);
		}
	}
});

test("同一个 key 在中英两侧的占位符一致", () => {
	for (const key of Object.keys(MESSAGES.en)) {
		assert.deepEqual(
			placeholders(MESSAGES.en[key]),
			placeholders(MESSAGES.zh[key]),
			`${key} 的占位符不一致`,
		);
	}
});

test("插值会替换占位符，缺变量时保留原样", () => {
	setLanguage("zh");
	assert.equal(t("a11y.toggle", { label: "选项" }), "选项：点击展开或收起");
	assert.equal(t("overview.summary", { notes: 2, count: 5 }), "2 篇笔记，共 5 处折叠");
	assert.equal(t("a11y.toggle", {}), "{label}：点击展开或收起");
});

test("未知 key 原样返回，不会抛错", () => {
	setLanguage("en");
	assert.equal(t("no.such.key"), "no.such.key");
});

test("setLanguage 在两种语言间切换", () => {
	setLanguage("en");
	assert.equal(t("overview.empty"), "No folds yet.");
	setLanguage("zh");
	assert.equal(t("overview.empty"), "还没有任何折叠。");
	setLanguage("en");
});

test("detectLanguage 识别 zh 变体，其余退回英文", () => {
	const original = globalThis.window;
	try {
		globalThis.window = { localStorage: { getItem: () => "zh-CN" } };
		assert.equal(detectLanguage(), "zh");

		globalThis.window = { localStorage: { getItem: () => "zh-TW" } };
		assert.equal(detectLanguage(), "zh");

		globalThis.window = { localStorage: { getItem: () => "en" } };
		assert.equal(detectLanguage(), "en");

		globalThis.window = { localStorage: { getItem: () => "ja" } };
		assert.equal(detectLanguage(), "en");

		globalThis.window = { localStorage: { getItem: () => null } };
		assert.equal(detectLanguage(), "en");

		globalThis.window = {
			localStorage: {
				getItem: () => {
					throw new Error("blocked");
				},
			},
		};
		assert.equal(detectLanguage(), "en");
	} finally {
		if (original === undefined) delete globalThis.window;
		else globalThis.window = original;
		setLanguage("en");
	}
});
