// src/app/api/documents/company/route.ts
import { NextRequest, NextResponse } from "next/server";
import { normalizeCompanyDoc, type KeyValuePair } from "@/lib/normalizeCompanyDoc";

export const runtime = "nodejs"; // we use Buffer + fetch

// Poll Azure for the result until it finishes
async function pollAnalyzeResult(resultUrl: string, apiKey: string) {
  // Simple polling loop – fine for a playground
  while (true) {
    const res = await fetch(resultUrl, {
      method: "GET",
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Failed to get analyze result (${res.status}): ${text.slice(0, 300)}`
      );
    }

    const json = await res.json();

    const status: string | undefined =
      json.status ?? json.analyzeResult?.status ?? json.operationStatus;

    if (!status || status.toLowerCase() === "succeeded") {
      return json;
    }

    if (
      ["failed", "canceled", "cancelled"].includes(status.toLowerCase())
    ) {
      throw new Error(
        `Analysis ${status}: ${JSON.stringify(json).slice(0, 300)}`
      );
    }

    // Still running – wait a bit then poll again
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "No file uploaded under field 'file'" },
        { status: 400 }
      );
    }

// Prefer Sitara-specific vars, fall back to the generic ones if present
const endpoint =
  process.env.AZURE_DOCINTEL_ENDPOINT ??
  process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;

const apiKey =
  process.env.AZURE_DOCINTEL_KEY ??
  process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;


    if (!endpoint || !apiKey) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Azure Document Intelligence endpoint/key are not set. Check AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT and AZURE_DOCUMENT_INTELLIGENCE_KEY.",
        },
        { status: 500 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Ensure endpoint ends with "/"
    const baseEndpoint = endpoint.endsWith("/")
      ? endpoint
      : `${endpoint}/`;

  
    // Use v3.1 general document model (prebuilt-document)
const analyzeUrl =
  `${baseEndpoint}formrecognizer/documentModels/prebuilt-document:analyze` +
  `?api-version=2023-07-31`;


    // 1) Kick off analysis
    const analyzeRes = await fetch(analyzeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/pdf",
        "Ocp-Apim-Subscription-Key": apiKey,
      },
      body: buffer,
    });

    if (analyzeRes.status !== 202) {
      const text = await analyzeRes.text();
      return NextResponse.json(
        {
          ok: false,
          error: `Analyze request failed (${analyzeRes.status}): ${text.slice(
            0,
            300
          )}`,
        },
        { status: 500 }
      );
    }

    const operationLocation = analyzeRes.headers.get("operation-location");
    if (!operationLocation) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing operation-location header from Azure DI",
        },
        { status: 500 }
      );
    }

    // 2) Poll until done
    const resultJson = await pollAnalyzeResult(operationLocation, apiKey);

    const analyzeResult =
      resultJson.analyzeResult ??
      resultJson.result ??
      resultJson;

    const kvPairs: KeyValuePair[] =
      analyzeResult?.keyValuePairs?.map((kv: any) => ({
        key: kv.key?.content ?? null,
        value: kv.value?.content ?? null,
        confidence: kv.confidence,
      })) ?? [];

    const normalized = normalizeCompanyDoc(kvPairs);

    return NextResponse.json(
      {
        ok: true,
        modelId: "prebuilt-document",
        normalized,
        raw: {
          keyValuePairs: kvPairs,
          documents: analyzeResult?.documents ?? [],
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Company document analysis error:", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          err?.message ??
          "Unknown error during company document analysis",
      },
      { status: 500 }
    );
  }
}
