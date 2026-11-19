/**
 * 零依赖打包脚本：把 src/ 下的 CommonJS 模块合并成 Obsidian 需要的单个 main.js。
 *
 * 之所以不直接用 esbuild：本仓库要求「clone 下来不装任何东西也能构建」。
 * 需要 esbuild 时用 `npm i && npm run build:esbuild`，两者产出的行为等价。
 *
 * 规则很简单：
 *   - `require("./x")` 视为内部依赖，递归内联进模块表；
 *   - 其他 `require("obsidian")` / `require("@codemirror/*")` 保持原样，
 *     由 Obsidian 运行时提供。
 */

import { readFileSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const ENTRY = "src/main.js";
const OUT = "main.js";

const modules = new Map();
const order = [];

function idFor(absPath) {
	return "./" + relative(ROOT, absPath).replace(/\\/g, "/");
}

function resolveRequest(fromAbs, spec) {
	if (!spec.startsWith(".")) return null;
	let target = resolve(dirname(fromAbs), spec);
	if (!target.endsWith(".js")) target += ".js";
	return target;
}

function addModule(absPath) {
	const id = idFor(absPath);
	if (modules.has(id)) return id;

	let code;
	try {
		code = readFileSync(absPath, "utf8");
	} catch (error) {
		throw new Error(`找不到模块 ${id}：${error.message}`);
	}

	const deps = [];
	code = code.replace(/require\(\s*(["'])([^"']+)\1\s*\)/g, (match, _quote, spec) => {
		const target = resolveRequest(absPath, spec);
		if (!target) return match;
		deps.push(addModule(target));
		return `__require(${JSON.stringify(idFor(target))})`;
	});

	modules.set(id, code);
	order.push(id);
	return id;
}

const entryId = addModule(resolve(ROOT, ENTRY));

const lines = [
	"/* 由 scripts/build.mjs 生成，请勿直接编辑；源码在 src/ */",
	'"use strict";',
	"const __modules = Object.create(null);",
	"const __cache = Object.create(null);",
	"function __require(id) {",
	"\tif (__cache[id]) return __cache[id].exports;",
	"\tconst module = { exports: {} };",
	"\t__cache[id] = module;",
	"\t__modules[id](module, module.exports, __require);",
	"\treturn module.exports;",
	"}",
];

for (const id of order) {
	lines.push(`__modules[${JSON.stringify(id)}] = function (module, exports, __require) {`);
	lines.push(modules.get(id).replace(/\s+$/, ""));
	lines.push("};");
}

lines.push(`module.exports = __require(${JSON.stringify(entryId)});`);

mkdirSync(dirname(resolve(ROOT, OUT)), { recursive: true });
const output = lines.join("\n") + "\n";
writeFileSync(resolve(ROOT, OUT), output, "utf8");

process.stdout.write(
	`built ${OUT}: ${order.length} modules, ${Buffer.byteLength(output, "utf8")} bytes\n` +
		order.map((id) => `  - ${id}`).join("\n") +
		"\n",
);
