# 更新记录

本项目使用 [语义化版本](https://semver.org/lang/zh-CN/)，版本号与 `manifest.json` 保持一致。

## 2.6.0

- 仓库结构规范化：源码拆分为 `src/` 下的多个模块，`main.js` 改为构建产物。
- 新增零依赖打包脚本 `scripts/build.mjs`，以及可选的 esbuild 构建入口。
- 新增部署脚本 `scripts/deploy.mjs`，可安装到任意 Obsidian 库。
- 新增单元测试，覆盖参数格式、代码块扫描、选区解析与折叠位置复原。
- 许可证变更为 GPL-3.0-or-later。

## 2.5.1 及更早

- 早期版本在库内直接迭代，未单独记录。
