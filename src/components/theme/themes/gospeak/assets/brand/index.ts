import type { ColorMode, ThemeAssets } from "../../../../types";

/**
 * Biểu tượng GoSpeak (chữ S đội mũ cử nhân) tách từ ảnh logo trung tâm gửi:
 * - gospeak-mark.png: nét trắng nền trong suốt, BrandMark dùng làm mask nên tự đổi màu theo ngữ cảnh.
 * - gospeak-icon.png: biểu tượng trên nền đỏ, dùng làm favicon.
 * Khi có file gốc (SVG/AI) thì thay hai file này trong public/images/brand/.
 */
const MARK = "/images/brand/gospeak-mark.png";
const ICON = "/images/brand/gospeak-icon.png";

export const gospeakBrandAssetsByMode = {
  light: { logo: null, logoInverse: null, icon: MARK, favicon: ICON, illustration: null },
  dark: { logo: null, logoInverse: null, icon: MARK, favicon: ICON, illustration: null },
} as const satisfies Record<ColorMode, ThemeAssets>;

export const gospeakBrandAssets = gospeakBrandAssetsByMode.light;
