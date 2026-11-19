/**
 * 在「一组文本节点」上定位一个字符区间。
 *
 * 阅读视图里，代码块的文本被语法高亮拆成了很多个文本节点，
 * 一个跨了若干 token 的表达式无法只靠单个节点替换。
 * 这里只做纯计算：给定各节点长度和全局区间，算出起止落在哪个节点、哪个偏移。
 * DOM 的实际切分与插入留给调用方，便于单独测试。
 */

function locateRange(lengths, start, end) {
	if (!(end > start) || start < 0) return null;

	let offset = 0;
	let startIndex = -1;
	let startOffset = 0;
	let endIndex = -1;
	let endOffset = 0;

	for (let index = 0; index < lengths.length; index += 1) {
		const length = lengths[index];
		if (length === 0) continue;

		if (startIndex < 0 && start >= offset && start < offset + length) {
			startIndex = index;
			startOffset = start - offset;
		}
		// 区间的末尾是开区间：end 正好落在节点边界时，归属前一个节点
		if (endIndex < 0 && end > offset && end <= offset + length) {
			endIndex = index;
			endOffset = end - offset;
		}

		offset += length;
	}

	if (startIndex < 0 || endIndex < 0 || endIndex < startIndex) return null;
	return { startIndex, startOffset, endIndex, endOffset };
}

module.exports = { locateRange };
