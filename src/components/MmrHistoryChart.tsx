import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  MmrSessionEntry,
  RANK_TIERS,
  getMmrHistoryStats,
} from '../engine/zeroSumRules';

interface MmrHistoryChartProps {
  history: MmrSessionEntry[];
}

export const MmrHistoryChart: React.FC<MmrHistoryChartProps> = ({ history }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [containerWidth, setContainerWidth] = useState<number>(820);
  const [isDark, setIsDark] = useState<boolean>(() =>
    typeof document !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : false
  );
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const sessions = useMemo(() => history.slice(-10), [history]);
  const stats = useMemo(() => getMmrHistoryStats(sessions), [sessions]);

  const activeEntry = useMemo(() => {
    if (sessions.length === 0) return null;
    if (selectedIndex !== null && sessions[selectedIndex]) {
      return sessions[selectedIndex];
    }
    return sessions[sessions.length - 1];
  }, [sessions, selectedIndex]);

  // Track responsive container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = () => {
      const next = Math.floor(el.getBoundingClientRect().width);
      if (next > 160) setContainerWidth(next);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Track LightMode / DarkMode changes on <html>
  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => setIsDark(root.classList.contains('dark'));
    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Render D3.js SVG visualization
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || sessions.length === 0) return;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const height = 244;
    const margin = { top: 20, right: 24, bottom: 34, left: 52 };
    const width = Math.max(320, containerWidth);
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', width).attr('height', height);

    const palette = isDark
      ? {
          line: '#F4F4F5',
          areaTop: 'rgba(244, 244, 245, 0.14)',
          areaBottom: 'rgba(244, 244, 245, 0.0)',
          grid: '#27272A',
          axisText: '#A1A1AA',
          threshold: '#52525B',
          thresholdText: '#A1A1AA',
          nodeStroke: '#121215',
          activeRing: '#F4F4F5',
          win: '#22C55E',
          loss: '#EF4444',
        }
      : {
          line: '#111111',
          areaTop: 'rgba(17, 17, 17, 0.10)',
          areaBottom: 'rgba(17, 17, 17, 0.0)',
          grid: '#E4E4E7',
          axisText: '#52525B',
          threshold: '#A1A1AA',
          thresholdText: '#52525B',
          nodeStroke: '#FFFFFF',
          activeRing: '#111111',
          win: '#16A34A',
          loss: '#DC2626',
        };

    // Gradient for subtle architectural area fill
    const defs = svg.append('defs');
    const gradId = 'mmr-area-gradient';
    const grad = defs
      .append('linearGradient')
      .attr('id', gradId)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    grad.append('stop').attr('offset', '0%').attr('stop-color', palette.areaTop);
    grad.append('stop').attr('offset', '100%').attr('stop-color', palette.areaBottom);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3
      .scalePoint<string>()
      .domain(sessions.map((s) => s.label))
      .range([0, innerWidth])
      .padding(0.25);

    const mmrValues = sessions.map((s) => s.mmr);
    const minVal = Math.min(...mmrValues);
    const maxVal = Math.max(...mmrValues);
    const span = Math.max(40, maxVal - minVal);
    const domainMin = Math.floor((minVal - span * 0.25) / 10) * 10;
    const domainMax = Math.ceil((maxVal + span * 0.28) / 10) * 10;

    const yScale = d3
      .scaleLinear()
      .domain([domainMin, domainMax])
      .range([innerHeight, 0])
      .nice(5);

    // Horizontal gridlines
    const gridAxis = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickSize(-innerWidth)
      .tickFormat(() => '');

    g.append('g')
      .attr('class', 'mmr-grid')
      .call(gridAxis)
      .call((sel) => sel.select('.domain').remove())
      .call((sel) =>
        sel.selectAll('line').attr('stroke', palette.grid).attr('stroke-width', 1)
      );

    // Visible rank threshold reference lines
    const visibleThresholds = RANK_TIERS.filter(
      (tier) =>
        tier.minMMR > yScale.domain()[0] + 6 &&
        tier.minMMR < yScale.domain()[1] - 6
    );

    visibleThresholds.forEach((tier) => {
      const yPos = yScale(tier.minMMR);
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', yPos)
        .attr('y2', yPos)
        .attr('stroke', palette.threshold)
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4 4');

      g.append('text')
        .attr('x', innerWidth - 4)
        .attr('y', yPos - 5)
        .attr('text-anchor', 'end')
        .attr('fill', palette.thresholdText)
        .attr('font-family', 'JetBrains Mono, monospace')
        .attr('font-size', '10px')
        .text(`${tier.name} · ${tier.minMMR}`);
    });

    // Area generator
    const areaGen = d3
      .area<MmrSessionEntry>()
      .x((d) => xScale(d.label) ?? 0)
      .y0(innerHeight)
      .y1((d) => yScale(d.mmr))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(sessions)
      .attr('fill', `url(#${gradId})`)
      .attr('d', areaGen);

    // Line generator
    const lineGen = d3
      .line<MmrSessionEntry>()
      .x((d) => xScale(d.label) ?? 0)
      .y((d) => yScale(d.mmr))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(sessions)
      .attr('fill', 'none')
      .attr('stroke', palette.line)
      .attr('stroke-width', 2)
      .attr('d', lineGen);

    // Axes
    const xAxis = d3.axisBottom(xScale).tickSize(0).tickPadding(10);
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .call((sel) => sel.select('.domain').attr('stroke', palette.grid))
      .call((sel) =>
        sel
          .selectAll('text')
          .attr('fill', palette.axisText)
          .attr('font-family', 'JetBrains Mono, monospace')
          .attr('font-size', '11px')
      );

    const yAxis = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickSize(0)
      .tickPadding(10)
      .tickFormat((v) => `${Math.round(Number(v))}`);

    g.append('g')
      .call(yAxis)
      .call((sel) => sel.select('.domain').remove())
      .call((sel) =>
        sel
          .selectAll('text')
          .attr('fill', palette.axisText)
          .attr('font-family', 'JetBrains Mono, monospace')
          .attr('font-size', '11px')
      );

    // Highlight vertical guide for active node
    const activeIdx =
      selectedIndex !== null && sessions[selectedIndex]
        ? selectedIndex
        : sessions.length - 1;
    const activeDatum = sessions[activeIdx];
    const activeX = xScale(activeDatum.label) ?? 0;
    const activeY = yScale(activeDatum.mmr);

    g.append('line')
      .attr('x1', activeX)
      .attr('x2', activeX)
      .attr('y1', activeY)
      .attr('y2', innerHeight)
      .attr('stroke', palette.threshold)
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2 3');

    // Data nodes
    const nodes = g
      .selectAll<SVGGElement, MmrSessionEntry>('g.mmr-node')
      .data(sessions)
      .enter()
      .append('g')
      .attr('class', 'mmr-node')
      .attr('transform', (d) => `translate(${xScale(d.label) ?? 0},${yScale(d.mmr)})`);

    // Active outer ring
    nodes
      .filter((_d, i) => i === activeIdx)
      .append('circle')
      .attr('r', 8.5)
      .attr('fill', 'none')
      .attr('stroke', palette.activeRing)
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.65);

    // Visible node circle
    nodes
      .append('circle')
      .attr('r', (_d, i) => (i === activeIdx ? 5 : 4))
      .attr('fill', (d) => (d.result === 'win' ? palette.win : palette.loss))
      .attr('stroke', palette.nodeStroke)
      .attr('stroke-width', 1.75);

    // Generous hit area for hover / click
    nodes
      .append('circle')
      .attr('r', 16)
      .attr('fill', 'transparent')
      .style('cursor', 'pointer')
      .on('mouseenter', (_event, d) => {
        const idx = sessions.indexOf(d);
        if (idx >= 0) setSelectedIndex(idx);
      })
      .on('click', (_event, d) => {
        const idx = sessions.indexOf(d);
        if (idx >= 0) setSelectedIndex(idx);
      });
  }, [sessions, containerWidth, isDark, selectedIndex]);

  if (sessions.length === 0) {
    return (
      <section
        data-testid="mmr-history-chart"
        className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6"
      >
        <h3 className="text-base font-semibold text-neutral-950 dark:text-neutral-50">
          Évolution historique du MMR (10 dernières sessions)
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Jouez un premier match pour tracer votre courbe Zero Sum ELO.
        </p>
      </section>
    );
  }

  return (
    <section
      data-testid="mmr-history-chart"
      className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 space-y-4"
    >
      {/* Header & Summary Telemetry */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight text-neutral-950 dark:text-neutral-50">
            Évolution historique du MMR ({sessions.length} dernières sessions)
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Courbe Zero Sum ELO générée avec D3.js · Survolez ou cliquez un point pour inspecter une session.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums shrink-0">
          <span
            className={
              stats.netDelta >= 0
                ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'text-red-600 dark:text-red-400 font-semibold'
            }
          >
            {stats.netDelta >= 0 ? '+' : ''}
            {stats.netDelta.toFixed(1)} MMR
          </span>
          <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">
            ·
          </span>
          <span className="text-neutral-700 dark:text-neutral-300">
            Pic {Math.round(stats.peakMMR)}
          </span>
          <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">
            ·
          </span>
          <span className="text-neutral-700 dark:text-neutral-300">
            Victoires {stats.winRatePct}%
          </span>
        </div>
      </div>

      {/* D3.js SVG Viewport */}
      <div ref={containerRef} className="w-full overflow-hidden">
        <svg
          ref={svgRef}
          data-testid="mmr-history-svg"
          role="img"
          aria-label={`Graphique D3.js de l'évolution du MMR sur les ${sessions.length} dernières sessions`}
          className="block w-full h-auto"
        />
      </div>

      {/* Selected Session Inspector + Keyboard Session Switcher */}
      {activeEntry && (
        <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 font-mono tabular-nums text-neutral-700 dark:text-neutral-300">
            <span className="font-semibold text-neutral-950 dark:text-neutral-50">
              Session {activeEntry.label}
            </span>
            <span aria-hidden="true">·</span>
            <span>{activeEntry.mode}</span>
            <span aria-hidden="true">·</span>
            <span
              className={
                activeEntry.result === 'win'
                  ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                  : 'text-red-600 dark:text-red-400 font-medium'
              }
            >
              {activeEntry.result === 'win' ? 'Victoire' : 'Défaite'}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {activeEntry.mmr.toFixed(1)} MMR ({activeEntry.rankName})
            </span>
            <span aria-hidden="true">·</span>
            <span
              className={
                activeEntry.delta >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }
            >
              {activeEntry.delta >= 0 ? '+' : ''}
              {activeEntry.delta.toFixed(1)}
            </span>
          </div>

          <div className="flex items-center gap-1" role="group" aria-label="Sélectionner une session MMR">
            {sessions.map((s, idx) => {
              const isSelected =
                (selectedIndex === null && idx === sessions.length - 1) ||
                selectedIndex === idx;
              return (
                <button
                  key={s.sessionIndex}
                  type="button"
                  onClick={() => setSelectedIndex(idx)}
                  aria-label={`Inspecter la session ${s.label} (${s.mmr} MMR)`}
                  className={`px-1.5 py-0.5 text-[11px] font-mono tabular-nums border cursor-pointer ${
                    isSelected
                      ? 'border-neutral-950 bg-neutral-950 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-950'
                      : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-600'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
