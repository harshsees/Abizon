"use client";

/**
 * Processing-time and approval-rating charts.
 *
 * Split out of `VisaInfoAndPlans` with all of its state. Markup and data are
 * unchanged.
 *
 * IMPORTANT: both series are hardcoded illustrations — a fixed week in July,
 * identical for all 154 destinations, with no source behind them. They predate
 * this phase and are preserved rather than rewritten, but they are the clearest
 * candidate on the page for either real telemetry or removal.
 */

import { useState } from "react";

const statsProcessingData = [
  { day: "Thu", date: "Thursday, 9 July", valueText: "3 Days 20 Hrs", valueHrs: 92 },
  { day: "Fri", date: "Friday, 10 July", valueText: "3 Days 13 Hrs", valueHrs: 85 },
  { day: "Sat", date: "Saturday, 11 July", valueText: "4 Days 10 Hrs", valueHrs: 106.7 },
  { day: "Sun", date: "Sunday, 12 July", valueText: "4 Days 6 Hrs", valueHrs: 102 },
  { day: "Mon", date: "Monday, 13 July", valueText: "3 Days 16 Hrs", valueHrs: 88 },
  { day: "Tue", date: "Tuesday, 14 July", valueText: "3 Days 19 Hrs", valueHrs: 91 },
  { day: "Wed", date: "Wednesday, 15 July", valueText: "4 Days 9 Hrs", valueHrs: 105 },
];

const statsApprovalData = [
  { day: "Thu", date: "Thursday, 9 July", valueText: "96.0% Approval Rate", valueHrs: 96 },
  { day: "Fri", date: "Friday, 10 July", valueText: "95.0% Approval Rate", valueHrs: 95 },
  { day: "Sat", date: "Saturday, 11 July", valueText: "98.0% Approval Rate", valueHrs: 98 },
  { day: "Sun", date: "Sunday, 12 July", valueText: "97.5% Approval Rate", valueHrs: 97.5 },
  { day: "Mon", date: "Monday, 13 July", valueText: "94.0% Approval Rate", valueHrs: 94 },
  { day: "Tue", date: "Tuesday, 14 July", valueText: "96.5% Approval Rate", valueHrs: 96.5 },
  { day: "Wed", date: "Wednesday, 15 July", valueText: "99.0% Approval Rate", valueHrs: 99 },
];

