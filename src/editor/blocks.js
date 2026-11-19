/**
 * 代码围栏（``` / ~~~）的扫描。所有位置都基于编辑器偏移量。
 */

function listCodeBlocks(editor) {
	const blocks = [];
	let opening = null;

	for (let lineNumber = 0; lineNumber < editor.lineCount(); lineNumber += 1) {
		const line = editor.getLine(lineNumber);
		if (!opening) {
			const match = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
			if (!match) continue;
			opening = {
				openingLine: lineNumber,
				character: match[1][0],
				length: match[1].length,
				language: match[2].trim().split(/\s+/, 1)[0] || "",
			};
			continue;
		}

		const trimmed = line.trimStart();
		let count = 0;
		while (trimmed[count] === opening.character) count += 1;
		const closes = count >= opening.length && trimmed.slice(count).trim().length === 0;
		if (!closes) continue;

		blocks.push({
			...opening,
			index: blocks.length,
			closingLine: lineNumber,
			contentFrom: editor.posToOffset({ line: opening.openingLine + 1, ch: 0 }),
			contentTo: editor.posToOffset({ line: lineNumber, ch: 0 }),
		});
		opening = null;
	}

	if (opening) {
		const contentLine = opening.openingLine + 1;
		blocks.push({
			...opening,
			index: blocks.length,
			closingLine: editor.lineCount(),
			contentFrom:
				contentLine < editor.lineCount()
					? editor.posToOffset({ line: contentLine, ch: 0 })
					: editor.getValue().length,
			contentTo: editor.getValue().length,
		});
	}

	return blocks;
}

function findBlockForRange(blocks, from, to) {
	return blocks.find((block) => from >= block.contentFrom && to <= block.contentTo) || null;
}

function findContainingCodeBlock(editor, fromLine, toLine) {
	let opening = null;

	for (let lineNumber = 0; lineNumber < editor.lineCount(); lineNumber += 1) {
		const line = editor.getLine(lineNumber);

		if (!opening) {
			const match = line.match(/^ {0,3}(`{3,}|~{3,})/);
			if (match) {
				opening = {
					line: lineNumber,
					character: match[1][0],
					length: match[1].length,
				};
			}
			continue;
		}

		const text = line.trimStart();
		let count = 0;
		while (text[count] === opening.character) count += 1;
		const closes = count >= opening.length && text.slice(count).trim().length === 0;
		if (!closes) continue;

		if (opening.line < fromLine && lineNumber > toLine) return opening;
		opening = null;
	}

	return opening && opening.line < fromLine ? opening : null;
}

module.exports = { listCodeBlocks, findBlockForRange, findContainingCodeBlock };
