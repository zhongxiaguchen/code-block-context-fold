const { StateEffect, StateField } = require("@codemirror/state");
const { Decoration, EditorView } = require("@codemirror/view");
const { parseParameterOptions } = require("../format/parameters");
const { ParameterOptionsWidget } = require("../ui/options-widget");
const { getActivePlugin, setContextRegionId, getContextRegionId } = require("../state");
const { t } = require("../i18n");

/**
 * CodeMirror 侧的折叠状态：一份 region 列表 + 展开集合，派生出装饰。
 * region 的偏移量随文档变更自动 map，越界或坍缩的自动丢弃。
 */

const addRegionEffect = StateEffect.define({
	map: (region, changes) => ({
		...region,
		labelFrom: changes.mapPos(region.labelFrom, 1),
		labelTo: changes.mapPos(region.labelTo, -1),
		bracketFrom: changes.mapPos(region.bracketFrom, 1),
		bracketTo: changes.mapPos(region.bracketTo, -1),
	}),
});

const toggleRegionEffect = StateEffect.define();
const removeRegionEffect = StateEffect.define();
const restoreRegionsEffect = StateEffect.define();
const setRegionDisplayModeEffect = StateEffect.define();

function createDecorations(regions, expandedRegionIds) {
	const ranges = [];

	for (const region of regions) {
		if (region.labelTo <= region.labelFrom || region.bracketTo <= region.bracketFrom) {
			continue;
		}

		const expanded = expandedRegionIds.has(region.id);
		const options = parseParameterOptions(region.expression);
		if (region.displayMode === "options" && !expanded && options.length) {
			ranges.push(
				Decoration.replace({
					inclusive: false,
					widget: new ParameterOptionsWidget(region),
				}).range(
					region.labelFrom,
					region.bracketTo,
				),
			);
			continue;
		}

		ranges.push(
			Decoration.mark({
				class: "inline-code-fold-label",
				attributes: {
					"data-inline-code-fold-id": region.id,
					title: t("a11y.toggle", { label: region.label }),
				},
			}).range(region.labelFrom, region.labelTo),
		);

		if (!expanded) {
			ranges.push(
				Decoration.replace({ inclusive: false }).range(region.bracketFrom, region.bracketTo),
			);
		}
	}

	return Decoration.set(ranges, true);
}

const parameterFoldField = StateField.define({
	create: () => ({
		regions: [],
		expanded: new Set(),
		decorations: Decoration.none,
	}),
	update: (value, transaction) => {
		let regions = value.regions;
		const expanded = new Set(value.expanded);
		let changed = transaction.docChanged;

		if (transaction.docChanged) {
			regions = regions
				.map((region) => ({
					...region,
					labelFrom: transaction.changes.mapPos(region.labelFrom, 1),
					labelTo: transaction.changes.mapPos(region.labelTo, -1),
					bracketFrom: transaction.changes.mapPos(region.bracketFrom, 1),
					bracketTo: transaction.changes.mapPos(region.bracketTo, -1),
				}))
				.filter(
					(region) =>
						region.labelTo > region.labelFrom &&
						region.bracketTo > region.bracketFrom,
				);
		}

		for (const effect of transaction.effects) {
			if (effect.is(restoreRegionsEffect)) {
				regions = effect.value.regions;
				expanded.clear();
				for (const regionId of effect.value.expandedIds) expanded.add(regionId);
				changed = true;
				continue;
			}

			if (effect.is(addRegionEffect)) {
				regions = [
					...regions.filter((region) => region.id !== effect.value.id),
					effect.value,
				];
				changed = true;
				continue;
			}

			if (effect.is(toggleRegionEffect)) {
				const regionId = effect.value;
				if (expanded.has(regionId)) expanded.delete(regionId);
				else expanded.add(regionId);
				changed = true;
				continue;
			}

			if (effect.is(removeRegionEffect)) {
				const regionId = effect.value;
				regions = regions.filter((region) => region.id !== regionId);
				expanded.delete(regionId);
				changed = true;
				continue;
			}

			if (effect.is(setRegionDisplayModeEffect)) {
				regions = regions.map((region) =>
					region.id === effect.value.regionId
						? { ...region, displayMode: effect.value.displayMode }
						: region,
				);
				changed = true;
			}
		}

		if (!changed) return value;
		return {
			regions,
			expanded,
			decorations: createDecorations(regions, expanded),
		};
	},
	provide: (field) =>
		EditorView.decorations.compute([field], (state) =>
			state.field(field).decorations,
		),
});

/**
 * 标签上的鼠标交互：右键出菜单，左键点按展开/收起。
 * 为了让点击落在标签上而不是移动光标，mousedown 阶段就阻止默认行为。
 */
const labelClickHandler = EditorView.domEventHandlers({
	contextmenu: (event, view) => {
		const target = event.target;
		if (!(target instanceof Element)) return false;
		const label = target.closest(".inline-code-fold-label");
		setContextRegionId(label?.getAttribute("data-inline-code-fold-id") || null);
		const regionId = getContextRegionId();
		const plugin = getActivePlugin();
		if (regionId && plugin) {
			event.preventDefault();
			plugin.showRegionMenu(event, view, regionId);
			setContextRegionId(null);
			return true;
		}
		return false;
	},
	mousedown: (event) => {
		const target = event.target;
		if (!(target instanceof Element)) return false;
		if (!target.closest(".inline-code-fold-label")) return false;
		if (event.button !== 0) return false;
		event.preventDefault();
		return true;
	},
	click: (event, view) => {
		const target = event.target;
		if (!(target instanceof Element)) return false;
		const label = target.closest(".inline-code-fold-label");
		if (!label) return false;

		const regionId = label.getAttribute("data-inline-code-fold-id");
		if (!regionId) return false;
		const field = view.state.field(parameterFoldField, false);
		const region = field?.regions.find((item) => item.id === regionId);
		if (!region) return false;
		if (region.displayMode === "options" && !field.expanded.has(regionId)) {
			event.preventDefault();
			return true;
		}
		const willExpand = !field?.expanded.has(regionId);
		event.preventDefault();
		view.dispatch({ effects: toggleRegionEffect.of(regionId) });
		getActivePlugin()?.setRegionExpanded(region.filePath, regionId, willExpand);
		return true;
	},
});

module.exports = {
	addRegionEffect,
	toggleRegionEffect,
	removeRegionEffect,
	restoreRegionsEffect,
	setRegionDisplayModeEffect,
	createDecorations,
	parameterFoldField,
	labelClickHandler,
};
