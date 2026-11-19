import test from "node:test";
import assert from "node:assert/strict";
import Module from "node:module";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/**
 * 只实现「加载插件模块」所需的最小 API：
 * 类定义阶段会用到 Plugin / Modal 基类，以及 CodeMirror 的 define/mark/replace。
 */
function createMocks() {
	class Plugin {
		constructor(app) {
			this.app = app;
		}
		registerEditorExtension() {}
		registerEvent() {}
		addCommand() {}
		async loadData() {
			return null;
		}
		async saveData() {}
	}
	class Modal {
		constructor(app) {
			this.app = app;
			this.contentEl = {};
		}
	}
	class Menu {
		addItem() {
			return this;
		}
		showAtMouseEvent() {}
	}
	class Notice {}

	class StateEffect {}
	StateEffect.define = () => class DefinedEffect extends StateEffect {};

	const StateField = {
		define: (spec) => spec,
	};

	class Decoration {}
	Decoration.replace = () => ({ range: () => ({}) });
	Decoration.mark = () => ({ range: () => ({}) });
	Decoration.set = (ranges) => ranges;
	Decoration.none = [];

	class WidgetType {}
	WidgetType.prototype.eq = () => false;

	class EditorView {}
	EditorView.domEventHandlers = (handlers) => handlers;
	EditorView.decorations = { compute: (_deps, fn) => ({ compute: fn }) };

	return {
		obsidian: { Plugin, Modal, Menu, Notice, MarkdownView: class {} },
		"@codemirror/state": { StateEffect, StateField },
		"@codemirror/view": { Decoration, EditorView, WidgetType },
	};
}

test("构建产物能被加载并导出插件类", () => {
	const mocks = createMocks();
	const originalLoad = Module._load;
	Module._load = function (request, ...rest) {
		if (Object.hasOwn(mocks, request)) return mocks[request];
		return originalLoad.call(this, request, ...rest);
	};

	try {
		const PluginClass = require("../main.js");
		assert.equal(typeof PluginClass, "function");

		const methods = Object.getOwnPropertyNames(PluginClass.prototype);
		for (const expected of [
			"onload",
			"onunload",
			"openParameterSetup",
			"showRegionMenu",
			"restoreActiveView",
			"saveRegion",
			"removeSavedRegion",
			"setRegionExpanded",
			"setRegionDisplayMode",
			"migrateSavedData",
		]) {
			assert.ok(methods.includes(expected), `缺少方法 ${expected}`);
		}
	} finally {
		Module._load = originalLoad;
	}
});
