const { MarkdownView, Modal } = require("obsidian");
const { buildOverview } = require("../settings/overview");
const { parameterFoldField, removeRegionEffect } = require("../editor/decorations");

/**
 * 折叠总览：按笔记分组列出所有折叠，支持跳转、单条删除、清理失效记录。
 */
class FoldOverviewModal extends Modal {
	constructor(app, plugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		this.render();
	}

	onClose() {
		this.contentEl.replaceChildren();
	}

	render() {
		const { contentEl } = this;
		contentEl.replaceChildren();
		contentEl.addClass("inline-code-fold-overview");

		const overview = buildOverview(this.plugin.savedData, (path) =>
			Boolean(this.app.vault.getAbstractFileByPath(path)),
		);

		const header = contentEl.createDiv({ cls: "inline-code-fold-overview-header" });
		header.createEl("h2", { text: "折叠总览" });
		header.createEl("p", {
			text: `${overview.groups.length} 篇笔记，共 ${overview.total} 处折叠`,
			cls: "setting-item-description",
		});

		if (!overview.groups.length && !overview.stale.length) {
			contentEl.createEl("p", { text: "还没有任何折叠。" });
			return;
		}

		for (const group of overview.groups) {
			const section = contentEl.createDiv({ cls: "inline-code-fold-overview-group" });
			const title = section.createDiv({ cls: "inline-code-fold-overview-title" });

			const link = title.createEl("a", { text: group.path, cls: "inline-code-fold-overview-path" });
			link.addEventListener("click", () => {
				const file = this.app.vault.getAbstractFileByPath(group.path);
				if (!file) return;
				this.close();
				void this.app.workspace.getLeaf(false).openFile(file);
			});
			title.createSpan({ text: `　${group.records.length} 处`, cls: "setting-item-description" });

			const list = section.createDiv({ cls: "inline-code-fold-overview-list" });
			for (const record of group.records) {
				this.renderRecord(list, group.path, record);
			}
		}

		if (overview.stale.length) {
			const section = contentEl.createDiv({ cls: "inline-code-fold-overview-group" });
			const title = section.createDiv({ cls: "inline-code-fold-overview-title" });
			title.createSpan({
				text: `已失效（笔记不存在）　${overview.stale.length} 篇`,
				cls: "inline-code-fold-overview-stale",
			});

			const list = section.createDiv({ cls: "inline-code-fold-overview-list" });
			for (const item of overview.stale) {
				const row = list.createDiv({ cls: "inline-code-fold-overview-row" });
				row.createSpan({ text: item.path, cls: "inline-code-fold-overview-label" });
				row.createSpan({ text: `　${item.count} 处`, cls: "setting-item-description" });
			}

			const actions = section.createDiv({ cls: "inline-code-fold-overview-actions" });
			const clean = actions.createEl("button", { text: `清理这 ${overview.stale.length} 篇的失效记录` });
			clean.addEventListener("click", async () => {
				for (const item of overview.stale) delete this.plugin.savedData.foldsByFile[item.path];
				await this.plugin.saveData(this.plugin.savedData);
				this.render();
			});
		}
	}

	renderRecord(list, path, record) {
		const row = list.createDiv({ cls: "inline-code-fold-overview-row" });

		row.createSpan({ text: record.label, cls: "inline-code-fold-overview-label" });
		if (record.preview) {
			row.createSpan({ text: record.preview, cls: "inline-code-fold-overview-preview" });
		}
		row.createSpan({
			text: record.displayMode === "options" ? "弹窗" : "折叠",
			cls: "inline-code-fold-overview-badge",
		});
		if (record.expanded) {
			row.createSpan({ text: "已展开", cls: "inline-code-fold-overview-badge" });
		}

		const remove = row.createEl("button", { text: "删除", cls: "inline-code-fold-overview-remove" });
		remove.addEventListener("click", async () => {
			await this.plugin.removeSavedRegion(path, record.id);
			this.detachFromOpenView(path, record.id);
			this.render();
		});
	}

	/** 删掉记录的同时，如果这篇笔记正开着，把编辑器里的装饰也摘掉。 */
	detachFromOpenView(path, regionId) {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view?.file || view.file.path !== path || !view.editor?.cm) return;
		const field = view.editor.cm.state.field(parameterFoldField, false);
		if (!field?.regions.some((region) => region.id === regionId)) return;
		view.editor.cm.dispatch({ effects: removeRegionEffect.of(regionId) });
	}
}

module.exports = FoldOverviewModal;
