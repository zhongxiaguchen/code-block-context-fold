function createRegionId() {
	const uuid = globalThis.crypto?.randomUUID?.();
	if (uuid) return `parameter-fold-${uuid}`;
	return `parameter-fold-${Date.now().toString(36)}-${Math.random()
		.toString(36)
		.slice(2, 12)}`;
}

module.exports = { createRegionId };
