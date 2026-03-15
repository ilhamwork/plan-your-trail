"use client";

import * as Sentry from "@sentry/nextjs";
import React from "react";

interface Props {
  children: React.ReactNode;
}

const ErrorBoundary: React.FC<Props> = ({ children }) => {
  return (
    <Sentry.ErrorBoundary
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#FAF6F1] p-4 text-center">
          <div className="max-w-md rounded-2xl bg-white p-8 shadow-sm">
            <h2 className="mb-2 text-xl font-bold text-[#2D3436]">Something went wrong</h2>
            <p className="mb-6 text-sm text-gray-500">
              An unexpected error has occurred. Our team has been notified and is working to fix it.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-full bg-[#1B4332] px-6 py-2 text-sm font-medium text-white transition-all hover:bg-[#1B4332]/90"
            >
              Reload Page
            </button>
          </div>
        </div>
      }
    >
      {children}
    </Sentry.ErrorBoundary>
  );
};

export default ErrorBoundary;
