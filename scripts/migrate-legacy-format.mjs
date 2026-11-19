/**
 * 一次性迁移：把 2.x 的「_ 分隔」选项格式换成 3.0 的「一行一个选项」。
 *
 *   node scripts/migrate-legacy-format.mjs --vault "D:\某个库"
 *   node scripts/migrate-legacy-format.mjs --vault "D:\某个库" --apply
 *
 * 默认只预演（dry run），加 --apply 才写盘。写盘前会给每个被改动的笔记
 * 和 data.json 各留一份 .bak-<时间戳> 备份。
 *
 * 只处理确实使用过旧分隔符的表达式；手写的单行 `A[a/b/c]` 这类内容保持原样。
 * 顺手清掉指向已删除笔记的记录。
 */

import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const PLUGIN_ID = "code-block-context-fold";
const args = process.argv.slice(2);
const valueOf = (name) => {
	const index = args.indexOf(name);
	return index >= 0 ? args[index + 1] : undefined;
};

const vaultArg = valueOf("--vault");
if (!vaultArg) {
	process.stderr.write("用法：node scripts/migrate-legacy-format.mjs --vault \"<库路径>\" [--apply]\n");
	process.exit(1);
}

const apply = args.includes("--apply");
const vault = resolve(vaultArg);
const pluginDir = join(vault, ".obsidian", "plugins", PLUGIN_ID);
const dataPath = join(pluginDir, "data.json");

if (!existsSync(dataPath)) {
	process.stderr.write(`没有找到插件数据：${dataPath}\n`);
	process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const data = JSON.parse(readFileSync(dataPath, "utf8"));

/** 旧格式：`_` 分隔，可能有多行，也可能整段挤在一行里。 */
function parseLegacy(expression) {
	const from = expression.indexOf("[");
	if (from < 0 || !expression.endsWith("]")) return null;
	const content = expression.slice(from + 1, -1);
	if (!content.includes("_")) return null;

	const options = content
		.split("_")
		.map((part) => part.trim())
		.filter(Boolean)
		.map((part) => {
			const commentFrom = part.indexOf("//");
			const value = (commentFrom >= 0 ? part.slice(0, commentFrom) : part).trim();
			const comment =
				commentFrom >= 0 ? part.slice(commentFrom + 2).replace(/\s+/g, " ").trim() : "";
			return value ? { value, comment } : null;
		})
		.filter(Boolean);

	return options.length ? options : null;
}

function serialize(label, options) {
	const parts = options.map(
		(option) => "  " + option.value + (option.comment ? "//" + option.comment : ""),
	);
	return label + "[\n" + parts.join("\n") + "\n]";
}

function findOccurrence(text, needle, occurrence) {
	let index = -1;
	for (let seen = 0; seen <= occurrence; seen += 1) {
		index = text.indexOf(needle, index + 1);
		if (index < 0) return -1;
	}
	return index;
}

const plan = [];
const pruned = [];

for (const [notePath, records] of Object.entries(data.foldsByFile || {})) {
	const absolute = join(vault, notePath);
	if (!existsSync(absolute)) {
		pruned.push(notePath);
		continue;
	}

	let text = readFileSync(absolute, "utf8");
	let changed = false;

	for (const record of records) {
		const options = parseLegacy(record.expression);
		if (!options) continue;

		const label = record.expression.slice(0, record.expression.indexOf("[")).trimEnd();
		let next;
		try {
			next = serialize(label, options);
		} catch (error) {
			plan.push({ notePath, skipped: true, reason: error.message, from: record.expression });
			continue;
		}

		const position = findOccurrence(text, record.expression, record.occurrence || 0);
		if (position < 0) {
			plan.push({ notePath, skipped: true, reason: "正文里找不到这段原文", from: record.expression });
			continue;
		}

		text = text.slice(0, position) + next + text.slice(position + record.expression.length);
		record.expression = next;
		changed = true;
	}

	if (changed) plan.push({ notePath, absolute, text, records: records.length });
}

const converted = plan.filter((item) => !item.skipped);
const skipped = plan.filter((item) => item.skipped);

process.stdout.write(`库：${vault}\n`);
process.stdout.write(`需要转换的笔记：${converted.length} 个\n`);
for (const item of converted) process.stdout.write(`  · ${item.notePath}\n`);
if (pruned.length) {
	process.stdout.write(`指向已删除笔记的记录：${pruned.length} 条\n`);
	for (const item of pruned) process.stdout.write(`  - ${item}\n`);
}
if (skipped.length) {
	process.stdout.write(`跳过：${skipped.length} 条\n`);
	for (const item of skipped) process.stdout.write(`  ! ${item.notePath}：${item.reason}\n`);
}

if (!converted.length && !pruned.length) {
	process.stdout.write("\n没有需要迁移的内容。\n");
	process.exit(0);
}

if (!apply) {
	process.stdout.write("\n这是预演。确认无误后加 --apply 真正写入。\n");
	process.exit(0);
}

for (const item of converted) {
	copyFileSync(item.absolute, `${item.absolute}.bak-${stamp}`);
	writeFileSync(item.absolute, item.text, "utf8");
}
for (const notePath of pruned) delete data.foldsByFile[notePath];

copyFileSync(dataPath, `${dataPath}.bak-${stamp}`);
writeFileSync(dataPath, JSON.stringify(data, null, 2) + "\n", "utf8");

process.stdout.write(
	`\n已写入：${converted.length} 个笔记、${pruned.length} 条清理。\n` +
		`备份后缀：.bak-${stamp}\n`,
);
