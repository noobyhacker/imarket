export default function ItemCardSkeleton() {
  return (
    <div className="flex w-full gap-3.5 border-b border-border px-4 py-3.5 animate-pulse">
      <div className="h-28 w-28 flex-shrink-0 rounded-xl bg-muted" />
      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div className="space-y-2">
          <div className="h-4 w-3/4 rounded bg-muted" />
          <div className="h-3 w-1/2 rounded bg-muted" />
        </div>
        <div className="space-y-1.5">
          <div className="h-5 w-24 rounded bg-muted" />
          <div className="h-4 w-12 rounded-full bg-muted" />
        </div>
      </div>
    </div>
  );
}
