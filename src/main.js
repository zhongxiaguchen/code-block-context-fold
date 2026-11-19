const { MarkdownView, Menu, Notice, Plugin, TFile } = require("obsidian");

const {
	addRegionEffect,
	toggleRegionEffect,
	removeRegionEffect,
	restoreRegionsEffect,
	setRegionDisplayModeEffect,
	parameterFoldField,
	labelClickHandler,
} = require("./editor/decorations");
const { listCodeBlocks, findContainingCodeBlock } = require("./editor/blocks");
const { parseSelectedParameter } = require("./editor/selection");
const { buildAnchor } = require("./editor/anchor");
const { selectRecordCandidate } = require("./editor/recover");
const { parseParameterOptions } = require("./format/parameters");
const { createRegionId } = require("./util/id");
const { ParameterSetupModal } = require("./ui/setup-modal");
const FoldSettingsTab = require("./ui/settings-tab");
const FoldOverviewModal = require("./ui/overview-modal");
const { normalizeSettings } = require("./settings/defaults");
const { applyReadingRegions } = require("./reading/render");
const { createTextSurface, resolveReadingRegions, findRenderedBlock } = require("./reading/source");
const {
	registerSelectedParameter,
	findRegisteredRegionAtCursor,
	findRegisteredRegionById,
} = require("./plugin/actions");
const {
	setActivePlugin,
	getActivePlugin,
	setContextRegionId,
	getContextRegionId,
} = require("./state");

const DATA_SCHEMA_VERSION = 3;

