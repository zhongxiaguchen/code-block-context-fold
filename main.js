/* 由 scripts/build.mjs 生成，请勿直接编辑；源码在 src/ */
"use strict";
const __modules = Object.create(null);
const __cache = Object.create(null);
function __require(id) {
	if (__cache[id]) return __cache[id].exports;
	const module = { exports: {} };
	__cache[id] = module;
	__modules[id](module, module.exports, __require);
	return module.exports;
}
__modules["./src/format/parameters.js"] = function (module, exports, __require) {
/**
 * 参数表达式的解析与序列化。
 *
 * 存储格式：`参数名[ 每行一个选项 ]`，`//` 之后到行尾是注释。
 *
 *   混合模式[
 *     Normal//正常混合
 *     Add//相加，越高越亮
 *   ]
 *
 * 用换行分隔选项（而不是某个分隔符），参数名、选项名和注释里就都能自由出现
 * `_`、`=`、括号以外的符号；只有方括号仍然是结构字符。
 */

function parseParameterOptions(expression) {
	const bracketFrom = expression.indexOf("[");
	if (bracketFrom < 0 || !expression.endsWith("]")) return [];
	const content = expression.slice(bracketFrom + 1, -1);
	return content
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => {
			const commentFrom = line.indexOf("//");
			const value = (commentFrom >= 0 ? line.slice(0, commentFrom) : line).trim();
			const comment = commentFrom >= 0 ? line.slice(commentFrom + 2).trim() : "";
			return value ? { value, comment } : null;
		})
		.filter(Boolean);
}

function serializeParameterOptions(label, options) {
	label = String(label || "").trim();
	if (!label) throw new Error("请填写参数名称");
	if (/[\r\n\[\]]/.test(label)) throw new Error("参数名称不能包含换行或方括号");
	if (!options.length) throw new Error("请至少添加一个选项");

	const parts = options.map((option) => {
		const value = String(option.value || "").trim();
		// 注释允许换行输入，但落盘时压成一行——换行现在是选项分隔符
		const comment = String(option.comment || "").replace(/\s+/g, " ").trim();
		if (!value) throw new Error("每个选项都需要填写名称");
		if (/[\r\n\[\]]/.test(value)) throw new Error("选项名称不能包含换行或方括号");
		if (value.includes("//")) throw new Error("选项名称不能包含 //，它会被当成注释起点");
		if (/[\[\]]/.test(comment)) throw new Error("注释不能包含方括号");
		return "  " + value + (comment ? "//" + comment : "");
	});

	return label + "[\n" + parts.join("\n") + "\n]";
}

