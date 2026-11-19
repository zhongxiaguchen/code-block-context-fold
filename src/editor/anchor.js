const { listCodeBlocks, findBlockForRange } = require("./blocks");
const { normalizeContext } = require("../util/text");

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
