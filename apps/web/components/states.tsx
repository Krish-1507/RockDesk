export function EmptyState({ title, body }: { title: string; body: string }): React.JSX.Element {
  return (
    <div className="rounded-[14px] border border-dashed border-[#BDB7AC] bg-[#FBFAF7] px-6 py-12 text-center">
      <p className="text-[15px] font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-[13px] leading-[20px] text-[#77736A]">{body}</p>
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }): React.JSX.Element {
  return (
    <div className="overflow-hidden rounded-[14px] border border-[#D8D3C9] bg-[#FBFAF7]" aria-label="Loading tickets">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-[#D8D3C9] px-5 py-4 last:border-0">
          <div className="h-3.5 w-12 animate-pulse rounded bg-[#EFECE5]" />
          <div className="h-3.5 flex-1 animate-pulse rounded bg-[#EFECE5]" />
          <div className="hidden h-3.5 w-24 animate-pulse rounded bg-[#EFECE5] sm:block" />
          <div className="h-3.5 w-16 animate-pulse rounded bg-[#EFECE5]" />
        </div>
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }): React.JSX.Element {
  return (
    <div className="rounded-[14px] border border-[#E5B3AC] bg-[#FDF1EE] px-6 py-8 text-center">
      <p className="text-[15px] font-semibold text-[#B83C34]">Something went wrong</p>
      <p className="mx-auto mt-1 max-w-sm text-[13px] text-[#4E4C46]">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-[10px] bg-[#151512] px-4 py-2 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-85"
        >
          Try again
        </button>
      )}
    </div>
  );
}
