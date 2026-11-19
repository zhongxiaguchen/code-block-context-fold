const { findBlockForRange } = require("./blocks");
const { ANCHOR_CONTEXT_LENGTH, hasUsefulAnchor } = require("./anchor");
const {
	normalizeContext,
	commonPrefixLength,
	commonSuffixLength,
} = require("../util/text");

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
