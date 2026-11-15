import type { ThemeManifest } from "../../types";
import { gospeakBrandAssets } from "./assets/brand";
import { gospeakClassicVariant } from "./classic";

export const gospeakThemeManifest = {
  id: "gospeak",
  name: "GoSpeak",
  description:
    "Hệ thống nhận diện hiện đại, tối giản và tự nhiên dành cho nền tảng quản trị nội bộ GoSpeak.",
  version: "3.2.0",
  author: "GoSpeak",
  assets: gospeakBrandAssets,
  variants: {
    classic: gospeakClassicVariant,
  },
} as const satisfies ThemeManifest<{
  classic: typeof gospeakClassicVariant;
}>;
