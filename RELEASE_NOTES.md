Fold `name[options]` inside code blocks into a clickable tag — expand it when you need the details, or switch to a hover popup that lists every option with its comment.

## 3.4.2 变更

- 标注为**仅桌面端**（`isDesktopOnly: true`）。插件本身没有用到桌面专属 API，但没有在移动端实测过，
  与其对外声称支持、让用户踩坑，不如先如实标注。将来实测通过后改回 `false` 即可。

## 3.4.1 变更

- 插件显示名改为 **Code Block Parameter Fold**，`description` 改为英文，为提交社区列表做准备。
- `id`（`code-block-context-fold`）保持不变，已装实例、设置和折叠记录都不受影响；界面文案仍跟随 Obsidian 的语言。

## 两种显示方式

- **普通折叠**：`Cull 选项[back/Front/Off]` 只显示带下划线的 `Cull 选项`，`[内容]` 收起来，点一下展开。
- **选项悬浮弹窗**：折叠成药丸状的 `Cull 选项 ▾`，悬停浮出选项列表，再移到某个选项上浮出它的注释。

## 选项格式

一行一个选项，`//` 之后是注释：

```
混合模式[
  Normal//正常混合
  Add//相加，越高越亮
]
```

`_` 不需要转义，`_MainTex_ST`、`UNITY_OBJECT_TO_WORLD` 这些名字可以直接写。`[` `]` 仍是结构字符。

## 怎么用

1. 在一个代码块里选中完整的 `参数[内容]`（支持多行、支持嵌套方括号），右键折叠。
2. 想批量录入选项：右键 → 插入参数选项，填名称、逐个加「选项 + 注释」，保存。
3. 在标签上右键可以切换显示方式、编辑选项、展开或取消折叠。
4. 折叠多了想盘点：命令面板 → 打开折叠总览（支持搜索）。

折叠位置会记在插件数据里，重开笔记自动恢复；笔记重命名时记录跟着迁移。

## 安装

1. 下载 `manifest.json`、`main.js`、`styles.css`（或 `code-block-context-fold-3.4.1.zip` 解压）。
2. 放到 `<你的库>/.obsidian/plugins/code-block-context-fold/`，三个文件平铺，不要多套一层文件夹。
3. 设置 → 第三方插件 → 关闭安全模式 → 刷新 → 启用 **Code Block Parameter Fold**。

插件不绑定任何库，每个库各自保存自己的折叠记录。

## 已知限制

- 阅读视图里的展开状态只影响当前渲染，不会写回编辑视图。
- 两个内容完全相同的代码块会被按出现顺序各自对应。
- 方括号 `[ ]` 不能出现在参数名、选项名或注释里。
- 同一段文本出现多次且锚点无法区分时，会放弃恢复而不是猜位置。

## 许可证

GPL-3.0-or-later。
