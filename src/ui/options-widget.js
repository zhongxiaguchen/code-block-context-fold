const { WidgetType } = require("@codemirror/view");
const { createOptionsElement } = require("./options-dom");

/**
 * 「选项悬浮弹窗」显示方式用的内联组件。
 * DOM 本身由 options-dom 提供，编辑器与阅读视图共用。
 */
class ParameterOptionsWidget extends WidgetType {
	constructor(region) {
		super();
		this.region = region;
	}

	eq(other) {
		return (
			this.region.id === other.region.id &&
			this.region.label === other.region.label &&
			this.region.expression === other.region.expression
		);
	}

	toDOM() {
		return createOptionsElement(this.region);
	}

	destroy(dom) {
		dom.cleanupOptionsPopup?.();
	}

	ignoreEvent() {
		return false;
	}
}

module.exports = { ParameterOptionsWidget };
