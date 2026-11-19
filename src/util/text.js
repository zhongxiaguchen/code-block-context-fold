/**
 * 折叠位置锚点用到的文本归一化与相似度工具。
 */

function normalizeContext(text) {
	return text.replace(/\s+/g, " ").trim();
}

function commonPrefixLength(left, right) {
	const limit = Math.min(left.length, right.length);
	let length = 0;
	while (length < limit && left[length] === right[length]) length += 1;
	return length;
}

function commonSuffixLength(left, right) {
	const limit = Math.min(left.length, right.length);
	let length = 0;
	while (
		length < limit &&
		left[left.length - 1 - length] === right[right.length - 1 - length]
	) {
		length += 1;
	}
	return length;
}

module.exports = { normalizeContext, commonPrefixLength, commonSuffixLength };
