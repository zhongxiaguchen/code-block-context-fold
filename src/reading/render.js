const { parseParameterOptions } = require("../format/parameters");
const { createOptionsElement } = require("../ui/options-dom");
const { locateRange } = require("../editor/text-range");

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
