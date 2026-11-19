/**
 * 折叠总览：把 data.json 里的记录摊平成「按笔记分组」的列表。
 *
 * 纯函数，不碰 Obsidian API——文件是否存在由调用方用 fileExists 判断，
 * 这样分组、排序、失效识别都能单独测。
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

function buildOverview(savedData, fileExists) {
	const groups = [];
	const stale = [];
	const foldsByFile = savedData?.foldsByFile || {};

	for (const [path, records] of Object.entries(foldsByFile)) {
		if (!Array.isArray(records) || !records.length) continue;

		if (!fileExists(path)) {
			stale.push({ path, count: records.length });
			continue;
		}

		groups.push({
			path,
			records: records.map((record) => ({
				id: record.id,
				label: labelOf(record),
				preview: previewOf(record),
				displayMode: record.displayMode === "options" ? "options" : "standard",
				expanded: Boolean(record.expanded),
			})),
		});
	}

	groups.sort((left, right) => left.path.localeCompare(right.path, "zh"));
	stale.sort((left, right) => left.path.localeCompare(right.path, "zh"));

	return {
		groups,
		stale,
		total: groups.reduce((sum, group) => sum + group.records.length, 0),
	};
}

module.exports = { buildOverview, labelOf, previewOf, PREVIEW_LENGTH };