module.exports = { parseParameterOptions, serializeParameterOptions };
};
__modules["./src/ui/options-dom.js"] = function (module, exports, __require) {
const { parseParameterOptions } = __require("./src/format/parameters.js");

/**
 * 「参数 ▾」药丸 + 选项悬浮面板的 DOM。
 * 编辑器里的 Widget 和阅读视图的后期渲染共用同一份结构，样式与交互只维护一次。
 */
function createOptionsElement(region, { hint = `${region.label}：悬浮查看选项，右键展开原文` } = {}) {
	const root = document.createElement("span");
	root.className = "inline-code-fold-options";

	const label = document.createElement("span");
	label.className = "inline-code-fold-label inline-code-fold-label--options";
	label.setAttribute("data-inline-code-fold-id", region.id);
	label.setAttribute("tabindex", "0");
	label.setAttribute("aria-label", hint);
	label.textContent = `${region.label} ▾`;
	root.appendChild(label);

	const panel = document.createElement("span");
	panel.className = "inline-code-fold-options-panel";
	panel.setAttribute("role", "list");

	for (const option of parseParameterOptions(region.expression)) {
		const row = document.createElement("span");
		row.className = "inline-code-fold-option";
		row.setAttribute("role", "listitem");
		row.setAttribute("tabindex", "0");

		const value = document.createElement("span");
		value.className = "inline-code-fold-option-value";
		value.textContent = option.value;
		row.appendChild(value);

		const comment = document.createElement("span");
		comment.className = "inline-code-fold-option-comment";
		comment.textContent = option.comment || "暂无注释";
		row.appendChild(comment);
		panel.appendChild(row);
	}

	let closeTimer = null;
	const cancelClose = () => window.clearTimeout(closeTimer);
	const close = () => {
		cancelClose();
		panel.remove();
	};
	const scheduleClose = () => {
		cancelClose();
		closeTimer = window.setTimeout(close, 180);
	};
	const open = () => {
		cancelClose();
		if (!panel.isConnected) document.body.appendChild(panel);
		const rect = label.getBoundingClientRect();
		const panelRect = panel.getBoundingClientRect();
		panel.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - panelRect.width - 8))}px`;
		panel.style.top = `${Math.max(8, rect.bottom + panelRect.height + 8 > window.innerHeight ? rect.top - panelRect.height - 6 : rect.bottom + 6)}px`;
	};
	root.addEventListener("mouseenter", open);
	root.addEventListener("mouseleave", scheduleClose);
	root.addEventListener("focusin", open);
	root.addEventListener("focusout", scheduleClose);
	panel.addEventListener("mouseenter", cancelClose);
	panel.addEventListener("mouseleave", scheduleClose);
	panel.addEventListener("focusin", cancelClose);
	panel.addEventListener("focusout", scheduleClose);
	const onKeyDown = (event) => {
		if (event.key === "Escape") close();
	};
	root.addEventListener("keydown", onKeyDown);
	panel.addEventListener("keydown", onKeyDown);
	for (const row of panel.children) {
		const positionComment = () => {
			const comment = row.querySelector(".inline-code-fold-option-comment");
			const rowRect = row.getBoundingClientRect();
			const commentRect = comment.getBoundingClientRect();
			const left = rowRect.right + 10 + commentRect.width <= window.innerWidth - 8
				? rowRect.right + 10
				: Math.max(8, rowRect.left - commentRect.width - 10);
			comment.style.left = `${left}px`;
			comment.style.top = `${Math.max(8, Math.min(rowRect.top, window.innerHeight - commentRect.height - 8))}px`;
		};
		row.addEventListener("mouseenter", positionComment);
		row.addEventListener("focus", positionComment);
	}
	window.addEventListener("resize", close);
	const onScroll = (event) => {
		if (!panel.contains(event.target)) close();
	};
	window.addEventListener("scroll", onScroll, true);
	root.cleanupOptionsPopup = () => {
		close();
		window.removeEventListener("resize", close);
		window.removeEventListener("scroll", onScroll, true);
	};
	return root;
}

module.exports = { createOptionsElement };
};
__modules["./src/ui/options-widget.js"] = function (module, exports, __require) {
const { WidgetType } = require("@codemirror/view");
const { createOptionsElement } = __require("./src/ui/options-dom.js");

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
};
__modules["./src/state.js"] = function (module, exports, __require) {
/**
 * 跨模块共享的插件级状态。
 *
 * CodeMirror 的装饰与事件处理不持有插件实例，因此通过这里访问当前插件。
 * 单独成模块是为了避免 editor/ 与 main 之间形成循环依赖。
 */

let activePlugin = null;
let contextRegionId = null;

function setActivePlugin(plugin) {
	activePlugin = plugin;
}

function getActivePlugin() {
	return activePlugin;
}

function setContextRegionId(regionId) {
	contextRegionId = regionId;
}

function getContextRegionId() {
	return contextRegionId;
}

module.exports = {
	setActivePlugin,
	getActivePlugin,
	setContextRegionId,
	getContextRegionId,
};
};
__modules["./src/editor/decorations.js"] = function (module, exports, __require) {
const { StateEffect, StateField } = require("@codemirror/state");
const { Decoration, EditorView } = require("@codemirror/view");
const { parseParameterOptions } = __require("./src/format/parameters.js");
const { ParameterOptionsWidget } = __require("./src/ui/options-widget.js");
const { getActivePlugin, setContextRegionId, getContextRegionId } = __require("./src/state.js");

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
					title: `${region.label}：点击展开或收起`,
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
};
__modules["./src/editor/blocks.js"] = function (module, exports, __require) {
/**
 * 代码围栏（``` / ~~~）的扫描。所有位置都基于编辑器偏移量。
 */

function listCodeBlocks(editor) {
	const blocks = [];
	let opening = null;

	for (let lineNumber = 0; lineNumber < editor.lineCount(); lineNumber += 1) {
		const line = editor.getLine(lineNumber);
		if (!opening) {
			const match = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
			if (!match) continue;
			opening = {
				openingLine: lineNumber,
				character: match[1][0],
				length: match[1].length,
				language: match[2].trim().split(/\s+/, 1)[0] || "",
			};
			continue;
		}

		const trimmed = line.trimStart();
		let count = 0;
		while (trimmed[count] === opening.character) count += 1;
		const closes = count >= opening.length && trimmed.slice(count).trim().length === 0;
		if (!closes) continue;

		blocks.push({
			...opening,
			index: blocks.length,
			closingLine: lineNumber,
			contentFrom: editor.posToOffset({ line: opening.openingLine + 1, ch: 0 }),
			contentTo: editor.posToOffset({ line: lineNumber, ch: 0 }),
		});
		opening = null;
	}

	if (opening) {
		const contentLine = opening.openingLine + 1;
		blocks.push({
			...opening,
			index: blocks.length,
			closingLine: editor.lineCount(),
			contentFrom:
				contentLine < editor.lineCount()
					? editor.posToOffset({ line: contentLine, ch: 0 })
					: editor.getValue().length,
			contentTo: editor.getValue().length,
		});
	}

	return blocks;
}

