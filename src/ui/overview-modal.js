const { MarkdownView, Modal } = require("obsidian");
const { buildOverview } = require("../settings/overview");
const { parameterFoldField, removeRegionEffect } = require("../editor/decorations");

/**
 * 折叠总览：按笔记分组列出所有折叠，支持搜索、跳转、单条删除、清理失效记录。
 */
class FoldOverviewModal extends Modal {
	constructor(app, plugin) {
		super(app);
		this.plugin = plugin;
		this.query = "";
	}

	onOpen() {
		this.query = "";
		this.render();
	}

	onClose() {
		this.contentEl.replaceChildren();
	}

	/** 搜索框和结果分开构建：输入时只重画结果，输入框本身不重建，焦点不丢。 */
	render() {
		const { contentEl } = this;
		contentEl.replaceChildren();
		contentEl.addClass("inline-code-fold-overview");

		const header = contentEl.createDiv({ cls: "inline-code-fold-overview-header" });
		header.createEl("h2", { text: "折叠总览" });
		this.countEl = header.createEl("p", { cls: "setting-item-description" });

		const searchWrap = contentEl.createDiv({ cls: "inline-code-fold-overview-search" });
		const input = searchWrap.createEl("input", {
			type: "search",
			placeholder: "搜索标签、选项或笔记名",
		});
		input.value = this.query;
		input.addEventListener("input", () => {
			this.query = input.value;
			this.renderResults();
		});
		input.addEventListener("keydown", (event) => {
			// 有搜索词时，Esc 先清空搜索，而不是直接关掉弹窗
			if (event.key === "Escape" && this.query) {
				event.stopPropagation();
				this.query = "";
				input.value = "";
				this.renderResults();
			}
		});

		this.resultsEl = contentEl.createDiv();
		this.renderResults();
		input.focus();
	}

	renderResults() {
		const overview = buildOverview(
			this.plugin.savedData,
			(path) => Boolean(this.app.vault.getAbstractFileByPath(path)),
			this.query,
		);

		this.countEl.textContent = overview.filtered
			? `匹配 ${overview.total} / ${overview.allTotal} 处，${overview.groups.length} 篇笔记`
			: `${overview.groups.length} 篇笔记，共 ${overview.total} 处折叠`;

		const container = this.resultsEl;
		container.replaceChildren();

		if (!overview.groups.length && !overview.stale.length) {
			container.createEl("p", {
				text: overview.filtered ? "没有匹配的折叠。" : "还没有任何折叠。",
			});
			return;
		}

		for (const group of overview.groups) {
			const section = container.createDiv({ cls: "inline-code-fold-overview-group" });
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
			const section = container.createDiv({ cls: "inline-code-fold-overview-group" });
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
				this.renderResults();
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
			this.renderResults();
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
