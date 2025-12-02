"use client";

import React from "react";
import {
  GOLD,
  GOLD_BG_SOFT,
  Label,
  Owner,
  isTruthy,
} from "../onboardingShared";

export function OwnershipStep({
  answers,
  setValue,
}: {
  answers: Record<string, any>;
  setValue: (id: string, val: any) => void;
}) {
  const baseInput =
    "w-full rounded-lg border border-neutral-800 bg-black/40 text-neutral-100 placeholder:text-neutral-500 px-3 py-2 " +
    "focus:outline-none focus:ring-1 focus:border-[--gold-color] focus:ring-[--gold-color] transition";

  const owners: Owner[] = Array.isArray(answers.owners) ? answers.owners : [];

  function setOwners(next: Owner[]) {
    setValue("owners", next);
  }

  function addOwner() {
    const id = `owner_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 6)}`;
    const next: Owner[] = [
      ...owners,
      {
        id,
        ownerType: "",
        share: "",
      },
    ];
    setOwners(next);
  }

  function updateOwner(idx: number, patch: Partial<Owner>) {
    const next = owners.slice();
    const curr = next[idx] || { id: `owner_${idx}` };
    next[idx] = { ...curr, ...patch };
    setOwners(next);
  }

  function removeOwner(idx: number) {
    const next = owners.filter((_, i) => i !== idx);
    setOwners(next);
  }

  function OwnerFileInput(props: {
    ownerKey: string;
    label: string;
    accept?: string;
    multiple?: boolean;
  }) {
    const {
      ownerKey,
      label,
      accept = ".pdf,.jpg,.jpeg,.png,.zip",
      multiple = true,
    } = props;
    const displayKey = ownerKey;
    const filesKey = `${ownerKey}__files`;
    const displayVal = answers[displayKey];

    return (
      <div>
        <Label>{label}</Label>
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          className="block w-full text-sm text-neutral-300 file:mr-4 file:rounded-md file:border file:border-[--gold-color] file:bg-transparent file:text-[--gold-color] file:px-3 file:py-1.5 hover:file:bg-[--gold-bg-soft]"
          onChange={(e) => {
            const fl = e.target.files ? Array.from(e.target.files) : [];
            setValue(filesKey, multiple ? fl : fl.slice(0, 1));
            const names = fl.map((x) => x.name);
            setValue(displayKey, multiple ? names : names[0] || null);
          }}
        />
        {isTruthy(displayVal) && (
          <p className="mt-2 text-xs text-neutral-400">
            Attached:{" "}
            {Array.isArray(displayVal)
              ? (displayVal as string[]).join(", ")
              : String(displayVal)}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Intro note */}
      <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
        <h2 className="text-sm font-semibold text-neutral-100 mb-1">
          Who owns or controls the business?
        </h2>
        <p className="text-sm text-neutral-300">
          Disclose all Ultimate Beneficial Owners (UBOs) and other controlling
          parties. Include any person or entity with{" "}
          <strong className="text-neutral-100">
            ≥25% ownership or control
          </strong>{" "}
          or significant influence.
        </p>
      </div>

      {/* Owners list */}
      <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-neutral-100">
            Owners / Controllers
          </h3>
          <button
            type="button"
            onClick={addOwner}
            className="inline-flex items-center gap-1 rounded-lg border border-[--gold-color] px-3 py-1.5 text-xs font-medium text-[--gold-color] hover:bg-[--gold-bg-soft]"
          >
            <span>＋</span> Add owner
          </button>
        </div>

        {owners.length === 0 && (
          <p className="text-xs text-neutral-400">
            No owners added yet. Start by adding at least one owner.
          </p>
        )}

        <div className="space-y-4 mt-2">
          {owners.map((owner, idx) => {
            const index = idx + 1;
            const ownerType = owner.ownerType || "";
            const isIndividual = ownerType === "individual";
            const isEntity =
              ownerType === "company" ||
              ownerType === "spv" ||
              ownerType === "trust" ||
              ownerType === "foundation" ||
              ownerType === "other_entity";

            const ownerPrefix = `owner_${owner.id || idx}`;

            return (
              <div
                key={owner.id || idx}
                className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-neutral-300">
                    Owner {index}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeOwner(idx)}
                    className="text-xs text-neutral-400 hover:text-red-400"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label>Owner Type</Label>
                    <select
                      className={baseInput}
                      value={ownerType}
                      onChange={(e) =>
                        updateOwner(idx, {
                          ownerType: e.target.value as Owner["ownerType"],
                        })
                      }
                    >
                      <option value="">Select…</option>
                      <option value="individual">Individual</option>
                      <option value="company">Company / Corporate</option>
                      <option value="spv">SPV / Holding vehicle</option>
                      <option value="trust">Trust</option>
                      <option value="foundation">Foundation</option>
                      <option value="other_entity">
                        Other entity / association
                      </option>
                    </select>
                  </div>

                  <div>
                    <Label>Ownership / Control (%)</Label>
                    <input
                      type="number"
                      className={baseInput}
                      value={owner.share ?? ""}
                      onChange={(e) =>
                        updateOwner(idx, {
                          share:
                            e.target.value === ""
                              ? ""
                              : Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                {isIndividual && (
                  <div className="border-top border-neutral-800 pt-3 space-y-3">
                    <div className="text-xs font-semibold text-neutral-300">
                      Owner documents (individual)
                    </div>
                    <p className="text-xs text-neutral-500">
                      Start with the minimum: passport/ID and one proof of
                      address for this person. We’ll extract name, nationality
                      and other details from these documents.
                    </p>
                    <div className="grid md:grid-cols-2 gap-3">
                      <OwnerFileInput
                        ownerKey={`${ownerPrefix}_idDoc`}
                        label="Passport / ID document"
                      />
                      <OwnerFileInput
                        ownerKey={`${ownerPrefix}_proofAddress`}
                        label="Proof of residential address"
                      />
                    </div>
                  </div>
                )}

                {isEntity && (
                  <div className="border-top border-neutral-800 pt-3 space-y-3">
                    <div className="text-xs font-semibold text-neutral-300">
                      Owner documents (entity)
                    </div>
                    <p className="text-xs text-neutral-500">
                      Upload the key corporate documents for this owner. We’ll
                      extract legal name, jurisdiction, registration numbers and
                      other details automatically where possible.
                    </p>
                    <div className="grid md:grid-cols-2 gap-3">
                      <OwnerFileInput
                        ownerKey={`${ownerPrefix}_legalExistence`}
                        label="Proof of legal existence (licence / certificate)"
                      />
                      <OwnerFileInput
                        ownerKey={`${ownerPrefix}_ownershipProof`}
                        label="Proof of ownership / shareholding"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <style>{`:root{--gold-color:${GOLD};--gold-bg-soft:${GOLD_BG_SOFT}}`}</style>
      </div>

      <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
        <Label required>
          I confirm the ownership structure is complete and accurate.
        </Label>
        <label className="inline-flex items-center gap-2 text-neutral-100 text-sm">
          <input
            type="radio"
            name="ownershipDeclaration"
            className="h-4 w-4 accent-[--gold-color]"
            checked={answers.ownershipDeclaration === "agree"}
            onChange={() => setValue("ownershipDeclaration", "agree")}
          />
          <span>I agree</span>
        </label>
        <style>{`:root{--gold-color:${GOLD}}`}</style>
      </div>
    </div>
  );
}
