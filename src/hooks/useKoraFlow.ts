"use client";

import { useEffect, useState } from "react";

export interface FieldDef {
  key: string;
  type: string;
  label: string;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  hint?: string;
}

export interface StepDef {
  id: string;
  title: string;
  description?: string;
  condition?: { field: string; equals: string };
  fields: FieldDef[];
}

export interface FlowDef {
  flow_id: string;
  steps: StepDef[];
}

export function useKoraFlow(accountType: "individual" | "business") {
  const [flow, setFlow] = useState<FlowDef | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/kora/onboarding/flow?account_type=${accountType}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: FlowDef) => setFlow(data))
      .catch((err: Error) => setError(err.message ?? "Failed to load onboarding flow"))
      .finally(() => setLoading(false));
  }, [accountType]);

  return { flow, loading, error };
}
