const { MESSAGES } = require("./strings");

const FALLBACK = "en";

let cachedLanguage = null;

/**
 * Obsidian 把界面语言放在 localStorage 的 language 字段里，形如 zh、zh-TW、en。
 * 没有 window（Node 测试环境）或读不到时一律退回英文。
 */
function detectLanguage() {
	try {
		if (typeof window === "undefined") return FALLBACK;
		const raw = window.localStorage.getItem("language") || "";
		return String(raw).toLowerCase().startsWith("zh") ? "zh" : FALLBACK;
	} catch {
		return FALLBACK;
	}
}

function getLanguage() {
	if (!cachedLanguage) cachedLanguage = detectLanguage();
	return cachedLanguage;
}

/** 只给测试和“强制语言”用；正常运行时不调用。 */
function setLanguage(language) {
	cachedLanguage = MESSAGES[language] ? language : FALLBACK;
}

function interpolate(text, vars) {
	if (!vars) return text;
	return text.replace(/\{(\w+)\}/g, (match, name) =>
		Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match,
	);
}

function t(key, vars) {
	const language = getLanguage();
	const table = MESSAGES[language] || MESSAGES[FALLBACK];
	const text = table[key] ?? MESSAGES[FALLBACK][key] ?? key;
	return interpolate(text, vars);
}

module.exports = { t, getLanguage, setLanguage, detectLanguage, FALLBACK };
