"use client";

type Status = "draft" | "submitted" | "under_review" | "info_requested" | "approved" | "rejected";

type Props = {
  status: Status;
  appId: string;
  rejectionReason?: string | null;
  onContinue: (appId: string) => void;
  onStartNew: () => void;
};

const STATUS_CONFIG: Record<Status, { title: string; message: string; borderCls: string; iconPath: string; iconColor: string }> = {
  draft: {
    title: "Application in progress",
    message: "You have an unfinished application. Pick up where you left off.",
    borderCls: "border-[#bfa76f]/40 bg-[#bfa76f]/10",
    iconColor: "text-[#bfa76f]",
    iconPath: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125",
  },
  submitted: {
    title: "Application submitted",
    message: "Your application has been submitted and is awaiting review.",
    borderCls: "border-amber-500/40 bg-amber-900/15",
    iconColor: "text-amber-400",
    iconPath: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  under_review: {
    title: "Under review",
    message: "Your application is currently being reviewed. We'll be in touch if anything is needed.",
    borderCls: "border-amber-500/40 bg-amber-900/15",
    iconColor: "text-amber-400",
    iconPath: "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  },
  info_requested: {
    title: "Additional information requested",
    message: "Please contact the Sitara team for further guidance on what is needed.",
    borderCls: "border-orange-500/40 bg-orange-900/15",
    iconColor: "text-orange-400",
    iconPath: "M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z",
  },
  approved: {
    title: "Application approved",
    message: "Your application has been approved. Welcome aboard.",
    borderCls: "border-emerald-500/40 bg-emerald-900/15",
    iconColor: "text-emerald-400",
    iconPath: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  rejected: {
    title: "Application not approved",
    message: "Unfortunately your application was not approved.",
    borderCls: "border-red-500/40 bg-red-900/15",
    iconColor: "text-red-400",
    iconPath: "M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
};

export default function ApplicationStatus({ status, appId, rejectionReason, onContinue, onStartNew }: Props) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.submitted;

  return (
    <div>
      <h2 className="text-lg font-semibold text-neutral-100 mb-1">Your application</h2>
      <p className="text-sm text-neutral-400 mb-6">Here is the current status of your Sitara application.</p>

      <div className={`rounded-xl border px-5 py-4 flex gap-4 items-start mb-6 ${cfg.borderCls}`}>
        <div className="shrink-0 mt-0.5">
          <svg className={`h-6 w-6 ${cfg.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d={cfg.iconPath} />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-neutral-100">{cfg.title}</p>
          <p className="text-sm text-neutral-300 mt-0.5">{cfg.message}</p>
          {status === "rejected" && rejectionReason && (
            <p className="text-xs text-neutral-500 mt-2 italic">&ldquo;{rejectionReason}&rdquo;</p>
          )}
        </div>
      </div>

      {status === "draft" && (
        <button onClick={() => onContinue(appId)}
          className="w-full rounded-xl border border-[#bfa76f] bg-[#bfa76f]/10 px-4 py-2.5 text-sm font-medium text-[#bfa76f] hover:bg-[#bfa76f]/20 transition-colors">
          Continue application →
        </button>
      )}

      {status === "rejected" && (
        <p className="text-xs text-center text-neutral-500 mb-3">
          Please contact <span className="font-medium text-neutral-300">Sitara</span> for further assistance.
        </p>
      )}

      <button onClick={onStartNew}
        className="mt-3 w-full rounded-xl border border-neutral-800 px-4 py-2.5 text-sm font-medium text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200 transition-colors">
        Start a new application
      </button>
    </div>
  );
}
