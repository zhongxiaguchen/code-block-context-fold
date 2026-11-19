/**
 * 把插件装进任意一个 Obsidian 库。
 *
 *   node scripts/deploy.mjs --vault "D:\某个库"
 *   node scripts/deploy.mjs --vault "D:\某个库" --skip-build
 *
 * 只复制 manifest.json / main.js / styles.css 三个文件；
 * 目标库里的 data.json（折叠记录）不会被读取或覆盖。
 */

import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const args = process.argv.slice(2);
const valueOf = (name) => {
	const index = args.indexOf(name);
	return index >= 0 ? args[index + 1] : undefined;
};

const vaultArg = valueOf("--vault");
if (!vaultArg) {
	process.stderr.write(
		"用法：node scripts/deploy.mjs --vault \"<Obsidian 库路径>\" [--skip-build]\n",
	);
	process.exit(1);
}

const repoRoot = resolve(import.meta.dirname, "..");
const vault = resolve(vaultArg);

if (!existsSync(join(vault, ".obsidian"))) {
	process.stderr.write(`这不是一个 Obsidian 库（缺少 .obsidian 目录）：${vault}\n`);
	process.exit(1);
}

if (!args.includes("--skip-build")) {
	await import("./build.mjs");
}

const pluginDir = join(vault, ".obsidian", "plugins", "code-block-context-fold");
mkdirSync(pluginDir, { recursive: true });

for (const file of ["manifest.json", "main.js", "styles.css"]) {
	copyFileSync(join(repoRoot, file), join(pluginDir, file));
}

process.stdout.write(
	`已部署到：${pluginDir}\n` +
		`库：${basename(vault)}\n` +
		"data.json（折叠记录）未改动。重启 Obsidian 或重新加载插件后生效。\n",
);
