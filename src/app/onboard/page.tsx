"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";

/* ================================
   Types
=================================== */
type UBO = {
  id: string;
  name?: string;
  nationality?: string;
  ownership?: number;
  pep?: boolean;
  passportName?: string; // dev stub (filename)
};

type ServiceDetails = {
  /* Corporate blocks */
  Trader?: {
    nature?: "Wholesale" | "Retail" | "Both";
    products?: string[];
    monthlyVolume?: string;
    storage?: string;
    counterparties?: string;
    licenses?: string;
  };
  Supplier?: {
    type?: "Mine" | "Aggregator" | "Dealer";
    originCountry?: string;
    purityRange?: string;
    shipmentFrequency?: string;
    logistics?: string;
    hasMineDocs?: boolean;
    oecdQuestionnaire?: boolean;
  };
  Jewellery?: {
    mode?: "Manufacturing" | "Retail" | "Both";
    products?: string[];
    scrap?: boolean;
    volume?: string;
  };
  Institutional?: {
    entityType?: string;
    sourceFunds?: string;
    regulated?: boolean;
    regulator?: string;
    complianceOfficer?: string;
  };
  Refining?: {
    source?: string;
    volumeKg?: string;
    purityEstimate?: string;
    assay?: string;
    frequency?: string;
    logistics?: string;
  };

  /* Individual blocks */
  BuyGold?: {
    type?: "Bars" | "Coins" | "Either";
    budget?: string;
    brand?: string;
    delivery?: string;
  };
  SellGold?: {
    type?: "Bars" | "Coins" | "Jewellery" | "Scrap";
    weight?: string;
    purity?: string;
    settlement?: string;
  };
  DepositGold?: {
    form?: "Bars" | "Coins";
    qty?: string;
    tenor?: string;
  };
  Storage?: {
    service?: "Storage" | "Secure Transport" | "Both";
    pickup?: string;
    dropoff?: string;
    declared?: string;
  };
};

type Account = {
  email?: string;
  emailVerified?: boolean;
  phone?: string;
  phoneVerified?: boolean;
  passwordSet?: boolean;
};

type Draft = {
  applicant_type?: "individual" | "corporate";
  account?: Account;
  identity?: { passportName?: string; selfieName?: string };
  company?: { name?: string; regNo?: string; regAddress?: string; opAddress?: string };
  ubos?: UBO[];
  services?: string[];
  serviceDetails?: ServiceDetails;
};

const KEY = "sitara_onboarding_draft_v3";

/** DEV switch: bypass step validations except Applicant */
const DEV_BYPASS = true;

/* Services per applicant type */
const INDIVIDUAL_SERVICES = ["Buy Gold", "Sell Gold", "Deposit Gold", "Storage/Logistics"] as const;
const CORPORATE_SERVICES = ["Trader", "Supplier", "Jewellery", "Institutional", "Refining"] as const;
type IndividualService = (typeof INDIVIDUAL_SERVICES)[number];
type CorporateService = (typeof CORPORATE_SERVICES)[number];

