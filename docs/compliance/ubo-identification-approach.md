# UBO Identification — Handling Dispersed Ownership (All Shareholders < 25%)

**Status:** Proposed approach — requires MLRO / compliance sign-off before build
**Date:** 2026-06-14
**Scope:** Sitara business onboarding, Ownership step (beneficial owners)

> ⚠️ **Compliance caveat.** This document describes the standard FATF / UAE framework as a starting point. The exact thresholds, control criteria, fallback wording, and evidence requirements **must be reviewed and approved by Sitara's MLRO / compliance function** before implementation. Jurisdictions vary and regulators scrutinise this area closely.

---

## 1. The problem

The current Ownership step enforces a hard rule: an owner must hold **≥ 25%** to be recorded ("Ownership must be 25% or more to qualify as a beneficial owner"). Any individual below 25% cannot be added.

This creates a **compliance gap**: a legitimate company whose shareholders *all* hold below 25% (dispersed ownership) cannot complete onboarding correctly, and — more importantly — the platform would record **zero beneficial owners**, which is never an acceptable outcome under AML rules. There must always be at least one identified UBO.

Dispersed ownership does not exempt a company from UBO identification. It simply moves identification down a defined **cascade**.

## 2. Regulatory basis

- **FATF Recommendation 24/25** and the FATF Guidance on Beneficial Ownership.
- **UAE Cabinet Decision No. 58 of 2020** on the Regulation of Procedures of the Real Beneficiary (UBO procedures), and related Ministry of Economy guidance.
- General AML/CFT principle: the obliged entity (Sitara) must identify the natural person(s) who ultimately own or control the customer, and **never** conclude that there is no beneficial owner.

The 25% figure is the conventional **ownership threshold**. It is a trigger for the *ownership test* only — not a floor below which identification stops.

## 3. The three-step cascade

Identification proceeds in order. You move to the next step only when the current step yields no UBO.

### Step 1 — Ownership test
Identify every natural person who ultimately owns **≥ 25%** of the company (directly or through intermediate entities — see §5 on layering).

- If one or more individuals meet this, they are UBOs. Identify and screen each.
- If **no** individual meets 25%, proceed to Step 2.

### Step 2 — Control test (control by other means)
Even with < 25% (or 0%) equity, a natural person is a UBO if they **control** the company by other means, e.g.:
- Holding a majority or controlling block of **voting rights** (which may differ from equity).
- The right to **appoint or remove the majority of the board / directors**.
- Control through a **shareholders' agreement, veto rights, or dominant influence**.
- Acting through **nominees** or otherwise exercising de facto control.

- If such a person exists, they are a UBO. Identify and screen.
- If **no** controlling person can be identified, proceed to Step 3.

### Step 3 — Senior managing official fallback
If — and only if — no UBO is found via ownership **or** control, the company's **senior managing official(s)** (typically the director(s) / CEO) are treated as the **deemed UBO**.

- This is a genuine fallback, not a shortcut. The flow must require it when Steps 1–2 yield nothing.
- The deemed UBO(s) receive the **same KYC and screening** as any other UBO (ID document, name, nationality, DOB, PEP, sanctions).
- Record explicitly that this person is the UBO **by virtue of senior management**, not ownership — the basis must be auditable.

**Invariant:** the cascade always terminates with **at least one identified, screened UBO**.

## 4. How the onboarding flow should handle it

Proposed changes to the Ownership step (subject to MLRO sign-off):

1. **Remove the hard ≥25% block.** Allow material shareholders below 25% to be recorded (for transparency), or at minimum stop treating <25% as a dead end. Keep a non-blocking note that <25% alone does not make someone a UBO.
2. **Add a branching question** when no ≥25% owner has been added, e.g.:
   - *"Does any individual ultimately own 25% or more of the company?"* → **No** →
   - *"Does any individual control the company by other means (voting rights, board appointment, controlling agreements, or significant influence)?"* → **No** →
   - **Require entry of the senior managing official(s)** as the deemed UBO.
3. **Capture the basis of UBO status** for each person: `ownership` | `control` | `senior_managing_official`. This drives reporting and audit.
4. **Screen every identified UBO** regardless of the path taken — ID, PEP, sanctions — exactly as the current individual-owner modal does.
5. **The final attestation** should reflect the path taken (e.g., "no individual holds ≥25%; UBO identified via control / senior management").

## 5. Edge cases to design for

- **Layered ownership** — an individual owning ≥25% *through* one or more intermediate companies. The 25% test applies to the ultimate natural person, so indirect holdings must be aggregated/calculated, not just direct equity.
- **Trusts / foundations / SPVs** — identify settlor, trustee, protector, and beneficiaries (or class of beneficiaries) as applicable; the "owner" is rarely a simple shareholder.
- **Nominee arrangements** — the nominee is not the UBO; the nominator (the real controller) is.
- **Publicly listed companies / regulated entities** — may qualify for simplified treatment under the rules; confirm with MLRO whether an exemption applies.
- **Multiple deemed officials** — if control is genuinely shared among several senior officials, more than one deemed UBO may be required.

## 6. Data-model implications (for a later spec)

These are flagged for the implementation spec, **not** decided here:

- Add a `ubo_basis` field to the beneficial-owner record: `ownership | control | senior_managing_official`.
- Allow `ownership_percentage` below 25% (or null for control/official-based UBOs).
- Possibly a flag on the application: "no individual holds ≥25%" + the control-test answer, for audit.
- Ensure backend validation no longer rejects sub-25% owners and enforces the "at least one UBO" invariant instead.

## 7. Open questions for MLRO / compliance

1. Confirm the ownership threshold (25%?) and whether a lower threshold applies to any product/risk tier.
2. Define the exact **control-test** criteria and the wording shown to the applicant.
3. Confirm the **senior managing official** definition (which roles qualify) and evidence required.
4. Should sub-25% shareholders be **recorded** for transparency, or only those meeting a test? If recorded, how are they screened?
5. Confirm treatment of trusts, nominees, and listed/regulated entities.
6. What must be **evidenced** at each cascade step (e.g., shareholder register, board resolution, org chart)?

## 8. Next step

On MLRO sign-off of §3, §4, and §7, take this into a full design spec (brainstorming → spec → implementation plan) covering the flow changes, data model, validation, and backend.
