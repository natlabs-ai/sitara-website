import { NextResponse } from "next/server";

export const runtime = "nodejs"; // allows file streams

export type KYBExtract = {
  company_name?: string | null;
  registration_number?: string | null;
  incorporation_date?: string | null;
  legal_status?: string | null;
  registered_address?: string | null;
  directors?: string[];
  business_activity?: string | null;
  country?: string | null;
  source_files?: Record<string, string[]>;
};

export async function POST(req: Request) {
  const form = await req.formData();

  const answersRaw = form.get("answers") as string | null;
  const answers = answersRaw ? JSON.parse(answersRaw) : {};

  // collect all uploaded files
  const fileBuckets: Record<string, File[]> = {};
  for (const [key, value] of form.entries()) {
    if (key === "answers") continue;
    const cleanKey = key.replace(/\[\]$/, ""); // handle both "field" and "field[]"
    if (!fileBuckets[cleanKey]) fileBuckets[cleanKey] = [];
    if (value instanceof File) fileBuckets[cleanKey].push(value);
  }

  // summarize filenames
  const source_files: Record<string, string[]> = {};
  Object.entries(fileBuckets).forEach(([k, arr]) => {
    source_files[k] = arr.map((f) => f.name);
  });

  // 👇 dummy data for now (replace later with Microsoft Document Intelligence)
  const extract: KYBExtract = {
    company_name: null,
    registration_number: null,
    incorporation_date: null,
    legal_status: null,
    registered_address: null,
    directors: [],
    business_activity: null,
    country: answers.incCountry ?? null,
    source_files,
  };

  // simple example: if legal docs uploaded, fill demo data
  if (source_files["legal_existence_files"]?.length) {
    extract.company_name = "ACME GOLD FZE";
    extract.registration_number = "LIC-1234567";
    extract.incorporation_date = "2019-06-30";
    extract.legal_status = "Active";
  }

  return NextResponse.json({ ok: true, extract });
}