/* ================================
   Page
=================================== */
export default function Onboard() {
  const [draft, setDraft] = useState<Draft>({
    services: [],
    serviceDetails: {},
    ubos: [],
    account: {},
  });
  const [step, setStep] = useState(0);

  // Load / save draft locally
  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
    if (raw) setDraft(JSON.parse(raw));
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(draft));
  }, [draft]);

  // Update applicant type with sanitization of services/details
  function setApplicantType(t: "individual" | "corporate") {
    setDraft((d) => {
      const next: Draft = { ...d, applicant_type: t };

      // keep only compatible selected services
      const keep = new Set(
        t === "individual" ? INDIVIDUAL_SERVICES : CORPORATE_SERVICES
      );
      next.services = (d.services || []).filter((s) => keep.has(s as any));

      const sd = { ...(d.serviceDetails || {}) } as ServiceDetails;

      if (t === "individual") {
        // clear corporate-only blocks
        delete sd.Trader;
        delete sd.Supplier;
        delete sd.Jewellery;
        delete sd.Institutional;
        delete sd.Refining;

        // clear company/UBOs
        next.company = undefined;
        next.ubos = [];
      } else {
        // clear individual-only blocks
        delete sd.BuyGold;
        delete sd.SellGold;
        delete sd.DepositGold;
        delete sd.Storage;
      }

      next.serviceDetails = sd;
      return next;
    });
  }

  // Steps: block until Applicant chosen; then Account → Identity → (branch)
  const steps = useMemo(() => {
    if (!draft.applicant_type) return ["Applicant"];
    const base = ["Applicant", "Account", "Identity"];
    const branch = draft.applicant_type === "corporate" ? ["Company", "UBOs"] : [];
    return [...base, ...branch, "Services", "Review"];
  }, [draft.applicant_type]);

  const maxIndex = steps.length - 1;
  const current = steps[step];

  const next = () => setStep((s) => Math.min(s + 1, maxIndex));
  const back = () => setStep((s) => Math.max(s - 1, 0));
  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  // Gate progression per step (bypassed in dev except Applicant)
  function canProceed(stepLabel: string): boolean {
    if (stepLabel === "Applicant") return !!draft.applicant_type;
    if (DEV_BYPASS) return true;

    // (Future real gates)
    if (stepLabel === "Account") {
      const a = draft.account || {};
      return !!(a.emailVerified && a.phoneVerified && a.passwordSet);
    }
    if (stepLabel === "Company" && draft.applicant_type === "corporate") {
      const c = draft.company || {};
      return !!(c.name && c.regNo);
    }
    if (stepLabel === "UBOs" && draft.applicant_type === "corporate") {
      return (draft.ubos || []).length > 0;
    }
    return true;
  }

  const progress = steps.length ? ((step + 1) / steps.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-neutral-950 to-black text-neutral-100">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-black/70 backdrop-blur border-b border-amber-400/10">
        <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
          <a
            href="/"
            className="group inline-flex items-center gap-2 text-sm text-neutral-300 hover:text-white"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-amber-400/40 text-amber-300 group-hover:bg-amber-400 group-hover:text-black transition">
              ←
            </span>
            Back to Home
          </a>
          <div className="text-sm tracking-[0.35em] text-amber-400">S I T A R A</div>
        </div>
        {/* Progress bar */}
        {steps.length > 1 && (
          <div className="h-1 w-full bg-neutral-900/80">
            <div
              className="h-1 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500"
              style={{ width: `${progress}%`, boxShadow: "0 0 12px rgba(251,191,36,.45)" }}
            />
          </div>
        )}
      </div>

      {/* DEV banner */}
      {DEV_BYPASS && (
        <div className="mx-auto max-w-5xl px-4 pt-3">
          <div className="rounded-md border border-amber-400/20 bg-black/40 text-amber-200 text-xs px-3 py-2">
            DEV mode: validation bypass enabled — only Applicant is enforced.
          </div>
        </div>
      )}

      {/* Body */}
      <main className="mx-auto max-w-5xl px-4 py-10 md:py-14">
        <section className="rounded-2xl border border-amber-400/15 bg-neutral-950/60 shadow-[0_0_40px_rgba(251,191,36,0.06)]">
          <div className="p-5 md:p-8 border-b border-amber-400/10">
            <StepHeader steps={steps} step={step} />
          </div>

          <div className="p-5 md:p-8 space-y-6">
            {current === "Applicant" && (
              <StepApplicant draft={draft} onSelect={setApplicantType} />
            )}
            {current === "Account" && <StepAccount draft={draft} onChange={patch} />}
            {current === "Identity" && <StepIdentity draft={draft} onChange={patch} />}
            {current === "Company" && <StepCompany draft={draft} onChange={patch} />}
            {current === "UBOs" && <StepUbo draft={draft} onChange={patch} />}
            {current === "Services" && <StepServices draft={draft} onChange={patch} />}
            {current === "Review" && <StepReview draft={draft} />}
          </div>

          <div className="p-5 md:p-8 border-t border-amber-400/10 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
            <button
              onClick={back}
              disabled={step === 0}
              className="px-4 py-2 rounded-md border border-neutral-700 text-neutral-200 disabled:opacity-40 hover:bg-neutral-900 transition"
            >
              Back
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  localStorage.removeItem(KEY);
                  location.reload();
                }}
                className="px-4 py-2 rounded-md border border-neutral-700 text-neutral-200 hover:bg-neutral-900 transition"
              >
                Reset
              </button>

              {step < maxIndex ? (
                <button
                  onClick={next}
                  disabled={!canProceed(current)}
                  className={`px-5 py-2 rounded-md font-medium transition ${
                    canProceed(current)
                      ? "bg-amber-400 text-black shadow-[0_0_20px_rgba(251,191,36,0.35)] hover:brightness-95"
                      : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                  }`}
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={() => downloadJSON(draft)}
                  className="px-5 py-2 rounded-md bg-amber-400 text-black font-medium shadow-[0_0_20px_rgba(251,191,36,0.35)] hover:brightness-95 transition"
                >
                  Download JSON
                </button>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

/* ================================
   Header / Dots
=================================== */
function StepHeader({ steps, step }: { steps: string[]; step: number }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {steps.map((label, i) => {
        const active = i <= step;
        return (
          <div key={label} className="flex items-center gap-2">
            <span
              className={`w-7 h-7 grid place-items-center rounded-full text-xs font-medium
              ${active ? "bg-amber-400 text-black" : "bg-neutral-800 text-neutral-400"}`}
              style={active ? { boxShadow: "0 0 10px rgba(251,191,36,.45)" } : {}}
            >
              {i + 1}
            </span>
            <span className={`${active ? "text-white" : "text-neutral-400"} text-sm`}>{label}</span>
            {i < steps.length - 1 && <span className="w-8 h-px bg-neutral-800" />}
          </div>
        );
      })}
    </div>
  );
}

/* ================================
   Steps
=================================== */
function StepApplicant({
  draft,
  onSelect,
}: {
  draft: Draft;
  onSelect: (t: "individual" | "corporate") => void;
}) {
  const Btn = ({ t }: { t: "individual" | "corporate" }) => (
    <button
      onClick={() => onSelect(t)}
      className={`px-4 py-2 rounded-md border transition ${
        draft.applicant_type === t
          ? "bg-amber-400 text-black shadow-[0_0_18px_rgba(251,191,36,.35)]"
          : "border-neutral-700 text-neutral-200 hover:bg-neutral-900"
      }`}
    >
      {t[0].toUpperCase() + t.slice(1)}
    </button>
  );
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-amber-300">Applicant Type</h2>
      <div className="flex gap-3">
        <Btn t="individual" />
        <Btn t="corporate" />
      </div>
      <p className="text-xs text-neutral-400">
        Choose your applicant type to unlock the next steps.
      </p>
    </section>
  );
}

