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
