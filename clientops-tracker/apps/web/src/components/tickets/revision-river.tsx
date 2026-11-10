'use client';
import { useEffect, useRef, type KeyboardEvent } from 'react';
import { Check, FileText } from 'lucide-react';
import { formatDate, titleCase } from '../../lib/format';
import type { ScopeProposal } from '../../lib/types';

interface RevisionRiverProps {
  proposals: ScopeProposal[];
  originalDate?: string;
  selected: number;
  onSelect: (revision: number, replace?: boolean) => void;
}
export function RevisionRiver({ proposals, originalDate, selected, onSelect }: RevisionRiverProps) {
  const buttons = useRef(new Map<number, HTMLButtonElement>());
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const viewport = scroll.current;
    const button = buttons.current.get(selected);
    if (!viewport || !button) return;
    const center = () => {
      const bounds = button.getBoundingClientRect();
      viewport.scrollLeft +=
        bounds.left -
        viewport.getBoundingClientRect().left -
        (viewport.clientWidth - bounds.width) / 2;
    };
    center();
    const observer = new ResizeObserver(center);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [selected]);
  const current = proposals[0]?.revision;
  const nodes = [
    ...(originalDate
      ? [
          {
            revision: 0,
            title: 'Original request',
            date: originalDate,
            author: '',
            approved: false,
          },
        ]
      : []),
    ...[...proposals].reverse().map((p) => ({
      revision: p.revision,
      title: titleCase(p.state),
      date: p.createdAt,
      author: p.proposedBy,
      approved: p.state === 'APPROVED',
    })),
  ];
  function move(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const target =
      event.key === 'ArrowRight'
        ? Math.min(index + 1, nodes.length - 1)
        : event.key === 'ArrowLeft'
          ? Math.max(index - 1, 0)
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? nodes.length - 1
              : null;
    if (target === null) return;
    event.preventDefault();
    const node = nodes[target];
    if (!node) return;
    onSelect(node.revision);
    buttons.current.get(node.revision)?.focus();
  }
  return (
    <section className="meridian-river" aria-labelledby="river-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="river-heading" className="text-base font-semibold">
          Revision River
        </h3>
        <span className="meridian-meta text-muted">{nodes.length} recorded versions</span>
      </div>
      <div className="river-scroll" ref={scroll}>
        <ol className="river-track" aria-label="Scope revision history">
          {nodes.map((node, index) => (
            <li key={node.revision}>
              <button
                type="button"
                className="river-node"
                ref={(element) => {
                  if (element) buttons.current.set(node.revision, element);
                  else buttons.current.delete(node.revision);
                }}
                tabIndex={node.revision === selected ? 0 : -1}
                aria-pressed={node.revision === selected}
                aria-current={node.revision === current ? 'step' : undefined}
                aria-label={
                  node.revision === 0
                    ? 'Original request'
                    : `Revision ${node.revision}: ${node.title}`
                }
                title={`${node.author ? `${node.author} - ` : ''}${formatDate(node.date)}`}
                onClick={() => onSelect(node.revision)}
                onKeyDown={(event) => move(event, index)}
              >
                <span className="river-marker" aria-hidden="true">
                  {node.approved ? <Check size={14} /> : <FileText size={13} />}
                </span>
                <span className="font-medium">
                  {node.revision === 0 ? node.title : `Revision ${node.revision}`}
                </span>
                <span className="text-xs text-muted">
                  {node.revision === 0 ? 'Request received' : node.title}
                </span>
                <span className="meridian-meta text-muted">{formatDate(node.date)}</span>
                {node.revision === current ? <span className="river-current">Current</span> : null}
              </button>
            </li>
          ))}
        </ol>
      </div>
      {nodes.length > 1 ? (
        <label className="river-scrubber">
          <span className="sr-only">Scrub scope revisions</span>
          <input
            type="range"
            min={0}
            max={nodes.length - 1}
            step={1}
            value={Math.max(
              0,
              nodes.findIndex((node) => node.revision === selected),
            )}
            aria-valuetext={selected === 0 ? 'Original request' : `Revision ${selected}`}
            onChange={(event) => {
              const node = nodes[Number(event.target.value)];
              if (node) onSelect(node.revision, true);
            }}
          />
        </label>
      ) : null}
    </section>
  );
}