function StepAccount({ draft, onChange }: { draft: Draft; onChange: (p: Partial<Draft>) => void }) {
  const a = draft.account || {};
  const [emailOtp, setEmailOtp] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");

  // Dev-only OTP codes printed to server console
  function genOTP() {
    return (Math.floor(100000 + Math.random() * 900000)).toString();
  }
  const [emailCode, setEmailCode] = useState<string | null>(null);
  const [phoneCode, setPhoneCode] = useState<string | null>(null);

  function sendEmailOtp() {
    if (!a.email) return;
    const code = genOTP();
    setEmailCode(code);
    console.log("[DEV] Email OTP sent to", a.email, "code:", code);
  }
  function verifyEmailOtp() {
    if (emailCode && emailOtp === emailCode) {
      onChange({ account: { ...a, emailVerified: true } });
    }
  }

  function sendPhoneOtp() {
    if (!a.phone) return;
    const code = genOTP();
    setPhoneCode(code);
    console.log("[DEV] SMS OTP sent to", a.phone, "code:", code);
  }
  function verifyPhoneOtp() {
    if (phoneCode && phoneOtp === phoneCode) {
      onChange({ account: { ...a, phoneVerified: true } });
    }
  }

  const passwordOk = (p?: string) => !!p && p.length >= 8;

  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold text-amber-300">Create Account</h2>

      {/* Email + OTP */}
      <div className="grid md:grid-cols-3 gap-4 items-end">
        <Input
          label="Email"
          value={a.email}
          onChange={(v) => onChange({ account: { ...a, email: v, emailVerified: false } })}
        />
        <button
          onClick={sendEmailOtp}
          className="px-4 py-2 rounded-md border border-neutral-700 text-neutral-200 hover:bg-neutral-900 transition"
        >
          Send Email OTP (dev)
        </button>
        <div className="flex items-center gap-2">
          <input
            placeholder="Enter code"
            className="w-full rounded-md border border-neutral-700 bg-black/40 p-2 outline-none focus:border-amber-400"
            value={emailOtp}
            onChange={(e) => setEmailOtp(e.target.value)}
          />
          <button
            onClick={verifyEmailOtp}
            className={`px-3 py-2 rounded-md ${a.emailVerified ? "bg-emerald-600 text-white" : "bg-amber-400 text-black"}`}
          >
            {a.emailVerified ? "Verified" : "Verify"}
          </button>
        </div>
      </div>

      {/* Phone + OTP */}
      <div className="grid md:grid-cols-3 gap-4 items-end">
        <Input
          label="Phone (with country code)"
          value={a.phone}
          onChange={(v) => onChange({ account: { ...a, phone: v, phoneVerified: false } })}
        />
        <button
          onClick={sendPhoneOtp}
          className="px-4 py-2 rounded-md border border-neutral-700 text-neutral-200 hover:bg-neutral-900 transition"
        >
          Send SMS OTP (dev)
        </button>
        <div className="flex items-center gap-2">
          <input
            placeholder="Enter code"
            className="w-full rounded-md border border-neutral-700 bg-black/40 p-2 outline-none focus:border-amber-400"
            value={phoneOtp}
            onChange={(e) => setPhoneOtp(e.target.value)}
          />
          <button
            onClick={verifyPhoneOtp}
            className={`px-3 py-2 rounded-md ${a.phoneVerified ? "bg-emerald-600 text-white" : "bg-amber-400 text-black"}`}
          >
            {a.phoneVerified ? "Verified" : "Verify"}
          </button>
        </div>
      </div>

      {/* Password */}
      <div className="grid md:grid-cols-3 gap-4">
        <Input
          label="Set password (min 8 chars)"
          value={a.passwordSet ? "********" : ""}
          onChange={(v) => {
            const ok = passwordOk(v);
            onChange({ account: { ...a, passwordSet: ok } });
          }}
        />
        <div className={`text-sm ${a.passwordSet ? "text-emerald-400" : "text-neutral-400"} md:col-span-2`}>
          {a.passwordSet ? "Password set ✔︎" : "Tip: use 8+ chars; in production we’ll add strength rules"}
        </div>
      </div>

      <p className="text-xs text-neutral-500">
        Dev mode: OTP codes are printed to the server console. In production we’ll send via Resend (email) and an SMS provider (e.g., Twilio).
      </p>
    </section>
  );
}

