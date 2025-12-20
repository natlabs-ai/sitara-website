// src\app\onboarding\steps\AuthorisedPeopleStep.tsx

"use client";

import React from "react";

type Person = {
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
};

export default function AuthorisedPeopleStep({
  answers,
  setValue,
}: {
  answers: Record<string, any>;
  setValue: (id: string, val: any) => void;
}) {
  const people: Person[] = Array.isArray(answers.authorisedPeople)
    ? answers.authorisedPeople
    : [];

  const updatePerson = (idx: number, patch: Partial<Person>) => {
    const next = [...people];
    const current = next[idx] ?? { firstName: "", lastName: "", email: "", role: "" };
    next[idx] = { ...current, ...patch };
    setValue("authorisedPeople", next);
  };

  const addPerson = () => {
    const next = [
      ...people,
      { firstName: "", lastName: "", email: "", role: "" } as Person,
    ];
    setValue("authorisedPeople", next);
  };

  const removePerson = (idx: number) => {
    const next = people.filter((_, i) => i !== idx);
    setValue("authorisedPeople", next);
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-neutral-800 bg-black/30 p-5">
        <h2 className="text-sm font-semibold text-neutral-100">
          Authorised people who can operate this account
        </h2>
        <p className="mt-1 text-xs text-neutral-400">
          Add any additional users who should be allowed to access and operate the
          account (e.g. compliance, operations, finance). This is optional for MVP.
        </p>
      </section>

      <div className="space-y-4">
        {people.length === 0 ? (
          <div className="rounded-2xl border border-neutral-800 bg-black/30 p-5 text-sm text-neutral-300">
            No authorised people added yet.
          </div>
        ) : (
          people.map((p, idx) => (
            <section
              key={idx}
              className="rounded-2xl border border-neutral-800 bg-black/30 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold text-neutral-100">
                  Authorised person {idx + 1}
                </h3>
                <button
                  type="button"
                  onClick={() => removePerson(idx)}
                  className="text-xs text-neutral-400 underline-offset-2 hover:text-neutral-100 hover:underline"
                >
                  Remove
                </button>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-300">
                    First name
                  </label>
                  <input
                    type="text"
                    value={p.firstName || ""}
                    onChange={(e) => updatePerson(idx, { firstName: e.target.value })}
                    className="w-full rounded-xl border border-neutral-800 bg-black/60 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-[#bfa76f] focus:outline-none focus:ring-1 focus:ring-[#bfa76f]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-300">
                    Family name
                  </label>
                  <input
                    type="text"
                    value={p.lastName || ""}
                    onChange={(e) => updatePerson(idx, { lastName: e.target.value })}
                    className="w-full rounded-xl border border-neutral-800 bg-black/60 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-[#bfa76f] focus:outline-none focus:ring-1 focus:ring-[#bfa76f]"
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-300">
                    Email
                  </label>
                  <input
                    type="email"
                    value={p.email || ""}
                    onChange={(e) => updatePerson(idx, { email: e.target.value })}
                    className="w-full rounded-xl border border-neutral-800 bg-black/60 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-[#bfa76f] focus:outline-none focus:ring-1 focus:ring-[#bfa76f]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-300">
                    Role (optional)
                  </label>
                  <input
                    type="text"
                    value={p.role || ""}
                    onChange={(e) => updatePerson(idx, { role: e.target.value })}
                    className="w-full rounded-xl border border-neutral-800 bg-black/60 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-[#bfa76f] focus:outline-none focus:ring-1 focus:ring-[#bfa76f]"
                    placeholder="e.g. Compliance Officer"
                  />
                </div>
              </div>
            </section>
          ))
        )}

        <button
          type="button"
          onClick={addPerson}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-neutral-100 transition hover:bg-neutral-800"
        >
          Add authorised person
        </button>
      </div>
    </div>
  );
}
