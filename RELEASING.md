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
gh release create <version> --title "Code Block Parameter Fold <version>" --notes-file RELEASE_NOTES.md \
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

**2026 年起流程变了**：不再向 `obsidianmd/obsidian-releases` 提 PR（该仓库已关闭 PR 功能），
改为在官方门户 <https://community.obsidian.md> 用 Obsidian 账号提交。网上仍流传旧教程，
照着提 PR 会卡在「An owner of this repository has disabled the ability to open pull requests」。

### 6.1 先决条件（逐条确认，缺一条就可能被打回）

- [ ] 仓库**公开**，默认分支根目录有 `manifest.json`、`README.md`、`LICENSE`。
- [ ] 最新 Release 的 tag 与 `manifest.json` 的 `version` **完全一致**（不带 `v`），
      且附件里有 `main.js`、`manifest.json`、`styles.css`。
      注意：目录读的是**默认分支 HEAD 上的 manifest**，不是 release 附件里那份，两处必须同步。
- [ ] `manifest.json` 的 `id`、`name`、`description` 里**没有 "obsidian" 这个词**。
- [ ] `version` 是 `x.y.z` 三段式。
- [ ] `minAppVersion` 填**实际验证过**的最低版本。
- [ ] README 说清楚：插件做什么、怎么安装、**是否联网 / 是否收集数据**。
- [ ] README 有一张能看懂的演示素材（录法见 [docs/demo-guide.md](docs/demo-guide.md)）。
- [ ] `isDesktopOnly` 与实现一致：没在移动端实测就标 `true`。
- [ ] 仓库名不要暗示和官方有关系（本项目已改成 `code-block-context-fold`）。

### 6.2 提交

1. 到 <https://obsidian.md> 注册 **Obsidian 账号**（和 GitHub 账号是两回事）。
2. 打开 <https://community.obsidian.md> 登录，按提示**关联 GitHub 账号**——门户据此验证仓库归属。
3. 点 **Add a plugin**。
4. 填仓库地址：`https://github.com/zhongxiaguchen/code-block-context-fold`
5. 提交。

### 6.3 审核与修正

- 先过**自动校验**：读默认分支的 `manifest.json`、查 release 附件、比对 tag 与版本。
- 没通过的项会列在目录页上。**修正方式是「改仓库 → 递增版本号 → 发新 release」**，
  然后等它重新抓取；只改文件不发新版本，等于没改。
- 通过后进人工队列，几天到几周不等，期间不用催。

### 6.4 上架之后

- **更新版本不用再提交**：发布符合规则的新 Release，目录会自动同步。
- `id` 永远别改——它是插件目录里的唯一标识，改了等同于换一个插件。
- 改名、换仓库地址要在门户里更新插件信息，不走 PR。

## 常见坑

- **照着旧教程去提 PR** → `obsidianmd/obsidian-releases` 已关闭 PR，会卡在
  「An owner of this repository has disabled the ability to open pull requests」。改走 community.obsidian.md。
- **tag 带 `v`** → 用户装不上，报 “no release found”。
- **Release 是空壳** → 只有自动生成的源码 zip，没有三个安装文件。先等 1–2 分钟再刷新：
  附件上传和页面缓存都有延迟，刚推完 tag 就查很容易误判。等过了仍然没有，才是工作流没跑成；
  删掉远端 tag 重推一次即可（`git push origin :refs/tags/<version>` 再 `git push origin <version>`）。
- **忘了提交构建后的 `main.js`** → Release 里的 `main.js` 和仓库不一致。
- **把 `data.json` 提交了** → 泄露你自己的笔记路径和正文片段。仓库 `.gitignore` 已挡住，别手动 `git add -f`。
- **一个仓库塞多个插件** → 社区列表只认仓库根目录的那一份 `manifest.json`，第二个插件必须换仓库。
- **仓库名带 Obsidian** → 容易被认为在冒充官方，审核会要求改名。
- **id 改名** → 等同于换一个插件，老用户的 `data.json` 和已装的实例都会失去关联。改名只改仓库，别改 id。
