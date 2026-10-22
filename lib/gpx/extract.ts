import { ExtractedGPX } from "./types";
import { extractRegex } from "./extract-regex";
import { extractFxp } from "./extract-fxp";

export function extractGPX(text: string): ExtractedGPX {
  try {
    const res = extractRegex(text);
    // Jika regex menghasilkan 0 track lines pada file yang tampaknya tidak kosong,
    // fallback ke FXP untuk memastikan tidak ada format XML kompleks/namespaced yang terlewat.
    if (res.lines.length === 0) {
      return extractFxp(text, true);
    }
    return res;
  } catch {
    // Jika regex melempar error (atau format XML tidak biasa), coba validasi ketat via fast-xml-parser
    return extractFxp(text, true);
  }
}
