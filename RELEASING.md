# 发布流程

面向维护者。每一步都能在本地做完，只有推送和建 Release 需要网络和 GitHub 凭据。

## 0. 环境

- Node.js ≥ 22.8（测试用到 `--test-isolation=none`）
- git
- 可选：GitHub CLI（`gh`），用来一条命令建 Release

## 1. 改版本号（三处必须一致）

| 文件 | 改什么 |
|---|---|
| `manifest.json` | `"version"` |
| `package.json` | `"version"` |
| `versions.json` | 追加一行 `"<新版本>": "<最低 Obsidian 版本>"` |

顺手在 `CHANGELOG.md` 顶部加一段。版本号按[语义化版本](https://semver.org/lang/zh-CN/)走：
修 bug 补丁位，加功能次版本位，改数据结构主版本位。

## 2. 构建、测试、打包

```bash
npm run release
```

它会依次校验 metadata 一致性 → 构建 `main.js` → 跑测试 → 生成
`dist/code-block-context-fold-<version>.zip`（里面是三个平铺文件，解压即可安装）。

只改文档、想跳过测试时：`npm run release -- --skip-tests`。

## 3. 提交并打 tag

下面的 `<version>` 换成 `manifest.json` 里的版本号，例如 `3.0.0`。

```bash
git add -A
git commit -m "release: <version>"
git tag <version>
git push origin main --tags
```

**tag 必须和 `manifest.json` 里的 `version` 完全一致，且不要加 `v` 前缀。**
Obsidian 按 tag 名找对应版本的 manifest，`v3.0.0` 会被当成找不到。

## 4. 建 GitHub Release

```bash
gh release create <version> --title "代码块参数折叠 <version>" --notes-file RELEASE_NOTES.md \
  manifest.json main.js styles.css dist/code-block-context-fold-<version>.zip
```

没有 `gh` 就在网页上建：tag 选 `<version>`，标题随意，正文贴 `RELEASE_NOTES.md`，
**四个附件**：`manifest.json`、`main.js`、`styles.css`、zip。

三个文件是硬要求——Obsidian 只认 Release 里的这三个资产，缺 `main.js` 就装不上。

推 tag 时 `.github/workflows/release.yml` 也会自动做一遍同样的事，两条路选一条即可。

## 5. 发布后自检

- 在一个**空库**里手动安装一遍：三个文件 → 启用 → 选中一段 `参数[内容]` → 右键折叠。
- 重开笔记，确认折叠位置能恢复。
- 切到阅读视图，确认折叠同样生效、点击能展开。
- 用 [BRAT](https://github.com/TfTHacker/obsidian42-brat) 添加 `zhongxiaguchen/code-block-context-fold`，
  确认能从 Release 装成功（这条最接近真实用户路径）。

## 6. 提交到社区插件列表（可选，但“发布出去”通常指这个）

1. Fork [obsidianmd/obsidian-releases](https://github.com/obsidianmd/obsidian-releases)。
2. 在 `community-plugins.json` 末尾追加一项（按字母序插入更好看）：

   ```json
   {
     "id": "code-block-context-fold",
     "name": "代码块参数折叠",
     "author": "Zonvon",
     "description": "把代码块里的“参数[内容]”折叠成可点击的标签，也可切换成悬浮显示选项与注释的弹窗。",
     "repo": "zhongxiaguchen/code-block-context-fold"
   }
   ```

3. 提 PR。审核会检查：仓库公开、根目录有 `manifest.json`、Release 含三个资产、
   tag 与版本一致、README 有安装说明、有 LICENSE。

## 常见坑

- **tag 带 `v`** → 用户装不上，报 “no release found”。
- **忘了提交构建后的 `main.js`** → Release 里的 `main.js` 和仓库不一致，用户看到的和源码对不上。
- **把 `data.json` 提交了** → 泄露你自己的笔记路径和正文片段。仓库 `.gitignore` 已挡住，别手动 `git add -f`。
- **一个仓库塞多个插件** → 社区列表只认仓库根目录的那一份 `manifest.json`，第二个插件必须换仓库。
- **仓库名和插件 id 不一致** → 能发布，但用户在 BRAT 里看到的名字会比较迷惑。本仓库已改名为
  `code-block-context-fold`，与 id 对齐；以后想改名建议改仓库而不是改 id，id 一改老用户的折叠记录就找不到了。
