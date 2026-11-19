/**
 * 可选的 esbuild 构建入口：`npm i && npm run build:esbuild`。
 *
 * 与 scripts/build.mjs 的产物行为一致，区别只是打包器不同。
 * obsidian 与 @codemirror/* 由 Obsidian 运行时提供，必须保持 external。
 */

import esbuild from "esbuild";

const production = process.argv.includes("production");

const context = await esbuild.context({
	entryPoints: ["src/main.js"],
	bundle: true,
	external: ["obsidian", "@codemirror/*", "electron"],
	format: "cjs",
	target: "es2018",
	logLevel: "info",
	sourcemap: production ? false : "inline",
	treeShaking: true,
	minify: production,
	outfile: "main.js",
});

await context.rebuild();
await context.dispose();
