const { listCodeBlocks } = require("../editor/blocks");
const { selectRecordCandidate } = require("../editor/recover");

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