function findBlockForRange(blocks, from, to) {
	return blocks.find((block) => from >= block.contentFrom && to <= block.contentTo) || null;
}

function findContainingCodeBlock(editor, fromLine, toLine) {
	let opening = null;

	for (let lineNumber = 0; lineNumber < editor.lineCount(); lineNumber += 1) {
		const line = editor.getLine(lineNumber);

		if (!opening) {
			const match = line.match(/^ {0,3}(`{3,}|~{3,})/);
			if (match) {
				opening = {
					line: lineNumber,
					character: match[1][0],
					length: match[1].length,
				};
			}
			continue;
		}

		const text = line.trimStart();
		let count = 0;
		while (text[count] === opening.character) count += 1;
		const closes = count >= opening.length && text.slice(count).trim().length === 0;
		if (!closes) continue;

		if (opening.line < fromLine && lineNumber > toLine) return opening;
		opening = null;
	}

	return opening && opening.line < fromLine ? opening : null;
}

module.exports = { listCodeBlocks, findBlockForRange, findContainingCodeBlock };
};
__modules["./src/editor/selection.js"] = function (module, exports, __require) {
const { findContainingCodeBlock } = __require("./src/editor/blocks.js");

/**
 * 把「用户选中的一段 参数[内容]」解析成可装饰的区间。
 * 只有完全位于同一个代码块内、且方括号配平的选区才会被接受。
 */
function parseSelectedParameter(editor) {
	if (!editor.somethingSelected()) return null;

	const selectionFrom = editor.getCursor("from");
	const selectionTo = editor.getCursor("to");
	if (!findContainingCodeBlock(editor, selectionFrom.line, selectionTo.line)) return null;

	const selectedText = editor.getSelection();

	const leadingWhitespace = selectedText.length - selectedText.trimStart().length;
	const expression = selectedText.trim();
	const bracketFromInExpression = expression.indexOf("[");
	if (bracketFromInExpression <= 0) return null;

	let depth = 0;
	let bracketToInExpression = -1;
	for (let index = bracketFromInExpression; index < expression.length; index += 1) {
		if (expression[index] === "[") depth += 1;
		if (expression[index] === "]") depth -= 1;
		if (depth === 0) {
			bracketToInExpression = index + 1;
			break;
		}
	}

	if (depth !== 0 || bracketToInExpression !== expression.length) return null;
	const label = expression.slice(0, bracketFromInExpression).trimEnd();
	if (!label || /[\r\n]/.test(label)) return null;

	const selectionOffset = editor.posToOffset(selectionFrom) + leadingWhitespace;
	const labelFrom = selectionOffset;
	const labelTo = selectionOffset + label.length;
	const bracketFrom = selectionOffset + bracketFromInExpression;
	const bracketTo = selectionOffset + expression.length;

	return {
		label,
		expression,
		labelFrom,
		labelTo,
		bracketFrom,
		bracketTo,
	};
}

module.exports = { parseSelectedParameter };
};
__modules["./src/util/text.js"] = function (module, exports, __require) {
/**
 * 折叠位置锚点用到的文本归一化与相似度工具。
 */

function normalizeContext(text) {
	return text.replace(/\s+/g, " ").trim();
}

function commonPrefixLength(left, right) {
	const limit = Math.min(left.length, right.length);
	let length = 0;
	while (length < limit && left[length] === right[length]) length += 1;
	return length;
}

function commonSuffixLength(left, right) {
	const limit = Math.min(left.length, right.length);
	let length = 0;
	while (
		length < limit &&
		left[left.length - 1 - length] === right[right.length - 1 - length]
	) {
		length += 1;
	}
	return length;
}

module.exports = { normalizeContext, commonPrefixLength, commonSuffixLength };
};
__modules["./src/editor/anchor.js"] = function (module, exports, __require) {
const { listCodeBlocks, findBlockForRange } = __require("./src/editor/blocks.js");
const { normalizeContext } = __require("./src/util/text.js");

const ANCHOR_CONTEXT_LENGTH = 64;

function hasUsefulAnchor(anchor) {
	return Boolean(
		anchor &&
			(anchor.language ||
				(Number.isInteger(anchor.blockIndex) && anchor.blockIndex >= 0) ||
				Number.isInteger(anchor.lineHint) ||
				anchor.prefix ||
				anchor.suffix),
	);
}

/**
 * 记录一个折叠位置周围的稳定特征，供下次打开笔记时重新定位。
 */
function buildAnchor(editor, region, blocks = listCodeBlocks(editor)) {
	const text = editor.getValue();
	const block = findBlockForRange(blocks, region.labelFrom, region.bracketTo);
	const lineHint = editor.offsetToPos(region.labelFrom).line;
	const lowerBound = block?.contentFrom ?? 0;
	const upperBound = block?.contentTo ?? text.length;
	return {
		label: region.label,
		language: block?.language || "",
		blockIndex: block?.index ?? -1,
		lineHint,
		prefix: normalizeContext(
			text.slice(Math.max(lowerBound, region.labelFrom - ANCHOR_CONTEXT_LENGTH), region.labelFrom),
		),
		suffix: normalizeContext(
			text.slice(region.bracketTo, Math.min(upperBound, region.bracketTo + ANCHOR_CONTEXT_LENGTH)),
		),
	};
}

module.exports = { ANCHOR_CONTEXT_LENGTH, hasUsefulAnchor, buildAnchor };
};
__modules["./src/editor/recover.js"] = function (module, exports, __require) {
const { findBlockForRange } = __require("./src/editor/blocks.js");
const { ANCHOR_CONTEXT_LENGTH, hasUsefulAnchor } = __require("./src/editor/anchor.js");
const {
	normalizeContext,
	commonPrefixLength,
	commonSuffixLength,
} = __require("./src/util/text.js");

/**
 * 在笔记被改动之后，为一条历史记录重新找到对应的文本位置。
 *
 * 策略：先按完整表达式精确匹配；找不到时退化为「标签 + 配平方括号」，
 * 再用锚点打分。命中多个候选且分差不够大时宁可放弃，也不猜。
 */

function findBalancedExpressionEnd(text, bracketFrom, limit) {
	let depth = 0;
	for (let index = bracketFrom; index < limit; index += 1) {
		if (text[index] === "[") depth += 1;
		if (text[index] === "]") depth -= 1;
		if (depth === 0) return index + 1;
	}
	return -1;
}

function collectRecordCandidates(editor, record, blocks) {
	const text = editor.getValue();
	const exact = [];
	let searchFrom = 0;
	while (record.expression && searchFrom <= text.length) {
		const position = text.indexOf(record.expression, searchFrom);
		if (position < 0) break;
		const block = findBlockForRange(blocks, position, position + record.expression.length);
		if (block) {
			exact.push({
				position,
				expression: record.expression,
				label: record.anchor?.label || record.expression.slice(0, record.expression.indexOf("[")).trimEnd(),
				block,
				exact: true,
			});
		}
		searchFrom = position + Math.max(record.expression.length, 1);
	}

	if (exact.length) return exact;

	const label = record.anchor?.label || record.expression?.slice(0, record.expression.indexOf("[")).trimEnd();
	if (!label) return [];
	const token = `${label}[`;
	const fallback = [];
	for (const block of blocks) {
		let position = text.indexOf(token, block.contentFrom);
		while (position >= 0 && position < block.contentTo) {
			const bracketFrom = position + label.length;
			const end = findBalancedExpressionEnd(text, bracketFrom, block.contentTo);
			if (end > bracketFrom) {
				fallback.push({
					position,
					expression: text.slice(position, end),
					label,
					block,
					exact: false,
				});
			}
			position = text.indexOf(token, Math.max(position + token.length, end));
		}
	}
	return fallback;
}

function scoreCandidate(editor, record, candidate) {
	let score = candidate.exact ? 100 : 0;
	const anchor = record.anchor || {};
	const text = editor.getValue();
	const line = editor.offsetToPos(candidate.position).line;

	if (anchor.language && anchor.language === candidate.block.language) score += 18;
	if (Number.isInteger(anchor.blockIndex) && anchor.blockIndex === candidate.block.index) score += 12;
	if (Number.isInteger(anchor.lineHint)) {
		score += Math.max(0, 18 - Math.min(18, Math.abs(anchor.lineHint - line)));
	}

	const prefix = normalizeContext(
		text.slice(
			Math.max(candidate.block.contentFrom, candidate.position - ANCHOR_CONTEXT_LENGTH),
			candidate.position,
		),
	);
	const suffix = normalizeContext(
		text.slice(
			candidate.position + candidate.expression.length,
			Math.min(
				candidate.block.contentTo,
				candidate.position + candidate.expression.length + ANCHOR_CONTEXT_LENGTH,
			),
		),
	);
	if (anchor.prefix) {
		score += (commonSuffixLength(anchor.prefix, prefix) / Math.max(anchor.prefix.length, 1)) * 25;
	}
	if (anchor.suffix) {
		score += (commonPrefixLength(anchor.suffix, suffix) / Math.max(anchor.suffix.length, 1)) * 25;
	}
	return score;
}

function selectRecordCandidate(editor, record, blocks) {
	const candidates = collectRecordCandidates(editor, record, blocks);
	if (!candidates.length) return null;
	const ranked = candidates
		.map((candidate) => ({ candidate, score: scoreCandidate(editor, record, candidate) }))
		.sort((left, right) => right.score - left.score);

	if (ranked.length === 1) {
		if (!ranked[0].candidate.exact && ranked[0].score < 28) return null;
		return ranked[0].candidate;
	}

	const margin = ranked[0].score - ranked[1].score;
	if (ranked[0].candidate.exact && !hasUsefulAnchor(record.anchor)) {
		return candidates[record.occurrence] || ranked[0].candidate;
	}
	if (margin < 8) return null;
	if (!ranked[0].candidate.exact && ranked[0].score < 40) return null;
	return ranked[0].candidate;
}

module.exports = {
	findBalancedExpressionEnd,
	collectRecordCandidates,
	scoreCandidate,
	selectRecordCandidate,
};
};
__modules["./src/util/id.js"] = function (module, exports, __require) {
function createRegionId() {
	const uuid = globalThis.crypto?.randomUUID?.();
	if (uuid) return `parameter-fold-${uuid}`;
	return `parameter-fold-${Date.now().toString(36)}-${Math.random()
		.toString(36)
		.slice(2, 12)}`;
}

module.exports = { createRegionId };
};
__modules["./src/ui/setup-modal.js"] = function (module, exports, __require) {
const { Modal, Notice } = require("obsidian");
const { parseParameterOptions, serializeParameterOptions } = __require("./src/format/parameters.js");

/**
 * 参数选项编辑器：名称 + 若干「选项 / 注释」行，保存时序列化成折叠表达式。
 */
class ParameterSetupModal extends Modal {
	constructor(app, initial, onSave) {
		super(app);
		this.initial = initial;
		this.onSave = onSave;
	}

	onOpen() {
		const content = this.contentEl;
		content.replaceChildren();
		content.classList.add("parameter-setup");
		const append = (parent, tag, text, className) => {
			const element = document.createElement(tag);
			if (text) element.textContent = text;
			if (className) element.className = className;
			parent.appendChild(element);
			return element;
		};
		append(content, "h2", this.initial ? "编辑参数选项" : "插入参数选项");
		append(content, "p", "1. 设置参数名称 → 2. 添加选项和注释 → 3. 保存为悬浮弹窗。分隔符会自动生成。");
		const nameLabel = append(content, "label", "参数名称");
		const name = append(nameLabel, "input");
		name.type = "text";
		name.placeholder = "例如：混合模式";
		name.value = this.initial?.label || "";
		append(content, "h3", "选项与注释");
		const list = append(content, "div");
		const rows = [];
		const addRow = (option = { value: "", comment: "" }) => {
			const row = append(list, "div", "", "parameter-setup-row");
			const valueLabel = append(row, "label", "选项名称");
			const value = append(valueLabel, "input");
			value.type = "text";
			value.placeholder = "例如：Normal";
			value.value = option.value;
			const commentLabel = append(row, "label", "注释（可选）");
			const comment = append(commentLabel, "input");
			comment.type = "text";
			comment.placeholder = "例如：剔除背面，默认值";
			comment.value = option.comment;
			const remove = append(row, "button", "删除此选项");
			remove.type = "button";
			const entry = { row, value, comment };
			rows.push(entry);
			remove.addEventListener("click", () => {
				rows.splice(rows.indexOf(entry), 1);
				row.remove();
			});
		};
		const options = this.initial ? parseParameterOptions(this.initial.expression) : [];
		for (const option of options.length ? options : [{ value: "", comment: "" }]) addRow(option);
		const add = append(content, "button", "+ 添加一个选项");
		add.type = "button";
		add.addEventListener("click", () => addRow());
		append(content, "p", "每行一个选项，// 之后是注释。参数名、选项名和注释里不能出现方括号。");
		const actions = append(content, "div", "", "parameter-setup-actions");
		const cancel = append(actions, "button", "取消");
		cancel.addEventListener("click", () => this.close());
		const save = append(actions, "button", this.initial ? "保存修改" : "插入并折叠", "mod-cta");
		save.addEventListener("click", async () => {
			try {
				const expression = serializeParameterOptions(name.value, rows.map((entry) => ({
					value: entry.value.value, comment: entry.comment.value,
				})));
				save.disabled = true;
				await this.onSave(expression, name.value.trim());
				this.close();
			} catch (error) {
				new Notice(error.message || "保存失败，请重试");
				save.disabled = false;
			}
		});
		name.focus();
	}

	onClose() {
		this.contentEl.replaceChildren();
	}
}

module.exports = { ParameterSetupModal };
};
__modules["./src/settings/overview.js"] = function (module, exports, __require) {
/**
 * 折叠总览：把 data.json 里的记录摊平成「按笔记分组」的列表，并可按键词过滤。
 *
 * 纯函数，不碰 Obsidian API——文件是否存在由调用方用 fileExists 判断，
 * 这样分组、排序、失效识别、搜索都能单独测。
 */

const PREVIEW_LENGTH = 42;

function labelOf(record) {
	if (record.anchor?.label) return record.anchor.label;
	const expression = record.expression || "";
	const bracketFrom = expression.indexOf("[");
	return bracketFrom > 0 ? expression.slice(0, bracketFrom).trimEnd() : expression;
}

function previewOf(record) {
	const expression = record.expression || "";
	const bracketFrom = expression.indexOf("[");
	if (bracketFrom < 0) return "";
	const content = expression.slice(bracketFrom + 1, expression.endsWith("]") ? -1 : undefined);
	const firstLine = content
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)[0] || "";
	const text = firstLine || content.trim();
	return text.length > PREVIEW_LENGTH ? text.slice(0, PREVIEW_LENGTH) + "…" : text;
}

function normalizeQuery(query) {
	return String(query || "").trim().toLowerCase();
}

function includes(haystack, needle) {
	return String(haystack || "").toLowerCase().includes(needle);
}

/**
 * 过滤规则：
 * - 笔记路径命中 → 这篇笔记下的折叠全部保留（想找某篇笔记时更顺手）
 * - 否则只保留标签或选项预览命中的记录
 */
function buildOverview(savedData, fileExists, query = "") {
	const needle = normalizeQuery(query);
	const groups = [];
	const stale = [];
	const foldsByFile = savedData?.foldsByFile || {};
	let allTotal = 0;

	for (const [path, records] of Object.entries(foldsByFile)) {
		if (!Array.isArray(records) || !records.length) continue;

		if (!fileExists(path)) {
			if (!needle || includes(path, needle)) {
				stale.push({ path, count: records.length });
			}
			continue;
		}

		allTotal += records.length;

		const pathMatches = needle && includes(path, needle);
		const matched = records
			.map((record) => ({
				id: record.id,
				label: labelOf(record),
				preview: previewOf(record),
				displayMode: record.displayMode === "options" ? "options" : "standard",
				expanded: Boolean(record.expanded),
			}))
			.filter((record) => !needle || pathMatches || includes(record.label, needle) || includes(record.preview, needle));

		if (!matched.length) continue;
		groups.push({ path, records: matched });
	}

	groups.sort((left, right) => left.path.localeCompare(right.path, "zh"));
	stale.sort((left, right) => left.path.localeCompare(right.path, "zh"));

	return {
		groups,
		stale,
		total: groups.reduce((sum, group) => sum + group.records.length, 0),
		allTotal,
		filtered: Boolean(needle),
	};
}

module.exports = { buildOverview, labelOf, previewOf, normalizeQuery, PREVIEW_LENGTH };
};
__modules["./src/ui/overview-modal.js"] = function (module, exports, __require) {
const { MarkdownView, Modal } = require("obsidian");
const { buildOverview } = __require("./src/settings/overview.js");
const { parameterFoldField, removeRegionEffect } = __require("./src/editor/decorations.js");

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
};
__modules["./src/ui/settings-tab.js"] = function (module, exports, __require) {
const { PluginSettingTab, Setting } = require("obsidian");
const FoldOverviewModal = __require("./src/ui/overview-modal.js");

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
};
__modules["./src/settings/defaults.js"] = function (module, exports, __require) {
/**
 * 插件设置：只有开关类选项，没有需要调参的数值。
 * 设置和折叠记录存在同一个 data.json 里，多一个 settings 字段。
 */

const DEFAULT_SETTINGS = Object.freeze({
	defaultDisplayMode: "standard",
	readingView: true,
});

function normalizeSettings(raw) {
	const source = raw && typeof raw === "object" ? raw : {};
	return {
		defaultDisplayMode: source.defaultDisplayMode === "options" ? "options" : "standard",
		readingView: source.readingView !== false,
	};
}

module.exports = { DEFAULT_SETTINGS, normalizeSettings };
};
__modules["./src/editor/text-range.js"] = function (module, exports, __require) {
/**
 * 在「一组文本节点」上定位一个字符区间。
 *
 * 阅读视图里，代码块的文本被语法高亮拆成了很多个文本节点，
 * 一个跨了若干 token 的表达式无法只靠单个节点替换。
 * 这里只做纯计算：给定各节点长度和全局区间，算出起止落在哪个节点、哪个偏移。
 * DOM 的实际切分与插入留给调用方，便于单独测试。
 */

function locateRange(lengths, start, end) {
	if (!(end > start) || start < 0) return null;

	let offset = 0;
	let startIndex = -1;
	let startOffset = 0;
	let endIndex = -1;
	let endOffset = 0;

	for (let index = 0; index < lengths.length; index += 1) {
		const length = lengths[index];
		if (length === 0) continue;

		if (startIndex < 0 && start >= offset && start < offset + length) {
			startIndex = index;
			startOffset = start - offset;
		}
		// 区间的末尾是开区间：end 正好落在节点边界时，归属前一个节点
		if (endIndex < 0 && end > offset && end <= offset + length) {
			endIndex = index;
			endOffset = end - offset;
		}

		offset += length;
	}

	if (startIndex < 0 || endIndex < 0 || endIndex < startIndex) return null;
	return { startIndex, startOffset, endIndex, endOffset };
}

module.exports = { locateRange };
};
__modules["./src/reading/render.js"] = function (module, exports, __require) {
const { parseParameterOptions } = __require("./src/format/parameters.js");
const { createOptionsElement } = __require("./src/ui/options-dom.js");
const { locateRange } = __require("./src/editor/text-range.js");

const SHOW_TEXT = 4;

/**
 * 阅读视图（以及导出 PDF）里的折叠渲染。
 *
 * 编辑视图有 CodeMirror 的装饰系统，阅读视图只有已经渲染好的 HTML：
 * 语法高亮会把代码拆成一堆 <span> 和文本节点，所以这里先在文本节点层面
 * 定位区间，再就地切开插入标签，尽量不破坏高亮。
 *
 * 「折叠位置应该在哪」不在这里算——它由 reading/source.js 复用编辑视图的
 * 锚点打分得出，这里只负责把结果画出来。
 */

function collectTextNodes(root) {
	const nodes = [];
	const walker = document.createTreeWalker(root, SHOW_TEXT);
	while (walker.nextNode()) nodes.push(walker.currentNode);
	return nodes;
}

function replaceRangeInDom(root, start, end, widget) {
	const nodes = collectTextNodes(root);
	const plan = locateRange(nodes.map((node) => node.nodeValue.length), start, end);
	if (!plan) return false;

	const startNode = nodes[plan.startIndex];
	const endNode = nodes[plan.endIndex];
	const startValue = startNode.nodeValue;
	const endValue = endNode.nodeValue;
	const parent = startNode.parentNode;

	startNode.nodeValue = startValue.slice(0, plan.startOffset);
	parent.insertBefore(widget, startNode.nextSibling);

	if (plan.startIndex === plan.endIndex) {
		const tail = endValue.slice(plan.endOffset);
		if (tail) parent.insertBefore(document.createTextNode(tail), widget.nextSibling);
	} else {
		endNode.nodeValue = endValue.slice(plan.endOffset);
		for (let index = plan.startIndex + 1; index < plan.endIndex; index += 1) {
			nodes[index].remove();
		}
	}

	return true;
}

function createReadingFold(region) {
	const wrap = document.createElement("span");
	wrap.className = "inline-code-fold-reading";

	const options = parseParameterOptions(region.expression);
	let trigger;
	if (region.displayMode === "options" && options.length) {
		trigger = createOptionsElement(region, {
			hint: `${region.label}：悬浮查看选项，点击展开原文`,
		});
	} else {
		trigger = document.createElement("span");
		trigger.className = "inline-code-fold-label";
		trigger.setAttribute("tabindex", "0");
		trigger.setAttribute("role", "button");
		trigger.textContent = region.label;
	}

	const content = document.createElement("span");
	content.className = "inline-code-fold-content";
	content.hidden = true;
	content.textContent = region.expression.slice(region.label.length);

	wrap.append(trigger, content);
	trigger.addEventListener("click", (event) => {
		event.preventDefault();
		content.hidden = !content.hidden;
	});

	return wrap;
}

/**
 * 在已经渲染好的代码块里应用若干区间。
 * 从后往前替换，前面的偏移量就不会因为 DOM 变化而失效。
 */
function applyReadingRegions(codeElement, regions) {
	const ordered = [...regions].sort((left, right) => right.localFrom - left.localFrom);
	let applied = 0;
	for (const region of ordered) {
		const widget = createReadingFold(region);
		if (replaceRangeInDom(codeElement, region.localFrom, region.localFrom + region.length, widget)) {
			applied += 1;
		}
	}
	return applied;
}

module.exports = { collectTextNodes, replaceRangeInDom, createReadingFold, applyReadingRegions };
};
__modules["./src/reading/source.js"] = function (module, exports, __require) {
const { listCodeBlocks } = __require("./src/editor/blocks.js");
const { selectRecordCandidate } = __require("./src/editor/recover.js");

/**
 * 阅读视图没有 CodeMirror 编辑器，但折叠位置复原需要「全文 + 代码块列表 + 偏移换算」。
 * 这里用纯文本拼一个只实现这几个方法的替身，让 selectRecordCandidate 原样复用，
 * 编辑视图和阅读视图因此共享同一套锚点打分，而不是各自一套匹配规则。
 */
function createTextSurface(text) {
	const lines = text.split("\n");
	const lineStarts = [];
	let offset = 0;
	for (const line of lines) {
		lineStarts.push(offset);
		offset += line.length + 1;
	}

	return {
		getValue: () => text,
		lineCount: () => lines.length,
		getLine: (index) => lines[index] ?? "",
		posToOffset: ({ line, ch }) => (lineStarts[line] ?? text.length) + ch,
		offsetToPos: (pos) => {
			let line = 0;
			while (line + 1 < lineStarts.length && lineStarts[line + 1] <= pos) line += 1;
			return { line, ch: pos - lineStarts[line] };
		},
	};
}

/**
 * 把保存的记录投影成「第几个代码块、块内偏移多少」。
 * 记录里的 expanded 是编辑视图的展开状态，展开的记录在阅读视图里保持原样。
 */
function resolveReadingRegions(surface, blocks, records) {
	const regions = [];

	for (const record of records) {
		if (!record.expression || record.expanded) continue;
		const match = selectRecordCandidate(surface, record, blocks);
		if (!match) continue;

		const bracketFrom = match.expression.indexOf("[");
		if (bracketFrom <= 0 || !match.expression.endsWith("]")) continue;

		regions.push({
			id: record.id,
			blockIndex: match.block.index,
			localFrom: match.position - match.block.contentFrom,
			length: match.expression.length,
			expression: match.expression,
			label:
				record.anchor?.label ||
				match.expression.slice(0, bracketFrom).trimEnd(),
			displayMode: record.displayMode || "standard",
		});
	}

	return regions;
}

function normalizeCodeText(value) {
	return value.replace(/\r\n/g, "\n").replace(/\n+$/, "");
}

/**
 * 把渲染出来的 <code> 文本对回源码里的代码块。
 * 阅读视图拿不到「这是第几个块」，只能按内容比对；对不上就跳过，宁可不折。
 */
function findRenderedBlock(blocks, text, codeText) {
	const target = normalizeCodeText(codeText);
	if (!target) return null;
	for (const block of blocks) {
		if (normalizeCodeText(text.slice(block.contentFrom, block.contentTo)) === target) {
			return block;
		}
	}
	return null;
}

module.exports = { createTextSurface, resolveReadingRegions, normalizeCodeText, findRenderedBlock };
};
__modules["./src/plugin/actions.js"] = function (module, exports, __require) {
const { Notice } = require("obsidian");
const { parseSelectedParameter } = __require("./src/editor/selection.js");
const { parameterFoldField, addRegionEffect } = __require("./src/editor/decorations.js");
const { createRegionId } = __require("./src/util/id.js");
const { getActivePlugin } = __require("./src/state.js");

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
		displayMode: plugin?.settings?.defaultDisplayMode || "standard",
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
};
__modules["./src/main.js"] = function (module, exports, __require) {
const { MarkdownView, Menu, Notice, Plugin, TFile } = require("obsidian");

const {
	addRegionEffect,
	toggleRegionEffect,
	removeRegionEffect,
	restoreRegionsEffect,
	setRegionDisplayModeEffect,
	parameterFoldField,
	labelClickHandler,
} = __require("./src/editor/decorations.js");
const { listCodeBlocks, findContainingCodeBlock } = __require("./src/editor/blocks.js");
const { parseSelectedParameter } = __require("./src/editor/selection.js");
const { buildAnchor } = __require("./src/editor/anchor.js");
const { selectRecordCandidate } = __require("./src/editor/recover.js");
const { parseParameterOptions } = __require("./src/format/parameters.js");
const { createRegionId } = __require("./src/util/id.js");
const { ParameterSetupModal } = __require("./src/ui/setup-modal.js");
const FoldSettingsTab = __require("./src/ui/settings-tab.js");
const FoldOverviewModal = __require("./src/ui/overview-modal.js");
const { normalizeSettings } = __require("./src/settings/defaults.js");
const { applyReadingRegions } = __require("./src/reading/render.js");
const { createTextSurface, resolveReadingRegions, findRenderedBlock } = __require("./src/reading/source.js");
const {
	registerSelectedParameter,
	findRegisteredRegionAtCursor,
	findRegisteredRegionById,
} = __require("./src/plugin/actions.js");
const {
	setActivePlugin,
	getActivePlugin,
	setContextRegionId,
	getContextRegionId,
} = __require("./src/state.js");

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
};
module.exports = __require("./src/main.js");
