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
