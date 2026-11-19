const { PluginSettingTab, Setting } = require("obsidian");
const FoldOverviewModal = require("./overview-modal");
const { t } = require("../i18n");

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
			.setName(t("settings.defaultMode.name"))
			.setDesc(t("settings.defaultMode.desc"))
			.addDropdown((dropdown) =>
				dropdown
					.addOption("standard", t("settings.modeStandard"))
					.addOption("options", t("settings.modeOptions"))
					.setValue(this.plugin.settings.defaultDisplayMode)
					.onChange(async (value) => {
						this.plugin.settings.defaultDisplayMode = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(t("settings.reading.name"))
			.setDesc(t("settings.reading.desc"))
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.readingView).onChange(async (value) => {
					this.plugin.settings.readingView = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName(t("settings.overview.name"))
			.setDesc(t("settings.overview.desc"))
			.addButton((button) =>
				button.setButtonText(t("settings.overview.open")).onClick(() => {
					new FoldOverviewModal(this.app, this.plugin).open();
				}),
			);

		containerEl.createEl("p", {
			text: t("settings.privacy"),
			cls: "setting-item-description",
		});
	}
}

module.exports = FoldSettingsTab;
