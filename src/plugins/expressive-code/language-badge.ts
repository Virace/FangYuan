/**
 * Based on the discussion at https://github.com/expressive-code/expressive-code/issues/153#issuecomment-2282218684
 */
import { definePlugin } from "@expressive-code/core";

export function pluginLanguageBadge(): ReturnType<typeof definePlugin> {
	return definePlugin({
		name: "Language Badge",
		baseStyles: () => `
      [data-language]::before {
        position: absolute;
        z-index: 2;
        right: 0.6rem;
        top: 0.6rem;
        padding: 0.12rem 0.48rem;
        content: attr(data-language);
        font-family: var(--font-jetbrains-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-size: 0.6875rem;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--accent-foreground);
        background: var(--codeblock-btn-bg);
        border: 1px solid var(--codeblock-btn-border);
        border-radius: 0.42rem;
        pointer-events: none;
        transition: opacity 0.2s ease;
        opacity: 0;
      }
      .frame:not(.has-title):not(.is-terminal) {
        @media (hover: none) {
          & [data-language]::before {
            opacity: 1;
            margin-right: 3rem;
          }
          & [data-language]:active::before {
            opacity: 0;
          }
        }
        @media (hover: hover) {
          & [data-language]::before {
            opacity: 1;
          }
          &:hover [data-language]::before {
            opacity: 0;
          }
        }
      }
    `,
	});
}
