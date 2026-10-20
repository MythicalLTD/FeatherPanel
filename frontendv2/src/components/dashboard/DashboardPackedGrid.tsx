/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

'use client';

import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { DashboardWidgetSize } from '@/hooks/useDashboardConfig';

export interface PackItem {
    id: string;
    size: DashboardWidgetSize;
    node: ReactNode;
}

/** Placement in grid units: columns, and rows of ROW_UNIT pixels. */
export interface PackPlacement {
    col: number;
    colSpan: number;
    row: number;
    rowSpan: number;
}

const ROW_UNIT = 4;
/** Bottom edges closer than this to the lowest card are stretched flush. */
const FLUSH_LIMIT_PX = 240;

const TABLET = '(min-width: 40rem)';
const WIDE = '(min-width: 64rem)';

function spanFor(size: DashboardWidgetSize, columns: number): number {
    if (size === 'full') return columns;
    if (size === 'medium') return columns === 3 ? 2 : columns;
    return 1;
}

const overlaps = (a: PackPlacement, b: PackPlacement) =>
    a.col < b.col + b.colSpan && b.col < a.col + a.colSpan && a.row < b.row + b.rowSpan && b.row < a.row + a.rowSpan;

const bottom = (p: PackPlacement) => p.row + p.rowSpan;

/** Is the block of rows [from, to) free in columns [col, col + span) apart from `skip`? */
function isFree(
    placed: Map<string, PackPlacement>,
    col: number,
    span: number,
    from: number,
    to: number,
    skip?: string,
) {
    if (to <= from) return true;
    const probe: PackPlacement = { col, colSpan: span, row: from, rowSpan: to - from };
    for (const [id, p] of placed) {
        if (id !== skip && overlaps(probe, p)) return false;
    }
    return true;
}

/**
 * Pack cards into `columns` columns with no holes:
 * - full width cards are barriers, so sections keep the order they were arranged in;
 * - inside a section each card takes the highest free spot that fits (first fit), so a short
 *   card fills the space beside a taller one;
 * - what is still empty afterwards is closed by stretching the card above or below it;
 * - a card left alone at the end widens into the free columns next to it, and bottoms that
 *   end close to the lowest card are stretched flush.
 *
 * Heights are in ROW_UNIT rows and already include the gap below each card.
 */
