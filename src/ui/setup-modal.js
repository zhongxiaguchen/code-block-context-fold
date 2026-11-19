const { Modal, Notice } = require("obsidian");
const { parseParameterOptions, serializeParameterOptions } = require("../format/parameters");
const { t } = require("../i18n");

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
		append(content, "h2", this.initial ? t("modal.titleEdit") : t("modal.titleInsert"));
		append(content, "p", t("modal.intro"));
		const nameLabel = append(content, "label", t("modal.name"));
		const name = append(nameLabel, "input");
		name.type = "text";
		name.placeholder = t("modal.namePlaceholder");
		name.value = this.initial?.label || "";
		append(content, "h3", t("modal.optionsHeading"));
		const list = append(content, "div");
		const rows = [];
		const addRow = (option = { value: "", comment: "" }) => {
			const row = append(list, "div", "", "parameter-setup-row");
			const valueLabel = append(row, "label", t("modal.value"));
			const value = append(valueLabel, "input");
			value.type = "text";
			value.placeholder = t("modal.valuePlaceholder");
			value.value = option.value;
			const commentLabel = append(row, "label", t("modal.comment"));
			const comment = append(commentLabel, "input");
			comment.type = "text";
			comment.placeholder = t("modal.commentPlaceholder");
			comment.value = option.comment;
			const remove = append(row, "button", t("modal.removeRow"));
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
		const add = append(content, "button", t("modal.addRow"));
		add.type = "button";
		add.addEventListener("click", () => addRow());
		append(content, "p", t("modal.hint"));
		const actions = append(content, "div", "", "parameter-setup-actions");
		const cancel = append(actions, "button", t("modal.cancel"));
		cancel.addEventListener("click", () => this.close());
		const save = append(
			actions,
			"button",
			this.initial ? t("modal.saveEdit") : t("modal.saveInsert"),
			"mod-cta",
		);
		save.addEventListener("click", async () => {
			try {
				const expression = serializeParameterOptions(name.value, rows.map((entry) => ({
					value: entry.value.value, comment: entry.comment.value,
				})));
				save.disabled = true;
				await this.onSave(expression, name.value.trim());
				this.close();
			} catch (error) {
				new Notice(error.message || t("notice.saveFailed"));
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
