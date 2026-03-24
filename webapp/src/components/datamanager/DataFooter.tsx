interface DataFooterProps {
  shownCount: number;
  totalCount: number;
  annotationCount: number;
  predictionCount: number;
}

export function DataFooter({
  shownCount,
  totalCount,
  annotationCount,
  predictionCount,
}: DataFooterProps) {
  return (
    <div className="flex items-center gap-6 border-t border-border bg-muted/50 px-4 py-1.5 text-[11px] text-muted-foreground shrink-0">
      <span>
        Tasks: <span className="font-medium text-foreground">{shownCount}</span>{' '}
        / {totalCount}
      </span>
      <span>
        Submitted annotations:{' '}
        <span className="font-medium text-foreground">{annotationCount}</span>
      </span>
      <span>
        Predictions:{' '}
        <span className="font-medium text-foreground">{predictionCount}</span>
      </span>
    </div>
  );
}
