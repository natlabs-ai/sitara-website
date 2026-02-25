"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { deleteApplication } from "@/lib/koraClient";

const GOLD = "#bfa76f";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-neutral-800 text-neutral-300",
    submitted: "bg-blue-900/30 text-blue-300 border-blue-800/40",
    under_review: "bg-amber-900/30 text-amber-300 border-amber-800/40",
    approved: "bg-emerald-900/30 text-emerald-300 border-emerald-800/40",
    rejected: "bg-red-900/30 text-red-300 border-red-800/40",
  };

  const style = styles[status] || styles.draft;
  const label = status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${style}`}
    >
      {label}
    </span>
  );
}

function AccountTypeBadge({ type }: { type: string }) {
  const isIndividual = type === "individual";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isIndividual
          ? "bg-purple-900/30 text-purple-300 border border-purple-800/40"
          : "bg-cyan-900/30 text-cyan-300 border border-cyan-800/40"
      }`}
    >
      {isIndividual ? "Personal" : "Business"}
    </span>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout, refreshUser } = useAuth();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/onboard?mode=login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-neutral-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  const handleDelete = async (applicationId: string, externalRef: string) => {
    if (!confirm(`Are you sure you want to delete application ${externalRef}? This cannot be undone.`)) {
      return;
    }

    try {
      setDeletingId(applicationId);
      await deleteApplication(applicationId);
      await refreshUser();
    } catch (error: any) {
      console.error("Delete error:", error);
      alert(error?.message || "Failed to delete application");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-950">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/"
                className="text-xl tracking-[0.35em] text-amber-400 font-medium"
              >
                SITARA
              </Link>
              <p className="text-sm text-neutral-400 mt-0.5">
                Welcome back, {user.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-neutral-100 transition hover:bg-neutral-800"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Applications Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-neutral-100">
              Your Applications
            </h2>
            <p className="text-sm text-neutral-400 mt-1">
              Manage your onboarding applications
            </p>
          </div>
          {user.applications.length === 0 && (
            <Link
              href="/onboard"
              style={{ backgroundColor: GOLD }}
              className="rounded-lg px-4 py-2 text-sm font-medium text-black transition hover:opacity-90"
            >
              Start New Application
            </Link>
          )}
        </div>

        {/* Applications List */}
        {user.applications.length === 0 ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-12 text-center">
            <div className="mx-auto max-w-md">
              <h3 className="text-lg font-semibold text-neutral-100 mb-2">
                No Applications Yet
              </h3>
              <p className="text-sm text-neutral-400 mb-6">
                Start your journey with Sitara Gold by creating your first
                application.
              </p>
              <Link
                href="/onboard"
                style={{ backgroundColor: GOLD }}
                className="inline-flex rounded-lg px-6 py-2.5 text-sm font-medium text-black transition hover:opacity-90"
              >
                Create Application
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {user.applications.map((app) => (
              <div
                key={app.id}
                className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Application Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-neutral-100">
                        {app.external_reference || `Application ${app.id.slice(0, 8)}`}
                      </h3>
                      <StatusBadge status={app.status} />
                      <AccountTypeBadge type={app.account_type} />
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-neutral-500">Created:</span>
                        <span className="ml-2 text-neutral-300">
                          {new Date(app.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-500">Last Updated:</span>
                        <span className="ml-2 text-neutral-300">
                          {new Date(app.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {app.status === "draft" ? (
                      <>
                        <Link
                          href={`/onboard?resume=${app.id}`}
                          style={{ backgroundColor: GOLD }}
                          className="rounded-lg px-4 py-2 text-sm font-medium text-black transition hover:opacity-90"
                        >
                          Continue Application
                        </Link>
                        <button
                          onClick={() => handleDelete(app.id, app.external_reference || app.id.slice(0, 8))}
                          disabled={deletingId === app.id}
                          className="rounded-lg border border-red-700 bg-red-900/20 px-4 py-2 text-sm text-red-300 transition hover:bg-red-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingId === app.id ? "Deleting..." : "Delete"}
                        </button>
                      </>
                    ) : (
                      <Link
                        href={`/onboard?view=${app.id}`}
                        className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-neutral-100 transition hover:bg-neutral-800"
                      >
                        View
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Help Section */}
        <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
          <h3 className="text-sm font-semibold text-neutral-100 mb-2">
            Need Help?
          </h3>
          <p className="text-sm text-neutral-400 mb-4">
            If you have any questions about your application status or need
            assistance, please contact our support team.
          </p>
          <div className="flex gap-4">
            <Link
              href="/"
              className="text-sm hover:underline"
              style={{ color: GOLD }}
            >
              Visit Homepage
            </Link>
            <span className="text-neutral-700">|</span>
            <a
              href="mailto:support@sitaragold.com"
              className="text-sm hover:underline"
              style={{ color: GOLD }}
            >
              Contact Support
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
