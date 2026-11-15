import { themeTokens } from "../../../tokens";
import { gospeakBrandAssetsByMode } from "../assets/brand";
import type {
  ThemeDefinition,
  ThemeVariantDefinition,
} from "../../../types";

export const gospeakClassicLightTheme = {
  name: "gospeak-classic-light",
  label: "GoSpeak Classic Light",
  attribute: "gospeak-classic-light",
  family: "gospeak",
  variant: "classic",
  mode: "light",
  assets: gospeakBrandAssetsByMode.light,
  tokens: themeTokens,
} as const satisfies ThemeDefinition<
  "gospeak-classic-light",
  "gospeak",
  "classic",
  "light"
>;

export const gospeakClassicDarkTheme = {
  name: "gospeak-classic-dark",
  label: "GoSpeak Classic Dark",
  attribute: "gospeak-classic-dark",
  family: "gospeak",
  variant: "classic",
  mode: "dark",
  assets: gospeakBrandAssetsByMode.dark,
  tokens: themeTokens,
} as const satisfies ThemeDefinition<
  "gospeak-classic-dark",
  "gospeak",
  "classic",
  "dark"
>;

export const gospeakClassicVariant = {
  id: "classic",
  label: "GoSpeak Classic",
  description:
    "Ngôn ngữ thiết kế hiện đại, tối giản và tự nhiên của GoSpeak.",
  modes: {
    light: gospeakClassicLightTheme,
    dark: gospeakClassicDarkTheme,
  },
} as const satisfies ThemeVariantDefinition<
  "classic",
  {
    light: typeof gospeakClassicLightTheme;
    dark: typeof gospeakClassicDarkTheme;
  }
>;
