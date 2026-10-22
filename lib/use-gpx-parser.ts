import { useEffect, useRef, useCallback } from "react";
import type { GPXData } from "./types";
import { parseGPXSync } from "./gpx-parser";

interface ParseOptions {
  signal?: AbortSignal;
}

export function useGPXParser() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRequests = useRef<
    Map<
      number,
      {
        resolve: (data: GPXData) => void;
        reject: (error: Error) => void;
      }
    >
  >(new Map());
  const reqIdCounter = useRef(0);

  useEffect(() => {
    // Inisialisasi Web Worker jika didukung oleh browser
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

          pendingRequests.current.delete(id);
          if (error) {
            req.reject(new Error(error));
          } else if (data) {
            req.resolve(data);
          }
        };

        worker.onerror = (e) => {
          console.error("GPX Worker error, falling back to sync:", e);
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
        // Fallback synchronous jika Worker tidak aktif / tidak tersedia
        return parseGPXSync(gpxString);
      }

      return new Promise<GPXData>((resolve, reject) => {
        const id = ++reqIdCounter.current;

        const onAbort = () => {
          pendingRequests.current.delete(id);
          reject(new DOMException("Aborted", "AbortError"));
        };

        if (options?.signal) {
          options.signal.addEventListener("abort", onAbort, { once: true });
        }

        pendingRequests.current.set(id, {
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