function StepIdentity({ draft, onChange }: { draft: Draft; onChange: (p: Partial<Draft>) => void }) {
  const setPassport = (file?: File) =>
    onChange({ identity: { ...draft.identity, passportName: file?.name || draft.identity?.passportName } });
  const setSelfie = (file?: File) =>
    onChange({ identity: { ...draft.identity, selfieName: file?.name || draft.identity?.selfieName } });

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-amber-300">Identity (stub)</h2>
      <p className="text-sm text-neutral-400">Dev-only: we store filenames to simulate uploads.</p>
      <div className="grid md:grid-cols-2 gap-4">
        <FileInput label="Passport upload" onFile={(f) => setPassport(f)} fileName={draft.identity?.passportName} />
        <FileInput label="Selfie upload" onFile={(f) => setSelfie(f)} fileName={draft.identity?.selfieName} />
      </div>
    </section>
  );
}

function StepCompany({ draft, onChange }: { draft: Draft; onChange: (p: Partial<Draft>) => void }) {
  if (draft.applicant_type !== "corporate")
    return <MutedCard>Individual selected — no company details required.</MutedCard>;

  const c = draft.company || {};
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-amber-300">Company (review & edit)</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Company Name" value={c.name} onChange={(v) => onChange({ company: { ...c, name: v } })} />
        <Input label="Registration Number" value={c.regNo} onChange={(v) => onChange({ company: { ...c, regNo: v } })} />
        <Input label="Registered Address" value={c.regAddress} onChange={(v) => onChange({ company: { ...c, regAddress: v } })} />
        <Input label="Operating Address" value={c.opAddress} onChange={(v) => onChange({ company: { ...c, opAddress: v } })} />
      </div>
    </section>
  );
}

