// src/app/doc-test/page.tsx
"use client";

import React, { useState } from "react";
import type { CompanyDocNormalized } from "@/lib/normalizeCompanyDoc";

type Mode = "id" | "company";

export default function DocTestPage() {
  const [mode, setMode] = useState<Mode>("id");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responseJson, setResponseJson] = useState<any | null>(null);
  const [normalizedCompany, setNormalizedCompany] =
    useState<CompanyDocNormalized | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setError(null);
    setResponseJson(null);
    setNormalizedCompany(null);
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError("Please choose a file first.");
      return;
    }
    setLoading(true);
    setError(null);
    setResponseJson(null);
    setNormalizedCompany(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const endpoint =
        mode === "id"
          ? "/api/documents/id"
          : "/api/documents/company";

      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `Server error ${res.status}: ${text.slice(0, 200)}`
        );
      }

      const data = await res.json();
      setResponseJson(data);

      if (mode === "company" && data.normalized) {
        setNormalizedCompany(data.normalized as CompanyDocNormalized);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Failed to analyze document");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-slate-900/80 border border-slate-700 rounded-2xl p-6 space-y-4">
        <h1 className="text-xl font-semibold">Document Intelligence Test</h1>
        <p className="text-sm text-slate-300">
          Upload a document and send it to Azure Document Intelligence.
        </p>

        {/* Mode toggle */}
        <div className="inline-flex rounded-full bg-slate-800 p-1 text-sm">
          <button
            type="button"
            onClick={() => setMode("id")}
            className={`px-4 py-1 rounded-full ${
              mode === "id"
                ? "bg-blue-600 text-white"
                : "text-slate-200"
            }`}
          >
            ID Document (Passport / ID)
          </button>
          <button
            type="button"
            onClick={() => setMode("company")}
            className={`px-4 py-1 rounded-full ${
              mode === "company"
                ? "bg-blue-600 text-white"
                : "text-slate-200"
            }`}
          >
            Company Document
          </button>
        </div>

        {/* File input */}
        <div className="space-y-2 text-sm">
          <p>
            Upload{" "}
            {mode === "id"
              ? "passport / national ID"
              : "trade licence / registry extract / VAT TRN / etc."}
          </p>
          <input
            type="file"
            accept=".pdf,image/*"
            onChange={handleFileChange}
            className="block text-xs text-slate-200"
          />
        </div>

        {/* Analyze button */}
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={loading || !file}
          className="inline-flex items-center px-4 py-2 rounded-md bg-emerald-600 text-sm font-medium disabled:opacity-60"
        >
          {loading ? "Analyzing…" : "Analyze document"}
        </button>

        {error && (
          <p className="text-xs text-red-400 whitespace-pre-wrap">
            {error}
          </p>
        )}

        {/* Company results: normalized + raw */}
        {mode === "company" && normalizedCompany && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="border border-slate-700 rounded-lg p-3 bg-slate-900/80">
              <h2 className="font-semibold mb-2">
                Normalized Company Data
              </h2>
              <pre className="whitespace-pre-wrap break-all text-[11px]">
                {JSON.stringify(normalizedCompany, null, 2)}
              </pre>
            </div>
            <div className="border border-slate-700 rounded-lg p-3 bg-slate-900/80">
              <h2 className="font-semibold mb-2">Raw Response (trimmed)</h2>
              <pre className="whitespace-pre-wrap break-all text-[11px]">
                {JSON.stringify(responseJson, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* ID results: fields + raw */}
        {mode === "id" && responseJson && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="border border-slate-700 rounded-lg p-3 bg-slate-900/80">
              <h2 className="font-semibold mb-2">ID Fields</h2>
              <pre className="whitespace-pre-wrap break-all text-[11px]">
                {JSON.stringify(responseJson.fields ?? {}, null, 2)}
              </pre>
            </div>
            <div className="border border-slate-700 rounded-lg p-3 bg-slate-900/80">
              <h2 className="font-semibold mb-2">Raw Response</h2>
              <pre className="whitespace-pre-wrap break-all text-[11px]">
                {JSON.stringify(responseJson.raw ?? responseJson, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
