declare module "virtual:fangyuan-site-assets" {
	type SiteImageModule = () => Promise<{
		default: import("astro").ImageMetadata;
	}>;

	const modules: Record<string, SiteImageModule>;
	export default modules;
}
