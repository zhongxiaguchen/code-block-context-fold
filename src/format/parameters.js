/**
 * 参数表达式的解析与序列化。
 *
 * 存储格式：`参数名[ 值//注释 _ 值//注释 ]`
 * - `_` 分隔选项
 * - `//` 之后到选项结束为注释
 * - 名称、值、注释都不允许出现方括号与下划线，避免解析歧义
 */

function parseParameterOptions(expression) {
	const bracketFrom = expression.indexOf("[");
	if (bracketFrom < 0 || !expression.endsWith("]")) return [];
	const content = expression.slice(bracketFrom + 1, -1);
	return content
		.split("_")
		.map((part) => {
			const trimmed = part.trim();
			if (!trimmed) return null;
			const commentFrom = trimmed.indexOf("//");
			return {
				value: (commentFrom >= 0 ? trimmed.slice(0, commentFrom) : trimmed).trim(),
				comment: (commentFrom >= 0 ? trimmed.slice(commentFrom + 2) : "").trim(),
			};
		})
		.filter((option) => option?.value);
}

function serializeParameterOptions(label, options) {
	label = label.trim();
	if (!label || /[\r\n\[\]_]/.test(label) || label.includes("//")) {
		throw new Error("请填写参数名称，名称不能包含换行、方括号、下划线或 //");
	}
	if (!options.length) throw new Error("请至少添加一个选项");
	const parts = options.map((option) => {
		const value = option.value.trim();
		const comment = option.comment.trim();
		if (!value) throw new Error("每个选项都需要填写名称");
		if (/[\r\n\[\]_]/.test(value) || value.includes("//") || /[\[\]_]/.test(comment)) {
			throw new Error("选项不能包含换行、方括号、下划线或 //；注释不能包含方括号或下划线");
		}
		return "  " + value + (comment ? "//" + comment : "");
	});
	return label + "[\n" + parts.join("_\n") + "\n]";
}

module.exports = { parseParameterOptions, serializeParameterOptions };
