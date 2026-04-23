export function buildSampleWxr({
	title = "Hello World",
	link = "https://example.com/2024/04/21/hello-world/",
	pubDate = "Sun, 21 Apr 2024 12:00:00 +0000",
	author = "Virace",
	content = "<p>Hello</p>",
	excerpt = "Short",
	legacyId = "7",
	postDate = "2024-04-21 20:00:00",
	postDateGmt = "",
	postModified = "",
	postModifiedGmt = "",
	postName = "hello-world",
	status = "publish",
	commentStatus = "open",
	postPassword = "",
	type = "post",
	category = "Notes",
	tag = "audit",
} = {}) {
	return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
	xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
	xmlns:content="http://purl.org/rss/1.0/modules/content/"
	xmlns:dc="http://purl.org/dc/elements/1.1/"
	xmlns:wp="http://wordpress.org/export/1.2/">
	<channel>
		<item>
			<title><![CDATA[${title}]]></title>
			<link>${link}</link>
			<pubDate>${pubDate}</pubDate>
			<dc:creator><![CDATA[${author}]]></dc:creator>
			<content:encoded><![CDATA[${content}]]></content:encoded>
			<excerpt:encoded><![CDATA[${excerpt}]]></excerpt:encoded>
			<category domain="category" nicename="notes"><![CDATA[${category}]]></category>
			<category domain="post_tag" nicename="audit"><![CDATA[${tag}]]></category>
			<wp:post_id>${legacyId}</wp:post_id>
			<wp:post_date><![CDATA[${postDate}]]></wp:post_date>
			<wp:post_date_gmt><![CDATA[${postDateGmt}]]></wp:post_date_gmt>
			<wp:post_modified><![CDATA[${postModified}]]></wp:post_modified>
			<wp:post_modified_gmt><![CDATA[${postModifiedGmt}]]></wp:post_modified_gmt>
			<wp:post_name><![CDATA[${postName}]]></wp:post_name>
			<wp:status><![CDATA[${status}]]></wp:status>
			<wp:comment_status><![CDATA[${commentStatus}]]></wp:comment_status>
			<wp:post_password><![CDATA[${postPassword}]]></wp:post_password>
			<wp:post_type><![CDATA[${type}]]></wp:post_type>
		</item>
	</channel>
</rss>`;
}

export const SAMPLE_WXR = buildSampleWxr();
