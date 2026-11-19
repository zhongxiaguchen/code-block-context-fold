const { Modal, Notice } = require("obsidian");
const { parseParameterOptions, serializeParameterOptions } = require("../format/parameters");

/**
 * 参数选项编辑器：名称 + 若干「选项 / 注释」行，保存时序列化成折叠表达式。
 */
class ParameterSetupModal extends Modal {
	constructor(app, initial, onSave) {
		super(app);
		this.initial = initial;
		this.onSave = onSave;
	}

	onOpen() {
		const content = this.contentEl;
		content.replaceChildren();
		content.classList.add("parameter-setup");
		const append = (parent, tag, text, className) => {
			const element = document.createElement(tag);
			if (text) element.textContent = text;
			if (className) element.className = className;
			parent.appendChild(element);
			return element;
		};
		append(content, "h2", this.initial ? "编辑参数选项" : "插入参数选项");
		append(content, "p", "1. 设置参数名称 → 2. 添加选项和注释 → 3. 保存为悬浮弹窗。分隔符会自动生成。");
		const nameLabel = append(content, "label", "参数名称");
		const name = append(nameLabel, "input");
		name.type = "text";
		name.placeholder = "例如：混合模式";
		name.value = this.initial?.label || "";
		append(content, "h3", "选项与注释");
		const list = append(content, "div");
		const rows = [];
		const addRow = (option = { value: "", comment: "" }) => {
			const row = append(list, "div", "", "parameter-setup-row");
			const valueLabel = append(row, "label", "选项名称");
			const value = append(valueLabel, "input");
			value.type = "text";
			value.placeholder = "例如：Normal";
			value.value = option.value;
			const commentLabel = append(row, "label", "注释（可选，支持换行）");
			const comment = append(commentLabel, "textarea");
			comment.rows = 2;
			comment.value = option.comment;
			const remove = append(row, "button", "删除此选项");
			remove.type = "button";
			const entry = { row, value, comment };
			rows.push(entry);
			remove.addEventListener("click", () => {
				rows.splice(rows.indexOf(entry), 1);
				row.remove();
			});
		};
		const options = this.initial ? parseParameterOptions(this.initial.expression) : [];
		for (const option of options.length ? options : [{ value: "", comment: "" }]) addRow(option);
		const add = append(content, "button", "+ 添加一个选项");
		add.type = "button";
		add.addEventListener("click", () => addRow());
		append(content, "p", "当前格式使用 _ 分隔选项，// 开始注释。名称和注释暂不支持 _ 和方括号。");
		const actions = append(content, "div", "", "parameter-setup-actions");
		const cancel = append(actions, "button", "取消");
		cancel.addEventListener("click", () => this.close());
		const save = append(actions, "button", this.initial ? "保存修改" : "插入并折叠", "mod-cta");
		save.addEventListener("click", async () => {
			try {
				const expression = serializeParameterOptions(name.value, rows.map((entry) => ({
					value: entry.value.value, comment: entry.comment.value,
				})));
				save.disabled = true;
				await this.onSave(expression, name.value.trim());
				this.close();
			} catch (error) {
				new Notice(error.message || "保存失败，请重试");
				save.disabled = false;
			}
		});
		name.focus();
	}

	onClose() {
		this.contentEl.replaceChildren();
	}
}

module.exports = { ParameterSetupModal };
