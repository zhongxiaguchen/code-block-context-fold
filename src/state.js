/**
 * 跨模块共享的插件级状态。
 *
 * CodeMirror 的装饰与事件处理不持有插件实例，因此通过这里访问当前插件。
 * 单独成模块是为了避免 editor/ 与 main 之间形成循环依赖。
 */

let activePlugin = null;
let contextRegionId = null;

function setActivePlugin(plugin) {
	activePlugin = plugin;
}

function getActivePlugin() {
	return activePlugin;
}

function setContextRegionId(regionId) {
	contextRegionId = regionId;
}

function getContextRegionId() {
	return contextRegionId;
}

module.exports = {
	setActivePlugin,
	getActivePlugin,
	setContextRegionId,
	getContextRegionId,
};
