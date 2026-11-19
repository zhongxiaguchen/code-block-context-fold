const { Notice } = require("obsidian");
const { parseSelectedParameter } = require("../editor/selection");
const { parameterFoldField, addRegionEffect } = require("../editor/decorations");
const { createRegionId } = require("../util/id");
const { getActivePlugin } = require("../state");
const { t } = require("../i18n");

/**
 * 把当前选区登记成一个折叠区域（不改动文本）。
 */
function registerSelectedParameter(editor) {
	const parsedRegion = parseSelectedParameter(editor);
	if (!parsedRegion) {
		new Notice(t("notice.selectionInvalid"));
		return false;
	}
	const plugin = getActivePlugin();
	const filePath = plugin?.app.workspace.getActiveFile()?.path;
	const region = {
		...parsedRegion,
		id: createRegionId(),
		filePath,
		displayMode: plugin?.settings?.defaultDisplayMode || "standard",
	};

	const editorView = editor.cm;
	if (!editorView) {
		new Notice(t("notice.noEditor"));
		return false;
	}

	editor.setCursor(editor.getCursor("from"));
	editorView.dispatch({ effects: addRegionEffect.of(region) });
	plugin?.saveRegion(editor, region);
	return true;
}

function findRegisteredRegionAtCursor(editor) {
	const editorView = editor.cm;
	if (!editorView) return null;
	const field = editorView.state.field(parameterFoldField, false);
	if (!field) return null;

	const offset = editor.posToOffset(editor.getCursor("head"));
	const region = field.regions.find(
		(item) =>
			(offset >= item.labelFrom && offset <= item.labelTo) ||
			(offset >= item.bracketFrom && offset <= item.bracketTo),
	);
	if (!region) return null;

	return {
		region,
		expanded: field.expanded.has(region.id),
		editorView,
	};
}

function findRegisteredRegionById(editor, regionId) {
	const editorView = editor.cm;
	if (!editorView || !regionId) return null;
	const field = editorView.state.field(parameterFoldField, false);
	if (!field) return null;
	const region = field.regions.find((item) => item.id === regionId);
	if (!region) return null;
	return {
		region,
		expanded: field.expanded.has(region.id),
		editorView,
	};
}

module.exports = {
	registerSelectedParameter,
	findRegisteredRegionAtCursor,
	findRegisteredRegionById,
};
