const { findContainingCodeBlock } = require("./blocks");

/**
 * 把「用户选中的一段 参数[内容]」解析成可装饰的区间。
 * 只有完全位于同一个代码块内、且方括号配平的选区才会被接受。
 */
function parseSelectedParameter(editor) {
	if (!editor.somethingSelected()) return null;

	const selectionFrom = editor.getCursor("from");
	const selectionTo = editor.getCursor("to");
	if (!findContainingCodeBlock(editor, selectionFrom.line, selectionTo.line)) return null;

	const selectedText = editor.getSelection();

	const leadingWhitespace = selectedText.length - selectedText.trimStart().length;
	const expression = selectedText.trim();
	const bracketFromInExpression = expression.indexOf("[");
	if (bracketFromInExpression <= 0) return null;

	let depth = 0;
	let bracketToInExpression = -1;
	for (let index = bracketFromInExpression; index < expression.length; index += 1) {
		if (expression[index] === "[") depth += 1;
		if (expression[index] === "]") depth -= 1;
		if (depth === 0) {
			bracketToInExpression = index + 1;
			break;
		}
	}

	if (depth !== 0 || bracketToInExpression !== expression.length) return null;
	const label = expression.slice(0, bracketFromInExpression).trimEnd();
	if (!label || /[\r\n]/.test(label)) return null;

	const selectionOffset = editor.posToOffset(selectionFrom) + leadingWhitespace;
	const labelFrom = selectionOffset;
	const labelTo = selectionOffset + label.length;
	const bracketFrom = selectionOffset + bracketFromInExpression;
	const bracketTo = selectionOffset + expression.length;

	return {
		label,
		expression,
		labelFrom,
		labelTo,
		bracketFrom,
		bracketTo,
	};
}

module.exports = { parseSelectedParameter };