export function packLayout(
    items: { id: string; size: DashboardWidgetSize; rows: number }[],
    columns: number,
): Map<string, PackPlacement> {
    const placed = new Map<string, PackPlacement>();
    let floor = 0;
    let section: string[] = [];

    const maxBottom = () => {
        let max = floor;
        for (const p of placed.values()) max = Math.max(max, bottom(p));
        return max;
    };

    const closeHoles = (ids: string[], limit: number) => {
        // A few passes: stretching one card can make another hole closable.
        for (let pass = 0; pass < 4; pass++) {
            let changed = false;
            for (let col = 0; col < columns; col++) {
                const inColumn = ids
                    .map((id) => [id, placed.get(id)!] as const)
                    .filter(([, p]) => p.col <= col && col < p.col + p.colSpan)
                    .sort((a, b) => a[1].row - b[1].row);
                let cursor = floor;
                let above: (typeof inColumn)[number] | null = null;
                for (const entry of [...inColumn, null]) {
                    const holeEnd = entry ? entry[1].row : limit;
                    if (holeEnd > cursor) {
                        const [aboveId, abovePlacement] = above ?? [null, null];
                        if (
                            aboveId &&
                            abovePlacement &&
                            isFree(placed, abovePlacement.col, abovePlacement.colSpan, cursor, holeEnd, aboveId)
                        ) {
                            abovePlacement.rowSpan += holeEnd - cursor;
                            changed = true;
                        } else if (
                            entry &&
                            isFree(placed, entry[1].col, entry[1].colSpan, cursor, entry[1].row, entry[0])
                        ) {
                            entry[1].rowSpan += entry[1].row - cursor;
                            entry[1].row = cursor;
                            changed = true;
                        } else {
                            // A neighbour that sits entirely inside the hole widens into it.
                            const neighbour = ids.find((id) => {
                                const p = placed.get(id)!;
                                return (
                                    (p.col + p.colSpan === col || p.col === col + 1) &&
                                    p.row >= cursor &&
                                    bottom(p) <= holeEnd &&
                                    isFree(placed, col, 1, p.row, bottom(p))
                                );
                            });
                            if (neighbour) {
                                const p = placed.get(neighbour)!;
                                if (p.col > col) p.col = col;
                                p.colSpan += 1;
                                changed = true;
                            }
                        }
                    }
                    if (entry) {
                        cursor = Math.max(cursor, bottom(entry[1]));
                        above = entry;
                    }
                }
            }
            if (!changed) break;
        }
    };

    // Cards with free columns beside them all the way down to `limit` widen into them,
    // so an odd card left over at the end of a section takes the full row.
    const widen = (ids: string[], limit: number) => {
        for (const id of ids) {
            const p = placed.get(id)!;
            let left = p.col;
            while (left > 0 && isFree(placed, left - 1, 1, p.row, limit)) left--;
            let right = p.col + p.colSpan;
            while (right < columns && isFree(placed, right, 1, p.row, limit)) right++;
            p.col = left;
            p.colSpan = right - left;
        }
    };

    for (const item of items) {
        const span = spanFor(item.size, columns);
        if (span >= columns) {
            // Barrier: tidy the section above, then sit under everything.
            widen(section, maxBottom());
            closeHoles(section, maxBottom());
            const row = maxBottom();
            placed.set(item.id, { col: 0, colSpan: columns, row, rowSpan: item.rows });
            floor = row + item.rows;
            section = [];
            continue;
        }
        // Candidate rows: the floor and every bottom edge in this section.
        const rows = [floor, ...section.map((id) => bottom(placed.get(id)!))].sort((a, b) => a - b);
        let spot: PackPlacement | null = null;
        for (const row of rows) {
            for (let col = 0; col + span <= columns; col++) {
                if (isFree(placed, col, span, row, row + item.rows)) {
                    spot = { col, colSpan: span, row, rowSpan: item.rows };
                    break;
                }
            }
            if (spot) break;
        }
        placed.set(item.id, spot ?? { col: 0, colSpan: span, row: maxBottom(), rowSpan: item.rows });
        section.push(item.id);
    }

    if (section.length > 0) {
        widen(section, Number.MAX_SAFE_INTEGER);
        const end = maxBottom();
        closeHoles(section, floor);
        // Stretch bottoms that end a little above the lowest card; leave big differences alone.
        for (const id of section) {
            const p = placed.get(id)!;
            const short = end - bottom(p);
            // Cards that start on the same row as the lowest card always match its height.
            const sameRow = section.some((other) => {
                const o = placed.get(other)!;
                return other !== id && o.row === p.row && bottom(o) === end;
            });
            if (
                short > 0 &&
                (sameRow || short * ROW_UNIT <= FLUSH_LIMIT_PX) &&
                isFree(placed, p.col, p.colSpan, bottom(p), end, id)
            ) {
                p.rowSpan += short;
            }
        }
        // A column that is still much shorter shares the difference across its stack of
        // single column cards, so no card grows a lot on its own.
        for (let col = 0; col < columns; col++) {
            const stack = section
                .map((id) => placed.get(id)!)
                .filter((p) => p.col <= col && col < p.col + p.colSpan)
                .sort((a, b) => a.row - b.row);
            const last = stack[stack.length - 1];
            if (!last || bottom(last) >= end) continue;
            let first = stack.length - 1;
            while (first > 0 && stack[first - 1].colSpan === 1 && bottom(stack[first - 1]) === stack[first].row) {
                first--;
            }
            const movable = stack.slice(first).filter((p) => p.colSpan === 1);
            if (movable.length !== stack.length - first) continue;
            const short = end - bottom(last);
            const share = Math.floor(short / movable.length);
            if (share * ROW_UNIT > FLUSH_LIMIT_PX / 2) continue;
            let shift = 0;
            movable.forEach((p, index) => {
                const grow = index === movable.length - 1 ? short - share * index : share;
                p.row += shift;
                p.rowSpan += grow;
                shift += grow;
            });
        }
    }

    return placed;
}

function useColumns(): number {
    const read = () => {
        if (typeof window === 'undefined') return 1;
        if (window.matchMedia(WIDE).matches) return 3;
        if (window.matchMedia(TABLET).matches) return 2;
        return 1;
    };
    const [columns, setColumns] = useState(1);
    useLayoutEffect(() => {
        const update = () => setColumns(read());
        update();
        const wide = window.matchMedia(WIDE);
        const tablet = window.matchMedia(TABLET);
        wide.addEventListener('change', update);
        tablet.addEventListener('change', update);
        return () => {
            wide.removeEventListener('change', update);
            tablet.removeEventListener('change', update);
        };
    }, []);
    return columns;
}

