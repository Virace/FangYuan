import { access, copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

export function formatUpdateTimestamp(date = new Date()) {
	const pad = (value) => String(value).padStart(2, "0");
	return [
		date.getFullYear(),
		pad(date.getMonth() + 1),
		pad(date.getDate()),
		"-",
		pad(date.getHours()),
		pad(date.getMinutes()),
		pad(date.getSeconds()),
	].join("");
}

export function getBackupPath(siteRoot, relativeFile, timestamp) {
	return path.join(siteRoot, ".backup", timestamp, relativeFile);
}

export async function backupExistingFile(siteRoot, relativeFile, options = {}) {
	const sourcePath = path.join(siteRoot, relativeFile);

	try {
		await access(sourcePath);
	} catch (error) {
		if (error && typeof error === "object" && error.code === "ENOENT") {
			return null;
		}
		throw error;
	}

	const timestamp = options.timestamp ?? formatUpdateTimestamp(options.now);
	const backupPath = getBackupPath(siteRoot, relativeFile, timestamp);
	await mkdir(path.dirname(backupPath), { recursive: true });
	await copyFile(sourcePath, backupPath);

	return backupPath;
}
