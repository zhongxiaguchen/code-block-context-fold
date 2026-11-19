const { Notice } = require("obsidian");
const { parseSelectedParameter } = require("../editor/selection");
const { parameterFoldField, addRegionEffect } = require("../editor/decorations");
const { createRegionId } = require("../util/id");
const { getActivePlugin } = require("../state");

/**
 * 把当前选区登记成一个折叠区域（不改动文本）。
 */
function registerSelectedParameter(editor) {
	const parsedRegion = parseSelectedParameter(editor);
	if (!parsedRegion) {
		new Notice("请在同一个代码块内选中完整的“参数[内容]”，支持多行");
		return false;
	}
	const plugin = getActivePlugin();
	const filePath = plugin?.app.workspace.getActiveFile()?.path;
	const region = {
		...parsedRegion,
		id: createRegionId(),
		filePath,
		displayMode: "standard",
	};

	const editorView = editor.cm;
	if (!editorView) {
		new Notice("当前编辑器不支持参数折叠");
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
