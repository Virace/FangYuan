<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import Icon from "@iconify/svelte";
import {
	clearRadiusLevel,
	getDefaultHue,
	getDefaultRadiusLevel,
	getHue,
	getRadiusLevel,
	setHue,
	setRadiusLevel,
} from "@utils/setting-utils";
import { siteConfig } from "@/config";

let hue = getHue();
const defaultHue = getDefaultHue();
let radiusLevel = getRadiusLevel();
const defaultRadiusLevel = getDefaultRadiusLevel();
let lastPersistedRadiusLevel = radiusLevel;
let skipNextRadiusPersist = false;

function resetHue() {
	hue = getDefaultHue();
}

function resetRadiusLevel() {
	clearRadiusLevel();
	skipNextRadiusPersist = true;
	radiusLevel = getDefaultRadiusLevel();
	lastPersistedRadiusLevel = radiusLevel;
}

$: if (hue || hue === 0) {
	setHue(hue);
}

$: if (radiusLevel || radiusLevel === 0) {
	if (skipNextRadiusPersist) {
		skipNextRadiusPersist = false;
	} else if (radiusLevel !== lastPersistedRadiusLevel) {
		setRadiusLevel(radiusLevel);
		lastPersistedRadiusLevel = radiusLevel;
	}
}
</script>

<div id="display-setting" class="float-panel float-panel-closed absolute transition-all w-80 right-4 px-4 py-4">
	{#if !siteConfig.themeColor.fixed}
		<div
			id="themeColorRow"
			class="flex flex-row gap-3 mb-3 items-center justify-between"
		>
			<div
				class="min-w-0 flex gap-2 font-bold text-lg text-panel-title transition relative ml-3
					before:w-1 before:h-4 before:rounded-md before:bg-primary
					before:absolute before:-left-3 before:top-[0.33rem]"
			>
				{i18n(I18nKey.themeColor)}
				<button
					aria-label="Reset to Default"
					class="btn-regular w-7 h-7 rounded-md active:scale-90 will-change-transform"
					class:opacity-0={hue === defaultHue}
					class:pointer-events-none={hue === defaultHue}
					on:click={resetHue}
				>
					<div class="text-btn-content">
						<Icon icon="fa6-solid:arrow-rotate-left" class="text-sm"></Icon>
					</div>
				</button>
			</div>
			<div class="ml-3 flex shrink-0 gap-1">
				<div
					id="hueValue"
					class="transition bg-btn-regular-bg w-10 h-7 rounded-md flex justify-center
						font-bold text-sm items-center text-btn-content"
				>
					{hue}
				</div>
			</div>
		</div>
		<div class="w-full h-6 px-1 bg-display-slider-bg rounded select-none">
			<input
				aria-label={i18n(I18nKey.themeColor)}
				type="range"
				min="0"
				max="360"
				bind:value={hue}
				class="slider"
				id="colorSlider"
				step="5"
				style="width: 100%"
			>
		</div>
	{/if}

	{#if !siteConfig.themeRadius.fixed}
		<div
			id="radiusLevelRow"
			class="flex flex-row gap-3 mb-3 items-center justify-between"
			class:mt-5={!siteConfig.themeColor.fixed}
		>
			<div
				class="min-w-0 flex gap-2 font-bold text-lg text-panel-title transition relative ml-3
					before:w-1 before:h-4 before:rounded-md before:bg-primary
					before:absolute before:-left-3 before:top-[0.33rem]"
			>
				{i18n(I18nKey.themeRadius)}
				<button
					aria-label="Reset to Default"
					class="btn-regular w-7 h-7 rounded-md active:scale-90 will-change-transform"
					class:opacity-0={radiusLevel === defaultRadiusLevel}
					class:pointer-events-none={radiusLevel === defaultRadiusLevel}
					on:click={resetRadiusLevel}
				>
					<div class="text-btn-content">
						<Icon icon="fa6-solid:arrow-rotate-left" class="text-sm"></Icon>
					</div>
				</button>
			</div>
			<div class="ml-3 flex shrink-0 gap-1">
				<div
					id="radiusLevelValue"
					class="transition bg-btn-regular-bg w-10 h-7 rounded-md flex justify-center
						font-bold text-sm items-center text-btn-content"
				>
					{radiusLevel}
				</div>
			</div>
		</div>
		<div class="w-full h-6 px-1 bg-display-slider-bg rounded select-none">
			<input
				aria-label={i18n(I18nKey.themeRadiusLevel)}
				type="range"
				min="0"
				max="6"
				bind:value={radiusLevel}
				class="slider"
				id="radiusLevelSlider"
				step="1"
				style="width: 100%"
			>
		</div>
	{/if}
</div>


<style>
#display-setting input[type="range"] {
	appearance: none;
	-webkit-appearance: none;
	height: 1.5rem;
	background-image: var(--color-selection-bar);
	transition: background-image 0.15s ease-in-out;
}

#display-setting input[type="range"]::-webkit-slider-thumb {
	-webkit-appearance: none;
	height: 1rem;
	width: 0.5rem;
	border-radius: 0.125rem;
	background: rgb(255 255 255 / 0.7);
	box-shadow: none;
}

#display-setting input[type="range"]::-webkit-slider-thumb:hover {
	background: rgb(255 255 255 / 0.8);
}

#display-setting input[type="range"]::-webkit-slider-thumb:active {
	background: rgb(255 255 255 / 0.6);
}

#display-setting input[type="range"]::-moz-range-thumb {
	appearance: none;
	-webkit-appearance: none;
	height: 1rem;
	width: 0.5rem;
	border-radius: 0.125rem;
	border-width: 0;
	background: rgb(255 255 255 / 0.7);
	box-shadow: none;
}

#display-setting input[type="range"]::-moz-range-thumb:hover {
	background: rgb(255 255 255 / 0.8);
}

#display-setting input[type="range"]::-moz-range-thumb:active {
	background: rgb(255 255 255 / 0.6);
}

#display-setting input[type="range"]::-ms-thumb {
	appearance: none;
	-webkit-appearance: none;
	height: 1rem;
	width: 0.5rem;
	border-radius: 0.125rem;
	background: rgb(255 255 255 / 0.7);
	box-shadow: none;
}

#display-setting input[type="range"]::-ms-thumb:hover {
	background: rgb(255 255 255 / 0.8);
}

#display-setting input[type="range"]::-ms-thumb:active {
	background: rgb(255 255 255 / 0.6);
}
</style>
