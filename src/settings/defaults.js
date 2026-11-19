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