function StepUbo({ draft, onChange }: { draft: Draft; onChange: (p: Partial<Draft>) => void }) {
  const list = draft.ubos || [];
  const add = () => onChange({ ubos: [...list, { id: crypto.randomUUID(), pep: false } as UBO] });
  const remove = (id: string) => onChange({ ubos: list.filter((u) => u.id !== id) });
  const update = (id: string, patch: Partial<UBO>) =>
    onChange({ ubos: list.map((u) => (u.id === id ? { ...u, ...patch } : u)) });

  const totalPct = Math.round((list.reduce((s, u) => s + (u.ownership || 0), 0) + Number.EPSILON) * 100) / 100;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-amber-300">Shareholders & UBOs</h2>
        <button onClick={add} className="px-3 py-1.5 rounded-md bg-amber-400 text-black hover:brightness-95 transition">
          + Add UBO
        </button>
      </div>

      <div className="text-xs text-neutral-400">
        Ownership total:{" "}
        <span className={`${totalPct === 100 ? "text-emerald-400" : "text-amber-300"}`}>{totalPct}%</span> (target 100%)
      </div>

      {list.length === 0 && <MutedCard>No UBOs added yet.</MutedCard>}

      <div className="space-y-3">
        {list.map((u) => (
          <div key={u.id} className="rounded-lg border border-neutral-800 bg-black/40 p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="Full Name" value={u.name} onChange={(v) => update(u.id, { name: v })} />
              <Input label="Nationality" value={u.nationality} onChange={(v) => update(u.id, { nationality: v })} />
              <NumberInput label="% Ownership" value={u.ownership} onChange={(v) => update(u.id, { ownership: v })} />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-4">
              <Toggle label="PEP" checked={!!u.pep} onChange={(b) => update(u.id, { pep: b })} />
              <FileInline label="Passport (stub)" onFile={(f) => update(u.id, { passportName: f?.name })} fileName={u.passportName} />
              <button
                onClick={() => remove(u.id)}
                className="ml-auto px-3 py-1.5 rounded-md border border-red-500 text-red-400 hover:bg-red-500/10"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StepServices({ draft, onChange }: { draft: Draft; onChange: (p: Partial<Draft>) => void }) {
  const isIndividual = draft.applicant_type === "individual";
  const items = isIndividual ? INDIVIDUAL_SERVICES : CORPORATE_SERVICES;
  const selected = new Set(draft.services || []);
  const toggle = (x: string) => {
    selected.has(x) ? selected.delete(x) : selected.add(x);
    onChange({ services: Array.from(selected) });
  };

  const sd = draft.serviceDetails || {};

  return (
    <section className="space-y-5">
      <h2 className="text-lg font-semibold text-amber-300">Services</h2>

      <div className="flex flex-wrap gap-2">
        {items.map((x) => (
          <button
            key={x}
            onClick={() => toggle(x)}
            className={`px-3 py-2 rounded-full text-sm transition ${
              selected.has(x as any)
                ? "bg-amber-400 text-black shadow-[0_0_14px_rgba(251,191,36,.35)]"
                : "border border-neutral-700 text-neutral-200 hover:bg-neutral-900"
            }`}
          >
            {x}
          </button>
        ))}
      </div>

      {/* INDIVIDUAL PANELS */}
      {isIndividual && selected.has("Buy Gold") && (
        <Card title="Buy Gold">
          <Select
            label="Product type"
            value={sd.BuyGold?.type}
            options={["Bars", "Coins", "Either"]}
            onChange={(v) => onChange({ serviceDetails: { ...sd, BuyGold: { ...(sd.BuyGold || {}), type: v as any } } })}
          />
          <Input
            label="Budget (AED or range)"
            value={sd.BuyGold?.budget}
            onChange={(v) => onChange({ serviceDetails: { ...sd, BuyGold: { ...(sd.BuyGold || {}), budget: v } } })}
          />
          <Input
            label="Preferred brand/mint (optional)"
            value={sd.BuyGold?.brand}
            onChange={(v) => onChange({ serviceDetails: { ...sd, BuyGold: { ...(sd.BuyGold || {}), brand: v } } })}
          />
          <Input
            label="Delivery preference (collect/ship)"
            value={sd.BuyGold?.delivery}
            onChange={(v) => onChange({ serviceDetails: { ...sd, BuyGold: { ...(sd.BuyGold || {}), delivery: v } } })}
          />
        </Card>
      )}

      {isIndividual && selected.has("Sell Gold") && (
        <Card title="Sell Gold">
          <Select
            label="Item type"
            value={sd.SellGold?.type}
            options={["Bars", "Coins", "Jewellery", "Scrap"]}
            onChange={(v) => onChange({ serviceDetails: { ...sd, SellGold: { ...(sd.SellGold || {}), type: v as any } } })}
          />
          <Input
            label="Approx. weight (g or oz)"
            value={sd.SellGold?.weight}
            onChange={(v) => onChange({ serviceDetails: { ...sd, SellGold: { ...(sd.SellGold || {}), weight: v } } })}
          />
          <Input
            label="Purity / Karat (if known)"
            value={sd.SellGold?.purity}
            onChange={(v) => onChange({ serviceDetails: { ...sd, SellGold: { ...(sd.SellGold || {}), purity: v } } })}
          />
          <Input
            label="Preferred settlement (cash/transfer)"
            value={sd.SellGold?.settlement}
            onChange={(v) => onChange({ serviceDetails: { ...sd, SellGold: { ...(sd.SellGold || {}), settlement: v } } })}
          />
        </Card>
      )}

      {isIndividual && selected.has("Deposit Gold") && (
        <Card title="Deposit Gold">
          <Select
            label="Form"
            value={sd.DepositGold?.form}
            options={["Bars", "Coins"]}
            onChange={(v) => onChange({ serviceDetails: { ...sd, DepositGold: { ...(sd.DepositGold || {}), form: v as any } } })}
          />
          <Input
            label="Quantity / total weight"
            value={sd.DepositGold?.qty}
            onChange={(v) => onChange({ serviceDetails: { ...sd, DepositGold: { ...(sd.DepositGold || {}), qty: v } } })}
          />
          <Input
            label="Desired tenor (months)"
            value={sd.DepositGold?.tenor}
            onChange={(v) => onChange({ serviceDetails: { ...sd, DepositGold: { ...(sd.DepositGold || {}), tenor: v } } })}
          />
        </Card>
      )}

      {isIndividual && selected.has("Storage/Logistics") && (
        <Card title="Storage / Logistics">
          <Select
            label="Service needed"
            value={sd.Storage?.service}
            options={["Storage", "Secure Transport", "Both"]}
            onChange={(v) => onChange({ serviceDetails: { ...sd, Storage: { ...(sd.Storage || {}), service: v as any } } })}
          />
          <Input
            label="Pickup city / country"
            value={sd.Storage?.pickup}
            onChange={(v) => onChange({ serviceDetails: { ...sd, Storage: { ...(sd.Storage || {}), pickup: v } } })}
          />
          <Input
            label="Destination city / country"
            value={sd.Storage?.dropoff}
            onChange={(v) => onChange({ serviceDetails: { ...sd, Storage: { ...(sd.Storage || {}), dropoff: v } } })}
          />
          <Input
            label="Est. weight / value"
            value={sd.Storage?.declared}
            onChange={(v) => onChange({ serviceDetails: { ...sd, Storage: { ...(sd.Storage || {}), declared: v } } })}
          />
        </Card>
      )}

      {/* CORPORATE PANELS */}
      {!isIndividual && selected.has("Trader") && (
        <Card title="Gold Trader / Bullion Dealer">
          <Select
            label="Nature of business"
            value={sd.Trader?.nature}
            options={["Wholesale", "Retail", "Both"]}
            onChange={(v) => onChange({ serviceDetails: { ...sd, Trader: { ...(sd.Trader || {}), nature: v as any } } })}
          />
          <ChipMulti
            label="Products"
            options={["Bars", "Coins", "Scrap"]}
            value={sd.Trader?.products ?? []}
            onChange={(arr) => onChange({ serviceDetails: { ...sd, Trader: { ...(sd.Trader || {}), products: arr } } })}
          />
          <Input
            label="Expected monthly volume (AED or kg)"
            value={sd.Trader?.monthlyVolume}
            onChange={(v) => onChange({ serviceDetails: { ...sd, Trader: { ...(sd.Trader || {}), monthlyVolume: v } } })}
          />
          <Input
            label="Storage method"
            value={sd.Trader?.storage}
            onChange={(v) => onChange({ serviceDetails: { ...sd, Trader: { ...(sd.Trader || {}), storage: v } } })}
          />
          <Input
            label="Counterparty types"
            value={sd.Trader?.counterparties}
            onChange={(v) => onChange({ serviceDetails: { ...sd, Trader: { ...(sd.Trader || {}), counterparties: v } } })}
          />
          <Input
            label="Trading licenses (if applicable)"
            value={sd.Trader?.licenses}
            onChange={(v) => onChange({ serviceDetails: { ...sd, Trader: { ...(sd.Trader || {}), licenses: v } } })}
          />
        </Card>
      )}

      {!isIndividual && selected.has("Supplier") && (
        <Card title="Supplier / Dore / Producer">
          <Select
            label="Supplier type"
            value={sd.Supplier?.type}
            options={["Mine", "Aggregator", "Dealer"]}
            onChange={(v) => onChange({ serviceDetails: { ...sd, Supplier: { ...(sd.Supplier || {}), type: v as any } } })}
          />
          <Input
            label="Country of origin of metal"
            value={sd.Supplier?.originCountry}
            onChange={(v) => onChange({ serviceDetails: { ...sd, Supplier: { ...(sd.Supplier || {}), originCountry: v } } })}
          />
          <Input
            label="Purity range"
            value={sd.Supplier?.purityRange}
            onChange={(v) => onChange({ serviceDetails: { ...sd, Supplier: { ...(sd.Supplier || {}), purityRange: v } } })}
          />
          <Input
            label="Shipment frequency"
            value={sd.Supplier?.shipmentFrequency}
            onChange={(v) => onChange({ serviceDetails: { ...sd, Supplier: { ...(sd.Supplier || {}), shipmentFrequency: v } } })}
          />
          <Input
            label="Logistics partner (Brinks/Loomis/Ferrari…)"
            value={sd.Supplier?.logistics}
            onChange={(v) => onChange({ serviceDetails: { ...sd, Supplier: { ...(sd.Supplier || {}), logistics: v } } })}
          />
          <Toggle
            label="Mine origin documentation available?"
            checked={!!sd.Supplier?.hasMineDocs}
            onChange={(b) => onChange({ serviceDetails: { ...sd, Supplier: { ...(sd.Supplier || {}), hasMineDocs: b } } })}
          />
          <Toggle
            label="OECD due diligence questionnaire completed?"
            checked={!!sd.Supplier?.oecdQuestionnaire}
            onChange={(b) => onChange({ serviceDetails: { ...sd, Supplier: { ...(sd.Supplier || {}), oecdQuestionnaire: b } } })}
          />
        </Card>
      )}

      {!isIndividual && selected.has("Jewellery") && (
        <Card title="Jewellery Shop / Manufacturer">
          <Select
            label="Operation mode"
            value={sd.Jewellery?.mode}
            options={["Manufacturing", "Retail", "Both"]}
            onChange={(v) => onChange({ serviceDetails: { ...sd, Jewellery: { ...(sd.Jewellery || {}), mode: v as any } } })}
          />
          <ChipMulti
            label="Products"
            options={["Rings", "Necklaces", "Bracelets", "Sets", "Other"]}
            value={sd.Jewellery?.products ?? []}
            onChange={(arr) => onChange({ serviceDetails: { ...sd, Jewellery: { ...(sd.Jewellery || {}), products: arr } } })}
          />
          <Toggle
            label="Sells scrap gold?"
            checked={!!sd.Jewellery?.scrap}
            onChange={(b) => onChange({ serviceDetails: { ...sd, Jewellery: { ...(sd.Jewellery || {}), scrap: b } } })}
          />
          <Input
            label="Expected monthly volume"
            value={sd.Jewellery?.volume}
            onChange={(v) => onChange({ serviceDetails: { ...sd, Jewellery: { ...(sd.Jewellery || {}), volume: v } } })}
          />
        </Card>
      )}

      {!isIndividual && selected.has("Institutional") && (
        <Card title="Institutional Investor">
          <Input
            label="Entity type (Fund/Treasury/Corporate)"
            value={sd.Institutional?.entityType}
            onChange={(v) => onChange({ serviceDetails: { ...sd, Institutional: { ...(sd.Institutional || {}), entityType: v } } })}
          />
          <Input
            label="Source of investment funds"
            value={sd.Institutional?.sourceFunds}
            onChange={(v) => onChange({ serviceDetails: { ...sd, Institutional: { ...(sd.Institutional || {}), sourceFunds: v } } })}
          />
          <Toggle
            label="Regulated?"
            checked={!!sd.Institutional?.regulated}
            onChange={(b) => onChange({ serviceDetails: { ...sd, Institutional: { ...(sd.Institutional || {}), regulated: b } } })}
          />
          <Input
            label="Regulator (if regulated)"
            value={sd.Institutional?.regulator}
            onChange={(v) => onChange({ serviceDetails: { ...sd, Institutional: { ...(sd.Institutional || {}), regulator: v } } })}
          />
          <Input
            label="Compliance officer contact"
            value={sd.Institutional?.complianceOfficer}
            onChange={(v) => onChange({ serviceDetails: { ...sd, Institutional: { ...(sd.Institutional || {}), complianceOfficer: v } } })}
          />
        </Card>
      )}

      {!isIndividual && selected.has("Refining") && (
        <Card title="Refinery Client (sending dore)">
          <Input
            label="Source of dore"
            value={sd.Refining?.source}
            onChange={(v) => onChange({ serviceDetails: { ...sd, Refining: { ...(sd.Refining || {}), source: v } } })}
          />
          <Input
            label="Expected shipment volume (kg)"
            value={sd.Refining?.volumeKg}
            onChange={(v) => onChange({ serviceDetails: { ...sd, Refining: { ...(sd.Refining || {}), volumeKg: v } } })}
          />
          <Input
            label="Purity estimate"
            value={sd.Refining?.purityEstimate}
            onChange={(v) => onChange({ serviceDetails: { ...sd, Refining: { ...(sd.Refining || {}), purityEstimate: v } } })}
          />
          <Input
            label="Assay requirements"
            value={sd.Refining?.assay}
            onChange={(v) => onChange({ serviceDetails: { ...sd, Refining: { ...(sd.Refining || {}), assay: v } } })}
          />
          <Input
            label="Frequency"
            value={sd.Refining?.frequency}
            onChange={(v) => onChange({ serviceDetails: { ...sd, Refining: { ...(sd.Refining || {}), frequency: v } } })}
          />
          <Input
            label="Logistics provider"
            value={sd.Refining?.logistics}
            onChange={(v) => onChange({ serviceDetails: { ...sd, Refining: { ...(sd.Refining || {}), logistics: v } } })}
          />
        </Card>
      )}
    </section>
  );
}

function StepReview({ draft }: { draft: Draft }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-amber-300">Review</h2>
      <pre className="bg-black/40 border border-neutral-800 rounded-lg p-4 text-xs text-neutral-300 overflow-x-auto">
        {JSON.stringify(draft, null, 2)}
      </pre>
      <p className="text-sm text-neutral-400">
        “Download JSON” saves this payload locally. In production we’ll POST to the backend.
      </p>
    </section>
  );
}

/* ================================
   UI Helpers
=================================== */
function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-black/40 p-4">
      <h3 className="text-white font-medium mb-3">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function MutedCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-black/40 p-4 text-neutral-400 text-sm">
      {children}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="text-sm text-neutral-300">
      <span className="block mb-1">{label}</span>
      <input
        className="w-full rounded-md border border-neutral-700 bg-black/40 p-2 outline-none focus:border-amber-400 transition"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
      />
    </label>
  );
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: number;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <label className="text-sm text-neutral-300">
      <span className="block mb-1">{label}</span>
      <input
        type="number"
        className="w-full rounded-md border border-neutral-700 bg-black/40 p-2 outline-none focus:border-amber-400 transition"
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? undefined : Number(e.target.value))
        }
        placeholder={label}
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-neutral-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value?: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="text-sm text-neutral-300">
      <span className="block mb-1">{label}</span>
      <select
        className="w-full rounded-md border border-neutral-700 bg-black/40 p-2 outline-none focus:border-amber-400 transition"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>
          Select…
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function ChipMulti({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string[];
  onChange: (arr: string[]) => void;
}) {
  const set = new Set(value);
  const toggle = (x: string) => {
    set.has(x) ? set.delete(x) : set.add(x);
    onChange(Array.from(set));
  };
  return (
    <div className="md:col-span-2">
      <div className="mb-2 text-sm text-neutral-300">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((x) => (
          <button
            key={x}
            onClick={() => toggle(x)}
            className={`px-3 py-1.5 rounded-full text-sm transition ${
              set.has(x)
                ? "bg-amber-400 text-black shadow-[0_0_12px_rgba(251,191,36,.35)]"
                : "border border-neutral-700 text-neutral-200 hover:bg-neutral-900"
            }`}
          >
            {x}
          </button>
        ))}
      </div>
    </div>
  );
}

function FileInput({
  label,
  fileName,
  onFile,
}: {
  label: string;
  fileName?: string;
  onFile: (f?: File) => void;
}) {
  return (
    <label className="text-sm text-neutral-300">
      <span className="block mb-1">{label}</span>
      <input
        type="file"
        className="block w-full text-sm text-neutral-300 file:mr-4 file:rounded-md file:border-0 file:bg-amber-400 file:text-black file:px-3 file:py-1.5 hover:file:brightness-95"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <div className="text-xs text-neutral-400 mt-1">{fileName || "No file chosen"}</div>
    </label>
  );
}

function FileInline({
  label,
  fileName,
  onFile,
}: {
  label: string;
  fileName?: string;
  onFile: (f?: File) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-neutral-300">
      {label}
      <input type="file" className="text-xs" onChange={(e) => onFile(e.target.files?.[0])} />
      <span className="text-xs text-neutral-400">{fileName || "—"}</span>
    </label>
  );
}

/* ================================
   Utils
=================================== */
function downloadJSON(data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sitara_onboarding_submission.json";
  a.click();
  URL.revokeObjectURL(url);
}
