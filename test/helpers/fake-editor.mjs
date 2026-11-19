/**
 * 一个够用的假编辑器：只实现插件实际调用的 CodeMirror 6 Editor 接口子集，
 * 让纯逻辑（代码块扫描、选区解析、锚点定位）可以在 Node 里直接测。
 */

export function createFakeEditor(text, selection = null) {
	const lines = text.split("\n");
	let cursorFrom = selection ? selection.from : 0;
	let cursorTo = selection ? selection.to : cursorFrom;

	const lineStarts = [];
	let offset = 0;
	for (const line of lines) {
		lineStarts.push(offset);
		offset += line.length + 1;
	}

	const offsetToPos = (pos) => {
		let line = 0;
		while (line + 1 < lineStarts.length && lineStarts[line + 1] <= pos) line += 1;
		return { line, ch: pos - lineStarts[line] };
	};

	const posToOffset = ({ line, ch }) => lineStarts[line] + ch;

	return {
		cm: { state: null, dispatch() {} },
		lineCount: () => lines.length,
		getLine: (index) => lines[index],
		getValue: () => lines.join("\n"),
		posToOffset,
		offsetToPos,
		somethingSelected: () => cursorFrom !== cursorTo,
		getCursor: (which) => offsetToPos(which === "from" ? cursorFrom : cursorTo),
		getSelection: () =>
			cursorFrom === cursorTo ? "" : lines.join("\n").slice(cursorFrom, cursorTo),
		setCursor: (pos) => {
			const next = typeof pos === "number" ? pos : posToOffset(pos);
			cursorFrom = next;
			cursorTo = next;
		},
		setSelection: (from, to) => {
			cursorFrom = from;
			cursorTo = to;
		},
		replaceRange() {},
	};
}
