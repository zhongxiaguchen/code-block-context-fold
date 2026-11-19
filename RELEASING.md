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

## 6. 上架社区插件

社区插件列表不是一个网站后台，而是一个 GitHub 仓库：
[obsidianmd/obsidian-releases](https://github.com/obsidianmd/obsidian-releases)。
上架 = 给它的 `community-plugins.json` 加一条，提 PR，等人审。

### 6.1 先决条件（逐条确认，缺一条就可能被打回）

- [ ] 仓库**公开**，根目录有 `manifest.json`、`README.md`、`LICENSE`。
- [ ] 最新 Release 的 tag 与 `manifest.json` 的 `version` **完全一致**（不带 `v`），
      且附件里有 `main.js`、`manifest.json`、`styles.css`。
- [ ] `manifest.json` 的 `id`、`name`、`description` 里**没有 "obsidian" 这个词**（审核明确禁止）。
- [ ] README 说清楚：插件做什么、怎么安装、**是否联网 / 是否收集数据**。
- [ ] README 有一张能看懂的演示素材（录法见 [docs/demo-guide.md](docs/demo-guide.md)）。
  目前用的是 `docs/display-modes.svg` 静态示意，换成 GIF 会更抓人。
- [ ] 仓库名不要暗示和官方有关系。`Obsidian_Plugin` 这种名字大概率被要求改掉，
      建议先改成 `code-block-context-fold`（改完 GitHub 会把旧地址 301 到新地址，
      本地 `git remote set-url` 一次即可）。
- [ ] 桌面/移动声明与实现一致：`isDesktopOnly: false` 表示你声称支持移动端，
      没实测过就先诚实标 `true`，或者补一轮实测。

### 6.2 提交

1. Fork `obsidianmd/obsidian-releases`。
2. 编辑根目录的 `community-plugins.json`，在**数组末尾**追加一项（保持两空格缩进）：

   ```json
   {
     "id": "code-block-context-fold",
     "name": "代码块参数折叠",
     "author": "Zonvon",
     "description": "把代码块里的“参数[内容]”折叠成可点击的标签，也可切换成悬浮显示选项与注释的弹窗。",
     "repo": "zhongxiaguchen/code-block-context-fold"
   }
   ```

   想更容易被英文用户搜到，可以把 `name` 和 `description` 换成英文，例如：

   ```json
   {
     "id": "code-block-context-fold",
     "name": "Code Block Parameter Fold",
     "author": "Zonvon",
     "description": "Fold `name[options]` inside code blocks into a clickable tag, with an optional hover popup showing options and comments.",
     "repo": "zhongxiaguchen/code-block-context-fold"
   }
   ```

   注意：`id` 一旦上架就**不要改**——它是插件目录名，改了等同于换一个插件。

3. 提 PR，标题 `Add plugin: 代码块参数折叠`，正文用下面这份：

   ```markdown
   ## Plugin submission

   - **Plugin ID:** `code-block-context-fold`
   - **Repo:** https://github.com/zhongxiaguchen/code-block-context-fold
   - **Latest release:** v3.3.0 (tag `3.3.0`, assets: main.js, manifest.json, styles.css)

   ### What it does
   Folds `name[options]` patterns inside code blocks into a clickable tag.
   A second display mode turns the same text into a pill that shows the options
   and their comments on hover. Works in both editing and reading view.

   ### Checklist
   - [x] I am the author of this plugin.
   - [x] The plugin is open source (GPL-3.0-or-later) and the repo is public.
   - [x] `manifest.json` is at the repo root; the release tag matches its version.
   - [x] The release includes `main.js`, `manifest.json`, and `styles.css`.
   - [x] The plugin does **not** access the network and collects **no** telemetry.
   - [x] The plugin only reads the current vault; its data file stores note paths
         and short text anchors to restore fold positions.
   - [x] No ads, no crypto, no closed-source code.
   - [x] Tested on Windows; please tell me if anything looks off on macOS/Linux.
   ```

4. 等机器人跑校验（会去读你的 repo 和 release），然后人工审核。**几天到几周都正常**，
   队列一直很长；期间不用反复催。
5. 合并后几小时内，插件会出现在 Obsidian 的「社区插件」里。

### 6.3 上架之后

- **更新版本不用再提 PR**：改 `version` → 发新 Release（tag 同名）→ 客户端自动发现。
- **改仓库地址、改显示名**：要再提一个 PR 改 `community-plugins.json` 里那条。
- **下架**：提 PR 删掉那条。
- 客户端会拉一份 `community-plugins.json` 缓存，刚合并完可能延迟几小时才看得到。

## 常见坑

- **tag 带 `v`** → 用户装不上，报 “no release found”。
- **Release 是空壳** → 只有自动生成的源码 zip，没有三个安装文件。多半是工作流没触发成功；
  删掉远端 tag 重推一次即可（`git push origin :refs/tags/<version>` 再 `git push origin <version>`）。
- **忘了提交构建后的 `main.js`** → Release 里的 `main.js` 和仓库不一致。
- **把 `data.json` 提交了** → 泄露你自己的笔记路径和正文片段。仓库 `.gitignore` 已挡住，别手动 `git add -f`。
- **一个仓库塞多个插件** → 社区列表只认仓库根目录的那一份 `manifest.json`，第二个插件必须换仓库。
- **仓库名带 Obsidian** → 容易被认为在冒充官方，审核会要求改名。
- **id 改名** → 等同于换一个插件，老用户的 `data.json` 和已装的实例都会失去关联。改名只改仓库，别改 id。
