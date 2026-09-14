export default function ChangeBadge({ type }: { type: "ADDED" | "REMOVED" }) {
  return type === "ADDED" ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-added bg-added-muted px-2 py-0.5 rounded">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      Added
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-removed bg-removed-muted px-2 py-0.5 rounded">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
      </svg>
      Removed
    </span>
  );
}