module.exports = class CodeParameterFoldPlugin extends Plugin {
	openParameterSetup(editor, existing = null) {
		const file = this.app.workspace.getActiveFile();
		if (!file || !editor?.cm) return;
		const filePath = file.path;
		const snapshot = editor.getValue();
		const from = existing ? existing.labelFrom : editor.posToOffset(editor.getCursor("head"));
		const to = existing ? existing.bracketTo : from;
		const position = editor.offsetToPos(from);
		const insideBlock = Boolean(findContainingCodeBlock(editor, position.line, position.line));
		const initial = existing ? {
			...existing,
			label: snapshot.slice(existing.labelFrom, existing.labelTo),
			expression: snapshot.slice(from, to),
		} : null;
		new ParameterSetupModal(this.app, initial, async (expression, label) => {
			if (editor.getValue() !== snapshot || this.app.workspace.getActiveFile()?.path !== filePath) {
				throw new Error("笔记内容或当前文件已变化，请重新右键打开设置");
			}
			const fence = String.fromCharCode(96).repeat(3);
			const prefix = insideBlock ? "" : (position.ch > 0 ? "\n" : "") + fence + "text\n";
			const suffix = insideBlock ? "" : "\n" + fence + "\n";
			editor.replaceRange(prefix + expression + suffix, editor.offsetToPos(from), editor.offsetToPos(to));
			const labelFrom = from + prefix.length;
			const region = {
				id: existing?.id || createRegionId(),
				filePath,
				displayMode: this.settings?.defaultDisplayMode || "options",
				label,
				expression,
				labelFrom,
				labelTo: labelFrom + label.length,
				bracketFrom: labelFrom + expression.indexOf("["),
				bracketTo: labelFrom + expression.length,
			};
			const effects = existing ? [removeRegionEffect.of(existing.id)] : [];
			effects.push(addRegionEffect.of(region));
			editor.cm.dispatch({ effects });
			await this.saveRegion(editor, region);
		}).open();
	}

	showRegionMenu(event, editorView, regionId) {
		const field = editorView.state.field(parameterFoldField, false);
		const region = field?.regions.find((item) => item.id === regionId);
		if (!region) return;
		const expanded = field.expanded.has(regionId);
		const menu = new Menu(this.app);
		menu.addItem((item) => item.setTitle("插入参数选项…").setIcon("plus").onClick(() => {
			const view = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (view?.editor?.cm === editorView) this.openParameterSetup(view.editor);
		}));
		menu.addItem((item) => item.setTitle("编辑参数选项…").setIcon("pencil").onClick(() => {
			const view = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (view?.editor?.cm === editorView) this.openParameterSetup(view.editor, region);
		}));
		menu.addItem((item) => item
			.setTitle(expanded ? "收起参数内容" : "展开参数内容")
			.setIcon(expanded ? "fold-vertical" : "unfold-vertical")
			.onClick(() => {
				editorView.dispatch({ effects: toggleRegionEffect.of(regionId) });
				void this.setRegionExpanded(region.filePath, regionId, !expanded);
			}));
		for (const mode of [
			{ value: "standard", title: "显示方式：普通折叠" },
			{ value: "options", title: "显示方式：选项悬浮弹窗" },
		]) {
			menu.addItem((item) => item
				.setTitle(`${mode.title}${region.displayMode === mode.value ? "（当前）" : ""}`)
				.setIcon(region.displayMode === mode.value ? "check" : "list")
				.onClick(() => {
					if (mode.value === "options" && !parseParameterOptions(region.expression).length) {
						new Notice("没有找到可显示的参数选项");
						return;
					}
					editorView.dispatch({ effects: setRegionDisplayModeEffect.of({
						regionId, displayMode: mode.value,
					}) });
					void this.setRegionDisplayMode(region.filePath, regionId, mode.value);
				}));
		}
		menu.addItem((item) => item.setTitle("取消参数折叠").setIcon("x").onClick(() => {
			editorView.dispatch({ effects: removeRegionEffect.of(regionId) });
			void this.removeSavedRegion(region.filePath, regionId);
		}));
		menu.showAtMouseEvent(event);
	}

	async onload() {
		setActivePlugin(this);
		this.readingSourceCache = new Map();
		this.savedData = Object.assign(
			{ schemaVersion: DATA_SCHEMA_VERSION, foldsByFile: {} },
			(await this.loadData()) || {},
		);
		await this.migrateSavedData();
		this.settings = normalizeSettings(this.savedData.settings);
		this.addSettingTab(new FoldSettingsTab(this.app, this));
		this.addRibbonIcon("list", "折叠总览", () => {
			new FoldOverviewModal(this.app, this).open();
		});
		this.registerEditorExtension([parameterFoldField, labelClickHandler]);
		// 阅读视图：把保存的记录按锚点投影到渲染后的代码块上，与编辑视图同一套匹配
		this.registerMarkdownPostProcessor(async (element, context) => {
			if (!this.settings.readingView) return;
			const records = this.savedData.foldsByFile[context.sourcePath];
			if (!records?.length) return;
			const codes = element.querySelectorAll("pre > code");
			if (!codes.length) return;

			const source = await this.getReadingSource(context.sourcePath);
			if (!source) return;

			const regions = resolveReadingRegions(source.surface, source.blocks, records);
			if (!regions.length) return;

			const used = new Set();
			for (const code of codes) {
				const block = findRenderedBlock(source.blocks, source.text, code.textContent);
				if (!block || used.has(block.index)) continue;
				used.add(block.index);
				const forBlock = regions.filter((region) => region.blockIndex === block.index);
				if (forBlock.length) applyReadingRegions(code, forBlock);
			}
		});
		this.app.workspace.onLayoutReady(() => this.restoreActiveView());
		this.registerEvent(
			this.app.workspace.on("file-open", () => {
				window.setTimeout(() => this.restoreActiveView(), 50);
			}),
		);
		this.registerEvent(
			this.app.vault.on("rename", async (file, oldPath) => {
				this.readingSourceCache.delete(oldPath);
				const records = this.savedData.foldsByFile[oldPath];
				if (!records) return;
				delete this.savedData.foldsByFile[oldPath];
				this.savedData.foldsByFile[file.path] = records;
				await this.saveData(this.savedData);
			}),
		);
		this.registerEvent(
			this.app.vault.on("modify", (file) => {
				this.readingSourceCache.delete(file.path);
			}),
		);

		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor) => {
				menu.addItem((item) => item
					.setTitle("插入参数选项…")
					.setIcon("plus")
					.setSection("action")
					.onClick(() => this.openParameterSetup(editor)));
				const registered =
					findRegisteredRegionById(editor, getContextRegionId()) ||
					findRegisteredRegionAtCursor(editor);
				setContextRegionId(null);
				if (registered) {
					menu.addItem((item) => item
						.setTitle("编辑参数选项…")
						.setIcon("pencil")
						.setSection("action")
						.onClick(() => this.openParameterSetup(editor, registered.region)));
					menu.addItem((item) =>
						item
							.setTitle(registered.expanded ? "收起参数内容" : "展开参数内容")
							.setIcon(registered.expanded ? "fold-vertical" : "unfold-vertical")
							.setSection("action")
							.onClick(() => {
								registered.editorView.dispatch({
									effects: toggleRegionEffect.of(registered.region.id),
								});
								this.setRegionExpanded(
									registered.region.filePath,
									registered.region.id,
									!registered.expanded,
								);
							}),
					);
					for (const mode of [
						{ value: "standard", title: "显示方式：普通折叠" },
						{ value: "options", title: "显示方式：选项悬浮弹窗" },
					]) {
						const current = registered.region.displayMode === mode.value;
						menu.addItem((item) => {
							item
								.setTitle(`${mode.title}${current ? "（当前）" : ""}`)
								.setIcon(current ? "check" : mode.value === "options" ? "list" : "minus")
								.setSection("action");
							if (!current) {
								item.onClick(() => {
									if (
										mode.value === "options" &&
										!parseParameterOptions(registered.region.expression).length
									) {
										new Notice("没有找到可显示的参数选项");
										return;
									}
									registered.editorView.dispatch({
										effects: setRegionDisplayModeEffect.of({
											regionId: registered.region.id,
											displayMode: mode.value,
										}),
									});
									this.setRegionDisplayMode(
										registered.region.filePath,
										registered.region.id,
										mode.value,
									);
								});
							}
						});
					}
					menu.addItem((item) =>
						item
							.setTitle("取消参数折叠")
							.setIcon("x")
							.setSection("action")
							.onClick(() => {
								registered.editorView.dispatch({
									effects: removeRegionEffect.of(registered.region.id),
								});
								this.removeSavedRegion(
									registered.region.filePath,
									registered.region.id,
								);
							}),
					);
					return;
				}

				if (parseSelectedParameter(editor)) {
					menu.addItem((item) =>
						item
							.setTitle("折叠选中参数")
							.setIcon("fold-vertical")
							.setSection("action")
							.onClick(() => registerSelectedParameter(editor)),
					);
				}
			}),
		);

		this.addCommand({
			id: "fold-selected-parameter",
			name: "折叠选中的参数内容",
			editorCheckCallback: (checking, editor) => {
				const available = Boolean(parseSelectedParameter(editor));
				if (available && !checking) registerSelectedParameter(editor);
				return available;
			},
		});

		this.addCommand({
			id: "open-fold-overview",
			name: "打开折叠总览",
			callback: () => {
				new FoldOverviewModal(this.app, this).open();
			},
		});

		this.addCommand({
			id: "remove-parameter-fold-at-cursor",
			name: "取消光标处的参数折叠",
			editorCheckCallback: (checking, editor) => {
				const registered = findRegisteredRegionAtCursor(editor);
				if (registered && !checking) {
					registered.editorView.dispatch({
						effects: removeRegionEffect.of(registered.region.id),
					});
					this.removeSavedRegion(
						registered.region.filePath,
						registered.region.id,
					);
				}
				return Boolean(registered);
			},
		});
	}

	/**
	 * 阅读视图要拿到「源码全文」，才能像编辑视图那样按锚点打分定位。
	 * 一次渲染里同一篇笔记的多个代码块共享这份快照；文件改动时缓存失效。
	 */
	async getReadingSource(path) {
		const cached = this.readingSourceCache.get(path);
		if (cached) return cached;

		const file = this.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) return null;

		const text = await this.app.vault.cachedRead(file);
		const surface = createTextSurface(text);
		const entry = { text, surface, blocks: listCodeBlocks(surface) };
		this.readingSourceCache.set(path, entry);
		return entry;
	}

	async saveSettings() {
		this.savedData.settings = this.settings;
		await this.saveData(this.savedData);
	}

	async migrateSavedData() {
		let changed = this.savedData.schemaVersion !== DATA_SCHEMA_VERSION;
		const seenIds = new Set();

		for (const records of Object.values(this.savedData.foldsByFile || {})) {
			for (const record of records) {
				const legacyId = !record.id || /^parameter-fold-\d+$/.test(record.id);
				if (legacyId || seenIds.has(record.id)) {
					record.id = createRegionId();
					changed = true;
				}
				seenIds.add(record.id);

				if (!record.anchor) {
					const bracketFrom = record.expression?.indexOf("[") ?? -1;
					record.anchor = {
						label:
							bracketFrom > 0
								? record.expression.slice(0, bracketFrom).trimEnd()
								: "",
						language: "",
						blockIndex: -1,
						lineHint: null,
						prefix: "",
						suffix: "",
					};
					changed = true;
				}

				if (record.displayMode !== "options" && record.displayMode !== "standard") {
					record.displayMode = "standard";
					changed = true;
				}
			}
		}

		this.savedData.schemaVersion = DATA_SCHEMA_VERSION;
		if (changed) await this.saveData(this.savedData);
	}

	onunload() {
		if (getActivePlugin() === this) setActivePlugin(null);
	}

	async saveRegion(editor, region) {
		const file = this.app.workspace.getActiveFile();
		if (!file) return;

		const text = editor.getValue();
		let occurrence = 0;
		let position = text.indexOf(region.expression);
		while (position >= 0 && position < region.labelFrom) {
			occurrence += 1;
			position = text.indexOf(region.expression, position + region.expression.length);
		}

		const records = this.savedData.foldsByFile[file.path] || [];
		const record = {
			id: region.id,
			expression: region.expression,
			occurrence,
			expanded: false,
			displayMode: region.displayMode || "standard",
			anchor: buildAnchor(editor, region),
		};
		this.savedData.foldsByFile[file.path] = [
			...records.filter(
				(item) =>
					item.id !== record.id &&
					(item.expression !== record.expression ||
					item.occurrence !== record.occurrence),
			),
			record,
		];
		await this.saveData(this.savedData);
	}

	async setRegionExpanded(filePath, regionId, expanded) {
		if (!filePath) return;
		const records = this.savedData.foldsByFile[filePath] || [];
		const record = records.find((item) => item.id === regionId);
		if (!record) return;
		record.expanded = expanded;
		await this.saveData(this.savedData);
	}

	async setRegionDisplayMode(filePath, regionId, displayMode) {
		if (!filePath) return;
		if (displayMode !== "standard" && displayMode !== "options") return;
		const records = this.savedData.foldsByFile[filePath] || [];
		const record = records.find((item) => item.id === regionId);
		if (!record || record.displayMode === displayMode) return;
		record.displayMode = displayMode;
		await this.saveData(this.savedData);
	}

	async removeSavedRegion(filePath, regionId) {
		if (!filePath) return;
		const records = this.savedData.foldsByFile[filePath] || [];
		const remaining = records.filter((item) => item.id !== regionId);
		if (remaining.length === records.length) return;
		if (remaining.length) this.savedData.foldsByFile[filePath] = remaining;
		else delete this.savedData.foldsByFile[filePath];
		await this.saveData(this.savedData);
	}

	restoreActiveView() {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view?.file || !view.editor?.cm) return;

		const records = this.savedData.foldsByFile[view.file.path] || [];
		const text = view.editor.getValue();
		const blocks = listCodeBlocks(view.editor);
		const regions = [];
		const expandedIds = [];
		let recordsChanged = false;

		for (const record of records) {
			const match = selectRecordCandidate(view.editor, record, blocks);
			if (!match) continue;

			const bracketFromInExpression = match.expression.indexOf("[");
			if (bracketFromInExpression <= 0 || !match.expression.endsWith("]")) continue;
			const label = match.label || match.expression.slice(0, bracketFromInExpression).trimEnd();
			const region = {
				id: record.id,
				filePath: view.file.path,
				displayMode: record.displayMode || "standard",
				label,
				expression: match.expression,
				labelFrom: match.position,
				labelTo: match.position + label.length,
				bracketFrom: match.position + bracketFromInExpression,
				bracketTo: match.position + match.expression.length,
			};
			regions.push(region);
			if (record.expanded) expandedIds.push(record.id);

			let occurrence = 0;
			let position = text.indexOf(match.expression);
			while (position >= 0 && position < match.position) {
				occurrence += 1;
				position = text.indexOf(match.expression, position + match.expression.length);
			}
			const nextAnchor = buildAnchor(view.editor, region, blocks);
			if (
				record.expression !== match.expression ||
				record.occurrence !== occurrence ||
				JSON.stringify(record.anchor) !== JSON.stringify(nextAnchor)
			) {
				record.expression = match.expression;
				record.occurrence = occurrence;
				record.anchor = nextAnchor;
				recordsChanged = true;
			}
		}

		view.editor.cm.dispatch({
			effects: restoreRegionsEffect.of({ regions, expandedIds }),
		});
		if (recordsChanged) void this.saveData(this.savedData);
	}
};