export function VisaStatistics() {
  const [statsTab, setStatsTab] = useState<"processingTime" | "approvalRating">("processingTime");
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [tooltipState, setTooltipState] = useState<{ x: number; y: number; show: boolean }>({ x: 0, y: 0, show: false });
  const [hasHoveredChart, setHasHoveredChart] = useState(false);

  return (
      <div className="pt-8 border-t border-border/50 space-y-6 font-sans">
        <div className="relative inline-block">
          <h2 id="statistics-section" className="text-2xl font-bold text-foreground tracking-tight scroll-mt-28">
            Statistics on
          </h2>
          <div className="absolute left-0 bottom-0 h-0.5 w-12 bg-primary" />
        </div>

        <div className="w-full bg-surface border border-border/60 rounded-3xl overflow-hidden shadow-sm">
          {/* Tab Headers */}
          <div className="flex border-b border-border px-6">
            <button
              onClick={() => {
                setStatsTab("processingTime");
                setHoveredPointIndex(null);
                setHasHoveredChart(false);
              }}
              className={`py-4 text-xs font-bold tracking-wider relative transition-colors duration-200 cursor-pointer mr-8 ${
                statsTab === "processingTime" ? "text-primary" : "text-muted-foreground hover:text-slate-800"
              }`}
            >
              VISA PROCESSING TIME
              {statsTab === "processingTime" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.75 bg-primary" />
              )}
            </button>
            <button
              onClick={() => {
                setStatsTab("approvalRating");
                setHoveredPointIndex(null);
                setHasHoveredChart(false);
              }}
              className={`py-4 text-xs font-bold tracking-wider relative transition-colors duration-200 cursor-pointer ${
                statsTab === "approvalRating" ? "text-primary" : "text-muted-foreground hover:text-slate-800"
              }`}
            >
              APPROVAL RATING
              {statsTab === "approvalRating" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.75 bg-primary" />
              )}
            </button>
          </div>

          {/* Inner Panels */}
          <div className="grid grid-cols-1 md:grid-cols-12">
            {/* Left Panel */}
            <div className="md:col-span-4 bg-surface-sunken/50 p-6 md:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-border min-h-[220px]">
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-slate-800">What is this?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {statsTab === "processingTime"
                    ? "This shows the average time a visa decision took to be delivered on"
                    : "This shows the average approval rating for visa applications delivered on"}
                </p>
              </div>

              <div>
                <p className="text-sm font-bold text-slate-700">
                  {hoveredPointIndex !== null
                    ? (statsTab === "processingTime" ? statsProcessingData[hoveredPointIndex].date : statsApprovalData[hoveredPointIndex].date)
                    : "Monday, 20 July"}
                </p>
                <div className="h-px bg-border/60 w-8 my-2" />
                <p className="text-xl font-extrabold text-primary">
                  {hoveredPointIndex !== null
                    ? (statsTab === "processingTime" ? statsProcessingData[hoveredPointIndex].valueText : statsApprovalData[hoveredPointIndex].valueText)
                    : (statsTab === "processingTime" ? "4 Days 1 Hr" : "98.5% Approval Rate")}
                </p>
              </div>
            </div>

            {/* Right Chart Area */}
            <div className="md:col-span-8 p-6 md:p-8 relative flex flex-col justify-between">
              {/* Chart Grid Lines & SVG Graph */}
              <div className="relative h-[200px] w-full select-none">
                {/* Horizontal grid lines with labels on the right */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] font-bold text-muted-foreground/80">
                  {statsTab === "processingTime" ? (
                    <>
                      <div className="w-full flex items-center justify-between border-b border-dashed border-border pb-1">
                        <span />
                        <span className="pr-1 shrink-0">120 hr</span>
                      </div>
                      <div className="w-full flex items-center justify-between border-b border-dashed border-border pb-1">
                        <span />
                        <span className="pr-1 shrink-0">90 hr</span>
                      </div>
                      <div className="w-full flex items-center justify-between border-b border-dashed border-border pb-1">
                        <span />
                        <span className="pr-1 shrink-0">60 hr</span>
                      </div>
                      <div className="w-full flex items-center justify-between border-b border-dashed border-border pb-1">
                        <span />
                        <span className="pr-1 shrink-0">30 hr</span>
                      </div>
                      <div className="w-full flex items-center justify-between pt-1">
                        <span />
                        <span className="pr-1 shrink-0">0 hr</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-full flex items-center justify-between border-b border-dashed border-border pb-1">
                        <span />
                        <span className="pr-1 shrink-0">100%</span>
                      </div>
                      <div className="w-full flex items-center justify-between border-b border-dashed border-border pb-1">
                        <span />
                        <span className="pr-1 shrink-0">97.5%</span>
                      </div>
                      <div className="w-full flex items-center justify-between border-b border-dashed border-border pb-1">
                        <span />
                        <span className="pr-1 shrink-0">95%</span>
                      </div>
                      <div className="w-full flex items-center justify-between border-b border-dashed border-border pb-1">
                        <span />
                        <span className="pr-1 shrink-0">92.5%</span>
                      </div>
                      <div className="w-full flex items-center justify-between pt-1">
                        <span />
                        <span className="pr-1 shrink-0">90%</span>
                      </div>
                    </>
                  )}
                </div>

                {/* SVG Graph Drawing */}
                <svg
                  className="absolute inset-0 w-full h-full overflow-visible z-10"
                  viewBox="0 0 500 200"
                  preserveAspectRatio="none"
                  onMouseMove={(e) => {
                    if (!hasHoveredChart) {
                      setHasHoveredChart(true);
                    }
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left; // relative X
                    const y = e.clientY - rect.top; // relative Y

                    // Find nearest point index based on SVG width
                    const svgWidth = rect.width;
                    const relativeX = (x / svgWidth) * 500;
                    
                    // X-coordinates: Thu=40, Fri=110, Sat=180, Sun=250, Mon=320, Tue=390, Wed=460
                    const xCoords = [40, 110, 180, 250, 320, 390, 460];
                    let nearestIndex = 0;
                    let minDiff = Infinity;
                    xCoords.forEach((coord, index) => {
                      const diff = Math.abs(relativeX - coord);
                      if (diff < minDiff) {
                        minDiff = diff;
                        nearestIndex = index;
                      }
                    });

                    setHoveredPointIndex(nearestIndex);

                    // Dynamic 2D boundaries for tooltip positioning (along all sides)
                    const tooltipWidth = 175;
                    const tooltipHeight = 70;
                    
                    let tooltipX = x + 15; // default to right of cursor
                    if (x + tooltipWidth + 15 > rect.width) {
                      tooltipX = x - tooltipWidth - 15; // shift to left
                    }

                    let tooltipY = y - tooltipHeight - 15; // default to top of cursor
                    if (y - tooltipHeight - 15 < 0) {
                      tooltipY = y + 15; // shift to bottom
                    }

                    setTooltipState({
                      x: tooltipX,
                      y: tooltipY,
                      show: true
                    });
                  }}
                  onMouseLeave={() => {
                    setHoveredPointIndex(null);
                    setTooltipState(prev => ({ ...prev, show: false }));
                  }}
                >
                  <defs>
                    <clipPath id="chart-clip">
                      <rect
                        x="0"
                        y="0"
                        height="200"
                        width={hasHoveredChart ? 500 : 0}
                        className="transition-all duration-[1200ms] ease-out"
                      />
                    </clipPath>
                  </defs>

                  {/* Dotted path curve */}
                  {statsTab === "processingTime" ? (
                    <path
                      d="M 40 46.7 C 75 50, 75 58.3, 110 58.3 C 145 58.3, 145 22.2, 180 22.2 C 215 22.2, 215 30, 250 30 C 285 30, 285 53.3, 320 53.3 C 355 53.3, 355 48.3, 390 48.3 C 425 48.3, 425 25, 460 25"
                      fill="none"
                      stroke="#d97706"
                      strokeWidth="2.5"
                      strokeDasharray="4 4"
                      clipPath="url(#chart-clip)"
                      className="transition-all duration-300"
                    />
                  ) : (
                    <path
                      d="M 40 80 C 75 90, 75 100, 110 100 C 145 100, 145 40, 180 40 C 215 40, 215 50, 250 50 C 285 50, 285 120, 320 120 C 355 120, 355 70, 390 70 C 425 70, 425 20, 460 20"
                      fill="none"
                      stroke="#d97706"
                      strokeWidth="2.5"
                      strokeDasharray="4 4"
                      clipPath="url(#chart-clip)"
                      className="transition-all duration-300"
                    />
                  )}

                  {/* Vertical Tracking Line & Bullet Point when hovered */}
                  {hoveredPointIndex !== null && (() => {
                    const xCoords = [40, 110, 180, 250, 320, 390, 460];
                    // YCoords for ProcessingTime
                    const yCoordsProcessing = [46.7, 58.3, 22.2, 30, 53.3, 48.3, 25];
                    // YCoords for ApprovalRating
                    const yCoordsApproval = [80, 100, 40, 50, 120, 70, 20];

                    const activeX = xCoords[hoveredPointIndex];
                    const activeY = statsTab === "processingTime" ? yCoordsProcessing[hoveredPointIndex] : yCoordsApproval[hoveredPointIndex];

                    return (
                      <>
                        {/* Smooth vertical tracking line */}
                        <line
                          x1={activeX}
                          y1="0"
                          x2={activeX}
                          y2="200"
                          stroke="#d97706"
                          strokeWidth="1.5"
                          pointerEvents="none"
                        />
                        {/* Glowing tracking dot */}
                        <circle
                          cx={activeX}
                          cy={activeY}
                          r="5.5"
                          fill="#d97706"
                          stroke="white"
                          strokeWidth="2"
                          pointerEvents="none"
                          className="shadow-sm"
                        />
                      </>
                    );
                  })()}
                </svg>

                {/* Floating dynamic popup tooltip following cursor */}
                {tooltipState.show && hoveredPointIndex !== null && (
                  <div
                    className="absolute bg-surface border border-border rounded-2xl p-3.5 shadow-xl pointer-events-none z-30 flex flex-col gap-1 transition-all duration-75 ease-out select-none min-w-[170px]"
                    style={{
                      left: `${tooltipState.x}px`,
                      top: `${tooltipState.y}px`
                    }}
                  >
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-none">
                      {statsTab === "processingTime" ? statsProcessingData[hoveredPointIndex].date : statsApprovalData[hoveredPointIndex].date}
                    </p>
                    <p className="text-xs font-black text-primary leading-none mt-1">
                      {statsTab === "processingTime" ? statsProcessingData[hoveredPointIndex].valueText : statsApprovalData[hoveredPointIndex].valueText}
                    </p>
                  </div>
                )}
              </div>

              {/* X-Axis Labels */}
              <div className="flex justify-between items-center text-[11px] font-bold text-muted-foreground mt-4 px-2 select-none">
                <span className="w-10 text-center">Thu</span>
                <span className="w-10 text-center">Fri</span>
                <span className="w-10 text-center">Sat</span>
                <span className="w-10 text-center">Sun</span>
                <span className="w-10 text-center">Mon</span>
                <span className="w-10 text-center">Tue</span>
                <span className="w-10 text-center">Wed</span>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
