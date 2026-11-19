const { PluginSettingTab, Setting } = require("obsidian");
const FoldOverviewModal = require("./overview-modal");

/**
 * 设置页：两个行为开关，外加入口。
 */
class FoldSettingsTab extends PluginSettingTab {
	constructor(app, plugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("默认显示方式")
			.setDesc("新折叠的项目用哪种形态；已有项目可在标签上右键单独切换。")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("standard", "普通折叠（点标签展开）")
					.addOption("options", "选项悬浮弹窗（悬停看选项）")
					.setValue(this.plugin.settings.defaultDisplayMode)
					.onChange(async (value) => {
						this.plugin.settings.defaultDisplayMode = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("阅读视图也折叠")
			.setDesc("关闭后只在编辑视图生效，阅读视图和导出 PDF 保持原文。")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.readingView).onChange(async (value) => {
					this.plugin.settings.readingView = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName("折叠总览")
			.setDesc("查看本库所有折叠、跳到对应笔记，以及清理已失效的记录。")
			.addButton((button) =>
				button.setButtonText("打开").onClick(() => {
					new FoldOverviewModal(this.app, this.plugin).open();
				}),
			);

		containerEl.createEl("p", {
			text: "折叠记录保存在本插件目录的 data.json 里，含笔记路径与正文片段，请勿分享该文件。",
			cls: "setting-item-description",
		});
	}
}

module.exports = FoldSettingsTab;
