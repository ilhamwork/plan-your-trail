import { useEffect, useRef, useCallback } from "react";
import type { GPXData } from "./types";
import { parseGPXSync } from "./gpx-parser";

interface ParseOptions {
  signal?: AbortSignal;
}

const WORKER_TIMEOUT_MS = 3000;

export function useGPXParser() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRequests = useRef<
    Map<
      number,
      {
        text: string;
        timer: ReturnType<typeof setTimeout>;
        resolve: (data: GPXData) => void;
        reject: (error: Error) => void;
      }
    >
  >(new Map());
  const reqIdCounter = useRef(0);

  useEffect(() => {
    if (typeof window !== "undefined" && typeof Worker !== "undefined") {
      try {
        const worker = new Worker(
          new URL("./gpx/gpx.worker.ts", import.meta.url),
          { type: "module" }
        );

        worker.onmessage = (
          e: MessageEvent<{ id: number; data?: GPXData; error?: string }>
        ) => {
          const { id, data, error } = e.data;
          const req = pendingRequests.current.get(id);
          if (!req) return;

          clearTimeout(req.timer);
          pendingRequests.current.delete(id);
          if (error) {
            req.reject(new Error(error));
          } else if (data) {
            req.resolve(data);
          }
        };

        worker.onerror = (e) => {
          console.warn("GPX Worker error, falling back to sync:", e);
          workerRef.current = null;
          // Resolve any pending requests synchronously so the UI never hangs
          for (const [id, req] of pendingRequests.current.entries()) {
            clearTimeout(req.timer);
            pendingRequests.current.delete(id);
            try {
              req.resolve(parseGPXSync(req.text));
            } catch (err) {
              req.reject(err instanceof Error ? err : new Error(String(err)));
            }
          }
        };

        workerRef.current = worker;
      } catch (err) {
        console.warn("Failed to create Web Worker, using fallback:", err);
      }
    }

    const requests = pendingRequests.current;
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      for (const req of requests.values()) {
        clearTimeout(req.timer);
      }
      requests.clear();
    };
  }, []);

  const parse = useCallback(
    async (gpxString: string, options?: ParseOptions): Promise<GPXData> => {
      if (options?.signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }

      const worker = workerRef.current;
      if (!worker) {
        return parseGPXSync(gpxString);
      }

      return new Promise<GPXData>((resolve, reject) => {
        const id = ++reqIdCounter.current;

        const onAbort = () => {
          const req = pendingRequests.current.get(id);
          if (req) clearTimeout(req.timer);
          pendingRequests.current.delete(id);
          reject(new DOMException("Aborted", "AbortError"));
        };

        if (options?.signal) {
          options.signal.addEventListener("abort", onAbort, { once: true });
        }

        // Fallback to sync parsing if worker takes too long (e.g. cold compile in dev)
        const timer = setTimeout(() => {
          const req = pendingRequests.current.get(id);
          if (!req) return;
          pendingRequests.current.delete(id);
          if (options?.signal) {
            options.signal.removeEventListener("abort", onAbort);
          }
          try {
            resolve(parseGPXSync(gpxString));
          } catch (err) {
            reject(err instanceof Error ? err : new Error(String(err)));
          }
        }, WORKER_TIMEOUT_MS);

        pendingRequests.current.set(id, {
          text: gpxString,
          timer,
          resolve: (data) => {
            if (options?.signal) {
              options.signal.removeEventListener("abort", onAbort);
            }
            resolve(data);
          },
          reject: (err) => {
            if (options?.signal) {
              options.signal.removeEventListener("abort", onAbort);
            }
            reject(err);
          },
        });

        worker.postMessage({ id, text: gpxString });
      });
    },
    []
  );

  return { parse };
}
