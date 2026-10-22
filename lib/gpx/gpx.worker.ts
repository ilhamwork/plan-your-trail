import { extractGPX } from "./extract";
import { computeGPXData } from "./compute";

interface WorkerContext {
  onmessage: ((e: MessageEvent<{ id: number; text: string }>) => void) | null;
  postMessage: (message: unknown) => void;
}

const ctx: WorkerContext = self as unknown as WorkerContext;

ctx.onmessage = (e: MessageEvent<{ id: number; text: string }>) => {
  const { id, text } = e.data;
  try {
    const extracted = extractGPX(text);
    const data = computeGPXData(extracted);
    ctx.postMessage({ id, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    ctx.postMessage({ id, error: message });
  }
};
