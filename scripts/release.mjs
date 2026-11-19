/**
 * 发布打包：校验元数据 → 构建 → （可选）跑测试 → 生成可直接分发的 zip。
 *
 *   node scripts/release.mjs
 *   node scripts/release.mjs --skip-tests
 *
 * 产物：dist/code-block-context-fold-<version>.zip
 * zip 里是 manifest.json、main.js、styles.css 三个平铺文件，
 * 解压到 <库>/.obsidian/plugins/code-block-context-fold/ 即可使用。
 */

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const skipTests = args.includes("--skip-tests");

const readJson = (name) => JSON.parse(readFileSync(join(repoRoot, name), "utf8"));

function fail(message) {
	process.stderr.write(`✖ ${message}\n`);
	process.exit(1);
}

// 1. 元数据校验
const manifest = readJson("manifest.json");
const versions = readJson("versions.json");
const pkg = readJson("package.json");

for (const field of ["id", "name", "version", "minAppVersion", "description", "author"]) {
	if (!manifest[field]) fail(`manifest.json 缺少字段：${field}`);
}
if (manifest.version !== pkg.version) {
	fail(`版本不一致：manifest.json 是 ${manifest.version}，package.json 是 ${pkg.version}`);
}
if (!versions[manifest.version]) {
	fail(`versions.json 里缺少 ${manifest.version} 的条目`);
}
process.stdout.write(`✔ 元数据一致：${manifest.id} ${manifest.version}\n`);

// 2. 构建
await import("./build.mjs");

// 3. 测试
if (!skipTests) {
	process.stdout.write("· 运行测试…\n");
	try {
		execFileSync(
			process.execPath,
			["--test", "--test-isolation=none", "test/parameters.test.mjs", "test/selection.test.mjs", "test/bundle.test.mjs"],
			{ cwd: repoRoot, stdio: "inherit" },
		);
	} catch {
		fail("测试未通过，已停止发布。");
	}
} else {
	process.stdout.write("· 已跳过测试（--skip-tests）\n");
}

// 4. 打包（store 模式，不压缩：插件文件本来就小，省掉依赖）
const FILES = ["manifest.json", "main.js", "styles.css"];
const entries = FILES.map((name) => {
	const data = readFileSync(join(repoRoot, name));
	return { name, data, crc: crc32(data) };
});

const now = new Date();
const dosTime =
	(Math.floor(now.getSeconds() / 2) & 0x1f) |
	((now.getMinutes() & 0x3f) << 5) |
	((now.getHours() & 0x1f) << 11);
const dosDate =
	(now.getDate() & 0x1f) |
	(((now.getMonth() + 1) & 0x0f) << 5) |
	(((now.getFullYear() - 1980) & 0x7f) << 9);

const localParts = [];
const centralParts = [];
let offset = 0;

for (const entry of entries) {
	const nameBytes = Buffer.from(entry.name, "utf8");

	const local = Buffer.alloc(30);
	local.writeUInt32LE(0x04034b50, 0);
	local.writeUInt16LE(20, 4);
	local.writeUInt16LE(0x0800, 6);
	local.writeUInt16LE(0, 8);
	local.writeUInt16LE(dosTime, 10);
	local.writeUInt16LE(dosDate, 12);
	local.writeUInt32LE(entry.crc, 14);
	local.writeUInt32LE(entry.data.length, 18);
	local.writeUInt32LE(entry.data.length, 22);
	local.writeUInt16LE(nameBytes.length, 26);
	local.writeUInt16LE(0, 28);

	localParts.push(local, nameBytes, entry.data);

	const central = Buffer.alloc(46);
	central.writeUInt32LE(0x02014b50, 0);
	central.writeUInt16LE(20, 4);
	central.writeUInt16LE(20, 6);
	central.writeUInt16LE(0x0800, 8);
	central.writeUInt16LE(0, 10);
	central.writeUInt16LE(dosTime, 12);
	central.writeUInt16LE(dosDate, 14);
	central.writeUInt32LE(entry.crc, 16);
	central.writeUInt32LE(entry.data.length, 20);
	central.writeUInt32LE(entry.data.length, 24);
	central.writeUInt16LE(nameBytes.length, 28);
	central.writeUInt16LE(0, 30);
	central.writeUInt16LE(0, 32);
	central.writeUInt16LE(0, 34);
	central.writeUInt16LE(0, 36);
	central.writeUInt32LE(0, 38);
	central.writeUInt32LE(offset, 42);
	centralParts.push(central, nameBytes);

	offset += local.length + nameBytes.length + entry.data.length;
}

const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(0, 4);
end.writeUInt16LE(0, 6);
end.writeUInt16LE(entries.length, 8);
end.writeUInt16LE(entries.length, 10);
end.writeUInt32LE(centralSize, 12);
end.writeUInt32LE(offset, 16);
end.writeUInt16LE(0, 20);

const zip = Buffer.concat([...localParts, ...centralParts, end]);
const distDir = join(repoRoot, "dist");
const zipName = `${manifest.id}-${manifest.version}.zip`;
mkdirSync(distDir, { recursive: true });
writeFileSync(join(distDir, zipName), zip);

const digest = createHash("sha256").update(zip).digest("hex");
process.stdout.write(
	`✔ 打包完成：dist/${zipName}（${zip.length} 字节）\n` +
		`  sha256: ${digest}\n` +
		`  内容：${FILES.join(", ")}\n\n` +
		"下一步：\n" +
		`  git tag ${manifest.version}\n` +
		`  git push origin main --tags\n` +
		`  gh release create ${manifest.version} --title "${manifest.name} ${manifest.version}" --notes-file RELEASE_NOTES.md \\\n` +
		"    manifest.json main.js styles.css dist/*.zip\n",
);

function crc32(buffer) {
	let crc = 0xffffffff;
	for (const byte of buffer) {
		crc ^= byte;
		for (let bit = 0; bit < 8; bit += 1) {
			crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
		}
	}
	return (crc ^ 0xffffffff) >>> 0;
}
