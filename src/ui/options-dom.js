const { parseParameterOptions } = require("../format/parameters");

/**
 * 「参数 ▾」药丸 + 选项悬浮面板的 DOM。
 * 编辑器里的 Widget 和阅读视图的后期渲染共用同一份结构，样式与交互只维护一次。
 */
function createOptionsElement(region, { hint = `${region.label}：悬浮查看选项，右键展开原文` } = {}) {
	const root = document.createElement("span");
	root.className = "inline-code-fold-options";

	const label = document.createElement("span");
	label.className = "inline-code-fold-label inline-code-fold-label--options";
	label.setAttribute("data-inline-code-fold-id", region.id);
	label.setAttribute("tabindex", "0");
	label.setAttribute("aria-label", hint);
	label.textContent = `${region.label} ▾`;
	root.appendChild(label);

	const panel = document.createElement("span");
	panel.className = "inline-code-fold-options-panel";
	panel.setAttribute("role", "list");

	for (const option of parseParameterOptions(region.expression)) {
		const row = document.createElement("span");
		row.className = "inline-code-fold-option";
		row.setAttribute("role", "listitem");
		row.setAttribute("tabindex", "0");

		const value = document.createElement("span");
		value.className = "inline-code-fold-option-value";
		value.textContent = option.value;
		row.appendChild(value);

		const comment = document.createElement("span");
		comment.className = "inline-code-fold-option-comment";
		comment.textContent = option.comment || "暂无注释";
		row.appendChild(comment);
		panel.appendChild(row);
	}

	let closeTimer = null;
	const cancelClose = () => window.clearTimeout(closeTimer);
	const close = () => {
		cancelClose();
		panel.remove();
	};
	const scheduleClose = () => {
		cancelClose();
		closeTimer = window.setTimeout(close, 180);
	};
	const open = () => {
		cancelClose();
		if (!panel.isConnected) document.body.appendChild(panel);
		const rect = label.getBoundingClientRect();
		const panelRect = panel.getBoundingClientRect();
		panel.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - panelRect.width - 8))}px`;
		panel.style.top = `${Math.max(8, rect.bottom + panelRect.height + 8 > window.innerHeight ? rect.top - panelRect.height - 6 : rect.bottom + 6)}px`;
	};
	root.addEventListener("mouseenter", open);
	root.addEventListener("mouseleave", scheduleClose);
	root.addEventListener("focusin", open);
	root.addEventListener("focusout", scheduleClose);
	panel.addEventListener("mouseenter", cancelClose);
	panel.addEventListener("mouseleave", scheduleClose);
	panel.addEventListener("focusin", cancelClose);
	panel.addEventListener("focusout", scheduleClose);
	const onKeyDown = (event) => {
		if (event.key === "Escape") close();
	};
	root.addEventListener("keydown", onKeyDown);
	panel.addEventListener("keydown", onKeyDown);
	for (const row of panel.children) {
		const positionComment = () => {
			const comment = row.querySelector(".inline-code-fold-option-comment");
			const rowRect = row.getBoundingClientRect();
			const commentRect = comment.getBoundingClientRect();
			const left = rowRect.right + 10 + commentRect.width <= window.innerWidth - 8
				? rowRect.right + 10
				: Math.max(8, rowRect.left - commentRect.width - 10);
			comment.style.left = `${left}px`;
			comment.style.top = `${Math.max(8, Math.min(rowRect.top, window.innerHeight - commentRect.height - 8))}px`;
		};
		row.addEventListener("mouseenter", positionComment);
		row.addEventListener("focus", positionComment);
	}
	window.addEventListener("resize", close);
	const onScroll = (event) => {
		if (!panel.contains(event.target)) close();
	};
	window.addEventListener("scroll", onScroll, true);
	root.cleanupOptionsPopup = () => {
		close();
		window.removeEventListener("resize", close);
		window.removeEventListener("scroll", onScroll, true);
	};
	return root;
}

module.exports = { createOptionsElement };
