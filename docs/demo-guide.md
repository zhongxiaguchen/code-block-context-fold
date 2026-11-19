# 演示动图怎么录

社区插件详情页里，一张 5 秒的动图比十段文字有用。这份是给维护者看的操作说明，
不随插件分发。

## 目标

- 5 秒左右，能在一屏内看完，不需要旁白
- 宽 900–960px，15fps，**体积 < 2MB**
- 画面里不出现你的私人笔记名、路径、侧边栏里的其他库

## 分镜

录制前先在一个**干净的临时库**里建一篇 `demo.md`，内容就用下面这段（关键字是英文，
中英文用户都看得懂）：

````markdown
```text
Cull 选项[back(剔除背面)/Front(剔除正面)/Off(正反面都绘制)]
ZWrite 选项[On(写入深度)/Off(不写入深度)]
```
````

| 时间 | 动作 | 画面重点 |
|---|---|---|
| 0.0–0.8 | 编辑器里两行参数可见，鼠标停在第一行 | 让人看清"折叠前"有多长 |
| 0.8–1.8 | 选中整行 → 右键 → 菜单弹出 → 点「折叠选中参数」 | 菜单项要停留半秒 |
| 1.8–2.6 | 折叠完成，点标签展开一次，再点收起 | 证明可逆、不改正文 |
| 2.6–3.8 | 右键标签 →「显示方式：选项悬浮弹窗」→ 药丸出现 → 悬停浮出选项 → 悬停某项浮出注释 | 这是最独特的一幕，给足时间 |
| 3.8–5.0 | `Ctrl+E` 切到阅读视图 → 折叠仍在 → 点击展开 | 证明不止编辑器能用 |

动作之间不要有长停顿，但每个菜单弹出后要停 0.4 秒左右，否则观众看不清点了什么。

## 录制设置

- 窗口 **1280×760** 左右，系统缩放 100%
- 只录编辑器中间区域（约 960×560），**不要**把左侧文件列表、右侧大纲录进去
- **浅色主题**：深色主题在 GIF 里色带很重，字也容易糊
- 15fps 足够，GIF 不需要 30
- 关掉行号以外的干扰（折叠指示、拼写波浪线）

## 两种做法

### A. 直接录 GIF（最简单）

[ScreenToGif](https://www.screentogif.com/)（Windows 免费开源）：录 → 在时间轴上删掉多余帧 →
`文件 → 另存为 → Gif`，导出时能直接看到体积。

优点是一条龙；缺点是码率控制不如 ffmpeg 精细。

### B. 录 MP4 再转（质量最好）

用 OBS、Xbox Game Bar（`Win+G`）或任何录屏工具录成 mp4，然后：

```bash
ffmpeg -y -ss 0.2 -t 5 -i demo.mp4 \
  -vf "fps=15,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle" \
  -loop 0 docs/demo.gif
```

`palettegen` / `paletteuse` 这两步是关键——直接 `ffmpeg -i in.mp4 out.gif` 出来的图又大又脏。

**超过 2MB 就按这个顺序降**：

1. `fps=12`
2. `scale=720:-1`
3. `max_colors=96`
4. 剪短：`-ss` 提前、`-t` 减小

### C. 不放进仓库的替代方案

把 mp4 拖进任意一个 GitHub issue 或 PR 的评论框，会得到一个
`https://github.com/user-attachments/assets/...` 链接，直接把链接写进 README，
GitHub 会渲染成播放器。**体积和清晰度都远好于 GIF**，缺点是素材不在仓库里，
换仓库/删 issue 就失效。

如果以后想录更长的演示（比如 20 秒讲完设置页和总览），建议走这条。

## 放进 README

录好后把 `docs/demo.gif` 提交，然后把两份 README 里的这一行：

```markdown
![two display modes](docs/display-modes.svg)
```

换成：

```markdown
![demo](docs/demo.gif)
```

`docs/display-modes.svg` 可以留着，放在「两种显示方式」小节里当静态示意，两者不冲突。

## 提交前检查

- [ ] 文件小于 2MB（`dir docs\demo.gif` 看一眼）
- [ ] 画面里没有任何真实笔记名、路径、账号信息
- [ ] 循环播放时不刺眼（首尾画面接近）
- [ ] 在 GitHub 网页上实际打开看过一遍，确认能自动播放
