import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Bot, Download, Printer, Send, Sparkles } from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAppStore } from '../../store/useAppStore.ts';
import { Button, Card, HelpButton, Input, Select, SkeletonRows } from '../../components/ui/Primitives.tsx';
import type { AIAnalyticsQAResponseDTO } from '../../../../shared/types.ts';

const QUICK_QA_PROMPTS = [
  'Which pathways are blocked or stale?',
  'What are top unresolved barrier categories?',
  'Summarize equipment SLA breaches',
];

export const AdminAnalyticsPage: React.FC = () => {
  const { selectedCampusId, token, theme } = useAppStore();
  const isDark = theme === 'dark';

  const [categoryFilter, setCategoryFilter] = useState('');
  const [aiSummary, setAiSummary] = useState<{
    executiveSummary: string;
    recommendedFocusAreas: string[];
    disclaimer: string;
  } | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const [qaQuestion, setQaQuestion] = useState('');
  const [qaResult, setQaResult] = useState<AIAnalyticsQAResponseDTO | null>(null);
  const [loadingQa, setLoadingQa] = useState(false);
  const [qaError, setQaError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['analytics-overview', selectedCampusId, categoryFilter],
    queryFn: () =>
      api.get<any>(
        `/analytics/overview?campusId=${selectedCampusId}${
          categoryFilter ? `&category=${categoryFilter}` : ''
        }`
      ),
  });

  const handleGenerateInsight = async () => {
    setLoadingAi(true);
    try {
      const res = await api.post<any>('/ai/summarize', { campusId: selectedCampusId });
      setAiSummary(res);
    } finally {
      setLoadingAi(false);
    }
  };

  const submitAnalyticsQuestion = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (trimmed.length < 3) return;
    setQaError('');
    setLoadingQa(true);
    try {
      const res = await api.post<AIAnalyticsQAResponseDTO>('/ai/analytics-qa', {
        campusId: selectedCampusId,
        question: trimmed,
      });
      setQaResult(res);
    } catch (err) {
      setQaError((err as Error).message);
    } finally {
      setLoadingQa(false);
    }
  };

  const handleExportCsv = async () => {
    const res = await fetch(`/api/v1/analytics/export?campusId=${selectedCampusId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    });
    const text = await res.text();
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accesspath-impact-${selectedCampusId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading || !data) return <SkeletonRows rows={6} />;

  const gridStroke = isDark ? '#1E3E56' : '#DCE5EE';
  const tickColor = isDark ? '#9AB0BE' : '#455D71';
  const tooltipStyle = {
    backgroundColor: isDark ? '#0D2235' : '#FFFFFF',
    borderColor: isDark ? '#1E3E56' : '#D0DDE9',
    color: isDark ? '#F5FAFC' : '#0A1D2E',
    borderRadius: '0.5rem',
    fontSize: '12px',
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-[var(--ap-text)]">Accessibility Analytics &amp; Impact Reports</h1>
            <HelpButton featureId="F131" label="Analytics Guide" />
          </div>
          <p className="text-xs text-[var(--ap-muted)] mt-1">
            {data.dataProvenance.disclaimer} (Demo seed records: {data.dataProvenance.demoRecords} · Live operational: {data.dataProvenance.operationalRecords})
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            aria-label="Filter analytics by report category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-48"
          >
            <option value="">All Categories</option>
            <option value="construction_obstruction">Construction Obstruction</option>
            <option value="damaged_pavement">Damaged Pavement</option>
            <option value="missing_ramp">Missing Ramp</option>
            <option value="broken_ramp">Broken Ramp</option>
            <option value="insufficient_lighting">Insufficient Lighting</option>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          ['Total Reports', data.totals.totalReports],
          ['Pending Review', data.totals.pendingReports],
          ['Verified Active', data.totals.verifiedBarriers],
          ['Resolved Issues', data.totals.resolvedIssues],
          ['Avg Resolution (hrs)', data.totals.avgResolutionHours],
          ['Campus Access Index', `${data.totals.campusAccessibilityIndex}/100`],
        ].map(([label, val]) => (
          <Card key={String(label)} padding="sm">
            <p className="text-xs text-[var(--ap-muted)]">{label}</p>
            <p className="text-2xl font-bold text-[var(--ap-text)] tabular-nums mt-1">{val}</p>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="space-y-4">
          <h2 className="text-base font-bold text-[var(--ap-text)]">Barrier Reports by Category</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: tickColor }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: tickColor }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#18C6AD" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="text-base font-bold text-[var(--ap-text)]">Building Accessibility Scores (Computed)</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.buildingScores}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="code" tick={{ fontSize: 11, fill: tickColor }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: tickColor }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="score" fill="#32A7D9" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* AI Accessibility Insights & Grounded Analytics Q&A */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[var(--ap-text)]">AI Accessibility Executive Summary</h2>
              <p className="text-xs text-[var(--ap-muted)]">Summarizes actual database reports using server-side Gemini AI.</p>
            </div>
            <Button size="sm" variant="secondary" onClick={handleGenerateInsight} disabled={loadingAi} className="no-print">
              <Bot className="w-4 h-4" />
              <span>{loadingAi ? 'Summarizing...' : 'Generate AI Insights'}</span>
            </Button>
          </div>
          {aiSummary && (
            <div className="p-4 rounded-lg bg-[var(--ap-surface-2)] border border-[var(--ap-border)] text-xs space-y-2">
              <p className="text-sm text-[var(--ap-text)] font-medium">{aiSummary.executiveSummary}</p>
              <ul className="list-disc pl-4 text-[var(--ap-muted)] space-y-0.5">
                {aiSummary.recommendedFocusAreas.map((area) => (
                  <li key={area}>{area}</li>
                ))}
              </ul>
              <p className="text-[var(--ap-muted)] italic">{aiSummary.disclaimer}</p>
            </div>
          )}
        </Card>

        <Card className="space-y-3 no-print">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-[var(--ap-text)] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#18C6AD]" />
                <span>AI Analytics Q&amp;A (Scoped &amp; Grounded)</span>
              </h2>
              <p className="text-xs text-[var(--ap-muted)]">
                Ask natural-language operational questions over non-PII campus metrics.
              </p>
            </div>
            <HelpButton featureId="F097" label="AI Q&A Guide" />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {QUICK_QA_PROMPTS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  setQaQuestion(q);
                  submitAnalyticsQuestion(q);
                }}
                className="px-2.5 py-1 text-xs rounded-lg border border-[var(--ap-border)] bg-[var(--ap-surface-2)] text-[var(--ap-muted)] hover:text-[#18C6AD] hover:border-[#18C6AD]/60 transition-colors cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitAnalyticsQuestion(qaQuestion);
            }}
            className="flex gap-2"
          >
            <Input
              value={qaQuestion}
              onChange={(e) => setQaQuestion(e.target.value)}
              placeholder="Ask about blocked corridors, stale inspections, or SLA..."
              aria-label="Analytics question"
            />
            <Button type="submit" size="sm" disabled={loadingQa || qaQuestion.trim().length < 3}>
              <Send className="w-3.5 h-3.5" />
              <span>{loadingQa ? 'Asking...' : 'Ask'}</span>
            </Button>
          </form>

          {qaError && (
            <p className="text-xs text-[var(--ap-danger)] font-semibold">{qaError}</p>
          )}

          {qaResult && (
            <div className="p-4 rounded-lg bg-[var(--ap-surface-2)] border border-[var(--ap-border)] text-xs space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-[#18C6AD]">
                  Provider: {qaResult.provider === 'gemini' ? 'Gemini AI' : 'Grounded Analytics Fallback'}
                </span>
                <span className="text-[var(--ap-muted)] font-mono tabular-nums">
                  Reports {qaResult.metricsSnapshot.totalReports} · Blocked {qaResult.metricsSnapshot.blockedEdges} · Stale {qaResult.metricsSnapshot.staleSegments}
                </span>
              </div>
              <p className="text-sm text-[var(--ap-text)] leading-relaxed">{qaResult.answer}</p>
              {qaResult.highlights.length > 0 && (
                <div>
                  <p className="font-semibold text-[var(--ap-text)]">Key Metrics Highlights</p>
                  <ul className="list-disc pl-4 text-[var(--ap-muted)] space-y-0.5 mt-0.5">
                    {qaResult.highlights.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                </div>
              )}
              {qaResult.recommendedActions.length > 0 && (
                <div>
                  <p className="font-semibold text-[#32A7D9]">Recommended Actions</p>
                  <ul className="list-disc pl-4 text-[var(--ap-muted)] space-y-0.5 mt-0.5">
                    {qaResult.recommendedActions.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-[var(--ap-muted)] italic">{qaResult.disclaimer}</p>
            </div>
          )}
        </Card>
      </div>

      {/* Predictive Maintenance 2.0 & Building Trust Coverage */}
      {data.trustCoverage && (
        <Card className="space-y-3 overflow-x-auto">
          <h2 className="text-base font-bold text-[var(--ap-text)]">Building Verification Trust Coverage</h2>
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--ap-surface-2)] border-b border-[var(--ap-border)] text-[var(--ap-muted)]">
              <tr>
                <th className="px-3 py-2">Building</th>
                <th className="px-3 py-2">Total Segments</th>
                <th className="px-3 py-2">Current Verified</th>
                <th className="px-3 py-2">Expiring</th>
                <th className="px-3 py-2">Stale</th>
                <th className="px-3 py-2 text-right">Fresh Coverage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ap-border)] tabular-nums">
              {data.trustCoverage.map((tc: any) => (
                <tr key={tc.buildingId}>
                  <td className="px-3 py-2 font-semibold text-[var(--ap-text)]">{tc.buildingName} ({tc.buildingCode})</td>
                  <td className="px-3 py-2 text-[var(--ap-text)]">{tc.totalEdges}</td>
                  <td className="px-3 py-2 text-[var(--ap-ok)] font-semibold">{tc.verifiedCurrentCount}</td>
                  <td className="px-3 py-2 text-[var(--ap-warn)]">{tc.expiringCount}</td>
                  <td className="px-3 py-2 text-[var(--ap-danger)]">{tc.staleCount}</td>
                  <td className="px-3 py-2 text-right font-bold text-[var(--ap-text)]">{tc.coveragePercent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {data.predictiveMaintenance2 && (
        <Card className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-[var(--ap-text)]">Predictive Maintenance 2.0 (MTTR &amp; SLA Reliability)</h2>
              <p className="text-xs text-[var(--ap-muted)]">{data.predictiveMaintenance2.methodologyNote}</p>
            </div>
            <div className="flex gap-4 text-xs text-[var(--ap-text)] tabular-nums">
              <span>Overall MTTR: <strong>{data.predictiveMaintenance2.overallMttrHours ?? 'N/A'}h</strong></span>
              <span>SLA Compliance: <strong>{data.predictiveMaintenance2.overallSlaCompliancePercent ?? 'N/A'}%</strong></span>
            </div>
          </div>

          {data.predictiveMaintenance2.recurringPatterns.length > 0 && (
            <div className="p-3 rounded-lg bg-[var(--ap-warn-bg)] border border-[var(--ap-warn-border)] text-xs text-[var(--ap-warn)] space-y-1">
              <p className="font-bold">Recurring Equipment Faults Detected</p>
              {data.predictiveMaintenance2.recurringPatterns.map((rp: any) => (
                <p key={rp.equipmentName}>
                  {rp.equipmentName} ({rp.count} failures) — Latest cause: {rp.latestCause}
                </p>
              ))}
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-3 text-xs">
            {data.predictiveMaintenance2.buildingRisks.map((br: any) => (
              <div key={br.buildingId} className="p-3 rounded-lg border border-[var(--ap-border)] bg-[var(--ap-surface-2)] space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-[var(--ap-text)]">{br.buildingName}</p>
                  <span className="font-mono font-bold text-[#18C6AD] tabular-nums">Risk {br.riskScore}/100</span>
                </div>
                <p className="text-[var(--ap-muted)] tabular-nums">
                  Incidents: {br.incidentCount} · Open Tasks: {br.openTasksCount} · MTTR: {br.mttrHours ?? 'N/A'}h
                </p>
                <p className="text-[var(--ap-muted)]">{br.forecastNote}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
