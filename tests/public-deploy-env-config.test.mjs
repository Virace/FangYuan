import assert from "node:assert/strict";
import test from "node:test";

import {
	applyPublicQingYanCommentConfig,
	applyPublicQingYanPageFeedbackConfig,
	applyPublicQingYanPageMetricsConfig,
	resolvePublicQingYanConfig,
} from "../src/utils/site-source/demo-qingyan-env.ts";
import { resolvePublicSiteConfigOverride } from "../src/utils/site-source/public-deploy-env.ts";

test("public deploy env resolves root-domain site and base overrides", () => {
	assert.deepEqual(
		resolvePublicSiteConfigOverride({
			PUBLIC_FANGYUAN_SITE: "https://fangyuan.oogoo.top/",
			PUBLIC_FANGYUAN_BASE: "/",
		}),
		{
			site: "https://fangyuan.oogoo.top",
			base: "/",
		},
	);
});

test("public deploy env enables QingYan with default same-origin API", () => {
	assert.deepEqual(
		resolvePublicQingYanConfig(
			{
				PUBLIC_FANGYUAN_DEMO_QINGYAN: "true",
			},
			{
				allowDemoQingYan: true,
			},
		),
		{
			siteKey: "default",
			apiBase: "/api",
		},
	);
});

test("public deploy env ignores demo QingYan unless explicitly allowed", () => {
	assert.equal(
		resolvePublicQingYanConfig({
			PUBLIC_FANGYUAN_DEMO_QINGYAN: "true",
		}),
		null,
	);
});

test("public deploy env applies QingYan to all frontend integration surfaces", () => {
	const qingyan = {
		siteKey: "default",
		apiBase: "/api",
	};

	assert.deepEqual(
		applyPublicQingYanCommentConfig(
			{
				enable: false,
			},
			qingyan,
		),
		{
			enable: true,
		},
	);
	assert.deepEqual(
		applyPublicQingYanPageMetricsConfig(
			{
				enable: false,
			},
			qingyan,
		),
		{
			enable: true,
		},
	);
	assert.deepEqual(
		applyPublicQingYanPageFeedbackConfig(
			{
				enable: false,
				like: {
					enable: false,
				},
				reward: {
					enable: false,
					options: [],
				},
			},
			qingyan,
		),
		{
			enable: true,
			like: {
				enable: true,
			},
			reward: {
				enable: false,
				options: [],
			},
		},
	);
});
