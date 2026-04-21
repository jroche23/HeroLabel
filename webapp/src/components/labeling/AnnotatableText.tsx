import { useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { SpanAnnotation, NerLabelState } from '@/types';

interface AnnotatableTextProps {
  textName: string;
  text: string;
  spans: SpanAnnotation[];
  activeLabel: NerLabelState | null;
  onAddSpan: (span: Omit<SpanAnnotation, 'id'>) => void;
  onRemoveSpan: (id: string) => void;
}

export function AnnotatableText({
  textName,
  text,
  spans,
  activeLabel,
  onAddSpan,
  onRemoveSpan,
}: AnnotatableTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseUp = useCallback(() => {
    if (!activeLabel) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    if (!containerRef.current?.contains(range.commonAncestorContainer)) return;

    /** Walk up from node to find nearest element with data-start attribute */
    const getOffset = (node: Node, nodeOffset: number): number | null => {
      let el: Node | null =
        node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
      while (el && el !== containerRef.current) {
        if (el instanceof HTMLElement && el.hasAttribute('data-start')) {
          return parseInt(el.getAttribute('data-start')!, 10) + nodeOffset;
        }
        el = el.parentNode;
      }
      return null;
    };

    const start = getOffset(range.startContainer, range.startOffset);
    const end = getOffset(range.endContainer, range.endOffset);

    if (start === null || end === null || start >= end) return;

    const selectedText = text.slice(start, end);
    if (!selectedText.trim()) return;

    onAddSpan({
      textName,
      start,
      end,
      text: selectedText,
      label: activeLabel.value,
      color: activeLabel.color,
    });
    selection.removeAllRanges();
  }, [activeLabel, text, textName, onAddSpan]);

  // Only show spans for this text element, sorted by position
  const mySpans = spans
    .filter((s) => s.textName === textName)
    .sort((a, b) => a.start - b.start);

  // Build interleaved plain-text + annotated-span segments
  type Seg =
    | { kind: 'plain'; text: string; start: number }
    | { kind: 'span'; span: SpanAnnotation };

  const segments: Seg[] = [];
  let pos = 0;

  for (const span of mySpans) {
    if (span.start > pos) {
      segments.push({ kind: 'plain', text: text.slice(pos, span.start), start: pos });
    }
    segments.push({ kind: 'span', span });
    pos = span.end;
  }
  if (pos < text.length) {
    segments.push({ kind: 'plain', text: text.slice(pos), start: pos });
  }
  if (segments.length === 0) {
    segments.push({ kind: 'plain', text, start: 0 });
  }

  return (
    <div
      ref={containerRef}
      onMouseUp={handleMouseUp}
      className={cn(
        'text-sm leading-7 select-text rounded-md border bg-card p-3 transition-colors',
        activeLabel
          ? 'border-primary/60 ring-1 ring-primary/30 cursor-crosshair'
          : 'border-border cursor-text',
      )}
    >
      {segments.map((seg, i) => {
        if (seg.kind === 'plain') {
          return (
            <span key={i} data-start={seg.start}>
              {seg.text}
            </span>
          );
        }
        const { span } = seg;
        const col = span.color ?? '#6366f1';
        return (
          <mark
            key={span.id}
            onClick={() => onRemoveSpan(span.id)}
            title={`${span.label} — click to remove`}
            style={{
              background: `${col}22`,
              borderBottom: `2px solid ${col}`,
              borderRadius: '2px',
              padding: '0 1px',
              cursor: 'pointer',
            }}
          >
            <span data-start={span.start}>{span.text}</span>
            <sup
              style={{
                fontSize: '8px',
                color: col,
                marginLeft: '2px',
                fontWeight: 600,
              }}
            >
              {span.label}
            </sup>
          </mark>
        );
      })}
      {text.length === 0 && (
        <span className="text-muted-foreground italic">No text available</span>
      )}
    </div>
  );
}
