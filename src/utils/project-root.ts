import path from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = fileURLToPath(new URL("../..", import.meta.url));

export function resolveFangYuanRoot(root: string = sourceRoot): string {
	return path.resolve(root);
}

export const fangyuanRoot: string = resolveFangYuanRoot();