/**
 * Dashboard cards packed into one, two or three columns (by screen width) without gaps.
 * Card heights are measured from their content, placed with packLayout, and the cards are
 * stretched into the space they were given. On phones it is a plain list in order.
 */
export function DashboardPackedGrid({
    items,
    compact,
    mirrored = false,
    className,
}: {
    items: PackItem[];
    compact: boolean;
    /** Mirror the columns (the "side column first" option). */
    mirrored?: boolean;
    className?: string;
}) {
    const columns = useColumns();
    const gridRef = useRef<HTMLDivElement>(null);
    const [placements, setPlacements] = useState<Map<string, PackPlacement> | null>(null);
    const gapPx = compact ? 12 : 20;
    const key = items.map((item) => `${item.id}:${item.size}`).join(',');

    const measure = useCallback(() => {
        const grid = gridRef.current;
        if (!grid || columns === 1) return;
        // Read natural heights: drop the stretch for one synchronous read.
        grid.classList.add('fp-pack-measuring');
        const rows: { id: string; size: DashboardWidgetSize; rows: number }[] = [];
        for (const item of items) {
            const cell = grid.querySelector<HTMLElement>(`[data-pack-id="${CSS.escape(item.id)}"] > .fp-pack-cell`);
            const height = cell ? cell.getBoundingClientRect().height : 0;
            if (height < 1) continue; // Renders nothing right now.
            rows.push({ id: item.id, size: item.size, rows: Math.ceil((height + gapPx) / ROW_UNIT) });
        }
        grid.classList.remove('fp-pack-measuring');
        const next = packLayout(rows, columns);
        setPlacements((prev) => {
            if (prev && prev.size === next.size) {
                let same = true;
                for (const [id, p] of next) {
                    const q = prev.get(id);
                    if (
                        !q ||
                        q.col !== p.col ||
                        q.colSpan !== p.colSpan ||
                        q.row !== p.row ||
                        q.rowSpan !== p.rowSpan
                    ) {
                        same = false;
                        break;
                    }
                }
                if (same) return prev;
            }
            return next;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, columns, gapPx]);

    useLayoutEffect(() => {
        const grid = gridRef.current;
        if (!grid || columns === 1 || typeof ResizeObserver === 'undefined') return;
        let frame = 0;
        const schedule = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(measure);
        };
        const observer = new ResizeObserver(schedule);
        // Observe each card and its direct children, so content shrinking inside a stretched card is noticed too.
        grid.querySelectorAll<HTMLElement>('.fp-pack-cell').forEach((cell) => {
            observer.observe(cell);
            for (const child of Array.from(cell.children)) {
                observer.observe(child);
                for (const inner of Array.from(child.children)) observer.observe(inner);
            }
        });
        observer.observe(grid);
        measure();
        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
        };
    }, [measure, columns, placements]);

    if (columns === 1) {
        return (
            <div className={cn('flex flex-col', compact ? 'gap-3' : 'gap-4', className)}>
                {items.map((item) => (
                    <div key={item.id} className='fp-collapse-empty-block min-w-0'>
                        {item.node}
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div
            ref={gridRef}
            className={cn('fp-pack-grid relative grid', className)}
            style={
                {
                    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                    gridAutoRows: `${ROW_UNIT}px`,
                    columnGap: gapPx,
                    rowGap: 0,
                } as CSSProperties
            }
        >
            {items.map((item) => {
                const p = placements?.get(item.id);
                const span = spanFor(item.size, columns);
                const col = p ? (mirrored ? columns - p.col - p.colSpan : p.col) : 0;
                const style: CSSProperties = p
                    ? {
                          gridColumn: `${col + 1} / span ${p.colSpan}`,
                          gridRow: `${p.row + 1} / span ${p.rowSpan}`,
                          paddingBottom: gapPx,
                      }
                    : // Not placed (first paint, or renders nothing): out of the flow but at its width, so it can be measured.
                      {
                          gridColumn: `1 / span ${span}`,
                          gridRow: '1 / span 1',
                          position: 'absolute',
                          insetInline: 0,
                          top: 0,
                          visibility: 'hidden',
                          pointerEvents: 'none',
                      };
                return (
                    <div key={item.id} data-pack-id={item.id} className='min-w-0' style={style}>
                        <div className='fp-pack-cell fp-collapse-empty-block'>{item.node}</div>
                    </div>
                );
            })}
        </div>
    );
}
