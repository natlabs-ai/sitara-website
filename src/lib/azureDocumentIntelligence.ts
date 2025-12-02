// src/lib/azureDocumentIntelligence.ts
import { AzureKeyCredential } from "@azure/core-auth";
import { DocumentAnalysisClient } from "@azure/ai-form-recognizer";

const endpoint = process.env.AZURE_DOCINTEL_ENDPOINT!;
const apiKey = process.env.AZURE_DOCINTEL_KEY!;

if (!endpoint || !apiKey) {
  throw new Error("Azure Document Intelligence env vars are missing");
}

const client = new DocumentAnalysisClient(
  endpoint,
  new AzureKeyCredential(apiKey)
);

// For passports / IDs
export async function analyzeIdDocument(fileBuffer: Buffer) {
  const poller = await client.beginAnalyzeDocument(
    "prebuilt-idDocument", // Azure’s ID model (passport, ID card, etc.)
    fileBuffer
  );
  const result = await poller.pollUntilDone();
  return result;
}

// For company documents (trade licence, COI, etc.)
export async function analyzeGenericDocument(fileBuffer: Buffer) {
  const poller = await client.beginAnalyzeDocument(
    "prebuilt-document", // General document model
    fileBuffer
  );
  const result = await poller.pollUntilDone();
  return result;
}
