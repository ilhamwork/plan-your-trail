import { extractGPX } from "./extract";
import { computeGPXData } from "./compute";

self.onmessage = (e: MessageEvent<{ id: number; text: string }>) => {
  const { id, text } = e.data;
  try {
    const extracted = extractGPX(text);
    const data = computeGPXData(extracted);
    (self as any).postMessage({ id, data });
  } catch (err: any) {
    (self as any).postMessage({
      id,
      error: err && err.message ? err.message : String(err),
    });
  }
};
