import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Languages,
  Mic,
  Sparkles,
  ThumbsUp,
  Upload,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAppStore } from '../../store/useAppStore.ts';
import { useOnlineStatus } from '../../hooks/usePWAInstall.ts';
import {
  Button,
  Card,
  EmptyState,
  FormField,
  HelpButton,
  Input,
  Modal,
  Select,
  SkeletonRows,
  StatusLabel,
  Textarea,
} from '../../components/ui/Primitives.tsx';
import type {
  AIClassificationDTO,
  AccessibilityReportDTO,
  LocationNodeDTO,
  PathEdgeDTO,
  ReportCategory,
  ReportPriority,
} from '../../../../shared/types.ts';

const CATEGORIES: Array<{ value: ReportCategory; label: string }> = [
  { value: 'broken_ramp', label: 'Broken Ramp' },
  { value: 'missing_ramp', label: 'Missing Ramp' },
  { value: 'blocked_walkway', label: 'Blocked Walkway' },
  { value: 'damaged_pavement', label: 'Damaged Pavement' },
  { value: 'broken_elevator', label: 'Broken Elevator' },
  { value: 'missing_accessible_entrance', label: 'Missing Accessible Entrance' },
  { value: 'stairs_only_access', label: 'Stairs-Only Access' },
  { value: 'insufficient_lighting', label: 'Insufficient Lighting' },
  { value: 'narrow_passage', label: 'Narrow Passage' },
  { value: 'construction_obstruction', label: 'Construction Obstruction' },
  { value: 'other', label: 'Other Accessibility Barrier' },
];

export const SubmitReportPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const { selectedCampusId, user, addOfflineDraft } = useAppStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [locationNodeId, setLocationNodeId] = useState(searchParams.get('nodeId') || '');
  const [pathEdgeId, setPathEdgeId] = useState('');
  const [category, setCategory] = useState<ReportCategory>('blocked_walkway');
  const [priority, setPriority] = useState<ReportPriority>('medium');
  const [language, setLanguage] = useState<'en' | 'bn'>('en');
  const [aiPreview, setAiPreview] = useState<AIClassificationDTO | null>(null);
  const [imageAiResult, setImageAiResult] = useState<{
    detectedBarrier: string;
    suggestedCategory: ReportCategory;
    suggestedPriority: ReportPriority;
    confidence: number;
    provider: string;
  } | null>(null);
  const [duplicates, setDuplicates] = useState<
    Array<{ reportId: string; title: string; similarityScore: number; reason: string }>
  >([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [voiceActive, setVoiceActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [draftMsg, setDraftMsg] = useState('');

  const { data: mapData } = useQuery({
    queryKey: ['report-locations', selectedCampusId],
    queryFn: () =>
      api.get<{ locations: LocationNodeDTO[]; edges: PathEdgeDTO[] }>(
        `/campuses/${selectedCampusId}/map`
      ),
  });

  useEffect(() => {
    if (locationNodeId && mapData?.locations) {
      const found = mapData.locations.find((l) => l.id === locationNodeId);
      if (found && !locationLabel) setLocationLabel(found.name);
    }
  }, [locationNodeId, mapData, locationLabel]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setImageAiResult(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Only PNG, JPEG, or WEBP images are accepted.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be 5 MB or less.');
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const handleAnalyzeImage = async () => {
    if (!user || !photoPreview || !photoFile) {
      setError('Sign in and attach an image first to run AI vision inspection.');
      return;
    }
    setError('');
    const base64Data = photoPreview.split(',')[1] || '';
    if (!base64Data) return;
    try {
      const res = await api.post<{
        detectedBarrier: string;
        suggestedCategory: ReportCategory;
        suggestedPriority: ReportPriority;
        confidence: number;
        provider: string;
      }>('/ai/analyze-image', {
        base64Data,
        mimeType: photoFile.type,
        note: `${title} ${locationLabel}`.trim() || undefined,
      });
      setImageAiResult(res);
      setCategory(res.suggestedCategory);
      setPriority(res.suggestedPriority);
      if (!description.trim()) setDescription(res.detectedBarrier);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleVoiceInput = () => {
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRec) {
      setError('Browser Speech Recognition is unavailable here; please type your report.');
      return;
    }
    const recognition = new SpeechRec();
    recognition.lang = language === 'bn' ? 'bn-BD' : 'en-US';
    recognition.interimResults = false;
    setVoiceActive(true);
    recognition.onresult = (ev: any) => {
      const transcript = ev.results?.[0]?.[0]?.transcript || '';
      setDescription((prev) => (prev ? `${prev} ${transcript}` : transcript));
      setVoiceActive(false);
    };
    recognition.onerror = () => setVoiceActive(false);
    recognition.onend = () => setVoiceActive(false);
    recognition.start();
  };

  const handleAiAnalyze = async () => {
    if (!user) {
      setError('Please sign in first to run AI classification and submit reports.');
      return;
    }
    setError('');
    try {
      const res = await api.post<AIClassificationDTO>('/ai/classify-report', {
        text: `${title}. ${description}`,
        locationHint: locationLabel,
        campusId: selectedCampusId,
      });
      setAiPreview(res);
      setCategory(res.category);
      setPriority(res.suggestedPriority);
      if (res.detectedLanguage === 'bn') setLanguage('bn');

      const dup = await api.post<{
        potentialDuplicates: Array<{
          reportId: string;
          title: string;
          similarityScore: number;
          reason: string;
        }>;
      }>('/ai/detect-duplicates', {
        campusId: selectedCampusId,
        title: title || res.summary,
        description,
        locationLabel: locationLabel || res.location,
      });
      setDuplicates(dup.potentialDuplicates);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDraftMsg('');

    if (!isOnline) {
      const clientRequestId = `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      addOfflineDraft({
        id: `draft_${Date.now()}`,
        clientRequestId,
        campusId: selectedCampusId,
        title,
        description,
        category,
        priority,
        locationLabel: locationLabel || 'Campus location',
        language,
        savedAt: new Date().toISOString(),
      });
      setDraftMsg('Offline: Report saved with deduplication ID to local queue for sync once online.');
      return;
    }

    if (!user) {
      navigate('/auth/signin');
      return;
    }

    setSubmitting(true);
    try {
      const locObj = mapData?.locations.find((l) => l.id === locationNodeId);
      const created = await api.post<AccessibilityReportDTO>('/reports', {
        campusId: selectedCampusId,
        locationNodeId: locationNodeId || undefined,
        pathEdgeId: pathEdgeId || undefined,
        title,
        description,
        language,
        category,
        priority,
        locationLabel: locationLabel || locObj?.name || 'Campus Pathway',
        lat: locObj?.lat,
        lng: locObj?.lng,
        runAiClassification: true,
      });

      if (photoFile) {
        const fd = new FormData();
        fd.append('image', photoFile);
        await api.post(`/reports/${created.id}/evidence`, fd);
      }

      navigate(`/app/reports/${created.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  // Compute interactive guided step progress
  const step1Done = Boolean(locationLabel.trim());
  const step2Done = description.trim().length >= 10 && title.trim().length >= 4;
  const step3Done = Boolean(aiPreview || imageAiResult || photoFile);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ap-text)]">
            Guided Barrier Report &amp; AI Copilot
          </h1>
          <p className="text-sm text-[var(--ap-muted)] mt-1">
            Submit in English or বাংলা. AI extracts category, severity, and missing verification details; human staff confirm map changes.
          </p>
        </div>
        <HelpButton featureId="F073" />
      </div>

      {/* Interactive 4-Step Copilot Progress Bar */}
      <div className="grid grid-cols-4 gap-2 text-xs">
        {[
          ['1. Location', step1Done],
          ['2. Description', step2Done],
          ['3. AI / Photo', step3Done],
          ['4. Review & Submit', step1Done && step2Done],
        ].map(([label, done]) => (
          <div
            key={String(label)}
            className={`px-3 py-2 rounded-lg border font-semibold text-center ${
              done
                ? 'border-[#18C6AD] bg-[#18C6AD]/10 text-[#18C6AD]'
                : 'border-[var(--ap-border)] bg-[var(--ap-surface)] text-[var(--ap-muted)]'
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-[var(--ap-danger-bg)] border border-[var(--ap-danger-border)] text-sm text-[var(--ap-danger)]" role="alert">
          {error}
        </div>
      )}
      {draftMsg && (
        <div className="p-3.5 rounded-lg bg-[var(--ap-warn-bg)] border border-[var(--ap-warn-border)] text-sm text-[var(--ap-warn)]" role="status">
          {draftMsg}
        </div>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <FormField label="Report Language" htmlFor="rep-lang">
              <Select
                id="rep-lang"
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'en' | 'bn')}
              >
                <option value="en">English</option>
                <option value="bn">বাংলা (Bengali)</option>
              </Select>
            </FormField>

            <FormField label="Campus Location Node (Optional)" htmlFor="rep-node">
              <Select
                id="rep-node"
                value={locationNodeId}
                onChange={(e) => {
                  setLocationNodeId(e.target.value);
                  const found = mapData?.locations.find((l) => l.id === e.target.value);
                  if (found) setLocationLabel(found.name);
                }}
              >
                <option value="">Select campus location...</option>
                {(mapData?.locations || []).map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </Select>
            </FormField>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <FormField label="Location Label" htmlFor="rep-loc-label" required>
              <Input
                id="rep-loc-label"
                value={locationLabel}
                onChange={(e) => setLocationLabel(e.target.value)}
                placeholder="e.g., Library West Ramp"
                required
              />
            </FormField>

            <FormField label="Affected Path Segment (Optional)" htmlFor="rep-edge">
              <Select
                id="rep-edge"
                value={pathEdgeId}
                onChange={(e) => setPathEdgeId(e.target.value)}
              >
                <option value="">None / Not sure</option>
                {(mapData?.edges || []).map((ed) => (
                  <option key={ed.id} value={ed.id}>{ed.name}</option>
                ))}
              </Select>
            </FormField>
          </div>

          <FormField label="Short Barrier Title" htmlFor="rep-title" required>
            <Input
              id="rep-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Construction materials blocking ramp approach"
              required
              minLength={4}
            />
          </FormField>

          <FormField
            label="Detailed Description (English or বাংলা)"
            htmlFor="rep-desc"
            hint="Describe the obstacle, location cues, width/slope if visible, and impact on step-free movement."
            required
          >
            <Textarea
              id="rep-desc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              minLength={10}
            />
          </FormField>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleVoiceInput}>
              <Mic className="w-4 h-4 text-[#18C6AD]" />
              <span>{voiceActive ? 'Listening...' : 'Voice Dictation'}</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAiAnalyze}
              disabled={description.trim().length < 8}
            >
              <Bot className="w-4 h-4" />
              <span>Analyze Text with Gemini Copilot</span>
            </Button>
          </div>

          {aiPreview && (
            <div className="p-4 rounded-xl bg-[var(--ap-surface-2)] border border-[#18C6AD]/60 space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold text-[#18C6AD]">
                <span>AI Copilot Classification (Provider: {aiPreview.provider})</span>
                <span className="font-mono">Confidence: {Math.round(aiPreview.confidence * 100)}%</span>
              </div>
              <p className="text-[var(--ap-text)]">{aiPreview.summary}</p>
              <p className="text-[var(--ap-muted)]">
                Impact: <code className="font-mono text-[#32A7D9]">{aiPreview.accessibilityImpact}</code> · Human verification required: Yes
              </p>
              {aiPreview.missingInformation && aiPreview.missingInformation.length > 0 && (
                <div className="pt-2 border-t border-[var(--ap-border)] text-[var(--ap-warn)] space-y-1">
                  <p className="font-bold">Helpful Details You Can Add Before Submitting:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {aiPreview.missingInformation.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {duplicates.length > 0 && (
            <div className="p-4 rounded-xl bg-[var(--ap-warn-bg)] border border-[var(--ap-warn-border)] space-y-2 text-xs">
              <p className="font-bold text-[var(--ap-warn)]">Possible Similar Reports Detected:</p>
              {duplicates.map((d) => (
                <div key={d.reportId} className="flex items-center justify-between gap-2">
                  <Link to={`/app/reports/${d.reportId}`} className="underline font-medium text-[var(--ap-text)]">
                    {d.title} ({Math.round(d.similarityScore * 100)}% match)
                  </Link>
                </div>
              ))}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <FormField label="Barrier Category (Editable)" htmlFor="rep-cat" required>
              <Select
                id="rep-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value as ReportCategory)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Suggested Priority (Editable)" htmlFor="rep-prio" required>
              <Select
                id="rep-prio"
                value={priority}
                onChange={(e) => setPriority(e.target.value as ReportPriority)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical (Blocked Route)</option>
              </Select>
            </FormField>
          </div>

          <div className="space-y-2.5">
            <label htmlFor="rep-photo" className="block text-sm font-semibold text-[var(--ap-text)]">
              Photo Evidence (EXIF/GPS automatically scrubbed on upload · PNG/JPEG/WEBP max 5MB)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <label
                htmlFor="rep-photo"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border border-[var(--ap-border)] bg-[var(--ap-surface-2)] text-[var(--ap-text)] hover:border-[#18C6AD] cursor-pointer"
              >
                <Upload className="w-4 h-4 text-[#18C6AD]" />
                <span>{photoFile ? photoFile.name : 'Choose Image File'}</span>
              </label>
              {photoPreview && (
                <Button type="button" size="sm" variant="outline" onClick={handleAnalyzeImage}>
                  <Sparkles className="w-3.5 h-3.5 text-[#32A7D9]" />
                  <span>Inspect Photo with AI</span>
                </Button>
              )}
            </div>
            <input
              id="rep-photo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handlePhotoChange}
              className="sr-only"
            />
            {photoPreview && (
              <div className="mt-2 space-y-2">
                <img
                  src={photoPreview}
                  alt="Preview of uploaded barrier photo"
                  className="max-h-48 rounded-lg border border-[var(--ap-border)] object-cover"
                />
                {imageAiResult && (
                  <div className="p-3 rounded-lg bg-[var(--ap-surface-2)] border border-[#32A7D9]/50 text-xs text-[var(--ap-text)]">
                    <strong className="text-[#32A7D9]">Vision Inspection ({imageAiResult.provider}):</strong>{' '}
                    {imageAiResult.detectedBarrier}
                  </div>
                )}
              </div>
            )}
          </div>

          <Button type="submit" disabled={submitting}>
            {submitting ? 'Submitting Report...' : isOnline ? 'Submit Barrier Report' : 'Save Offline Draft'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export const ReportsListPage: React.FC<{ mode: 'mine' | 'community' }> = ({ mode }) => {
  const { selectedCampusId, user } = useAppStore();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['reports-list', mode, selectedCampusId, user?.id],
    queryFn: () =>
      api.get<AccessibilityReportDTO[]>(
        `/reports?campusId=${selectedCampusId}${mode === 'mine' ? '&mine=true' : ''}`
      ),
    enabled: mode === 'community' || Boolean(user),
  });

  const handleUpvote = async (id: string) => {
    if (!user) return;
    await api.post(`/reports/${id}/upvote`);
    queryClient.invalidateQueries({ queryKey: ['reports-list'] });
  };

  const items = (data || []).filter((r) => statusFilter === 'all' || r.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ap-text)]">
            {mode === 'mine' ? 'My Barrier Reports' : 'Community Accessibility Reports'}
          </h1>
          <p className="text-xs text-[var(--ap-muted)] mt-1">
            Reporter personal identities are masked on public views. Only verified decisions alter campus routes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <HelpButton featureId="F081" />
          <Link to="/app/report/new">
            <Button>New Report</Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {['all', 'pending_review', 'under_verification', 'verified', 'assigned', 'resolved'].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer ${
              statusFilter === st
                ? 'bg-[#18C6AD] text-[#04211E] border-[#18C6AD]'
                : 'bg-[var(--ap-surface)] text-[var(--ap-text)] border-[var(--ap-border)]'
            }`}
          >
            {st === 'all' ? 'All Statuses' : st.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </button>
        ))}
      </div>

      {isLoading ? (
        <SkeletonRows rows={4} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No barrier reports found"
          description="No reports match the current filter criteria."
          action={<Link to="/app/report/new"><Button size="sm">Submit Report</Button></Link>}
        />
      ) : (
        <div className="space-y-3">
          {items.map((rep) => (
            <Card key={rep.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--ap-muted)]">
                  <span>{rep.locationLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span>{rep.category.replace(/_/g, ' ')}</span>
                  <span aria-hidden="true">·</span>
                  <span>Priority: {rep.priority}</span>
                  {rep.isDemoData && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>Demo Seed</span>
                    </>
                  )}
                </div>
                <Link to={`/app/reports/${rep.id}`} className="text-base font-bold text-[#18C6AD] hover:underline block">
                  {rep.title}
                </Link>
                <p className="text-xs text-[var(--ap-muted)] line-clamp-2">{rep.description}</p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <StatusLabel status={rep.status} />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleUpvote(rep.id)}
                  disabled={!user}
                  aria-label={`Upvote report ${rep.title}`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span className="tabular-nums">{rep.upvotes}</span>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export const ReportDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAppStore();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [translated, setTranslated] = useState('');
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [fbRating, setFbRating] = useState(5);
  const [fbComment, setFbComment] = useState('');

  const { data: report, isLoading } = useQuery({
    queryKey: ['report-detail', id],
    queryFn: () => api.get<AccessibilityReportDTO>(`/reports/${id}`),
  });

  if (isLoading) return <SkeletonRows rows={5} />;
  if (!report) {
    return (
      <EmptyState
        title="Report not found"
        description="This barrier report may have been removed."
        action={<Link to="/app/community-reports"><Button>Back to Reports</Button></Link>}
      />
    );
  }

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    await api.post(`/reports/${report.id}/comments`, { content: comment });
    setComment('');
    queryClient.invalidateQueries({ queryKey: ['report-detail', id] });
  };

  const handleTranslate = async () => {
    const target = report.language === 'bn' ? 'en' : 'bn';
    const res = await api.post<{ translatedText: string }>('/ai/translate', {
      text: `${report.title}\n${report.description}`,
      targetLanguage: target,
    });
    setTranslated(res.translatedText);
  };

  const handleDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post(`/reports/${report.id}/dispute`, { reason: disputeReason });
    setDisputeOpen(false);
    setDisputeReason('');
    queryClient.invalidateQueries({ queryKey: ['report-detail', id] });
  };

  const handleResolutionFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post(`/reports/${report.id}/resolution-feedback`, {
      resolvedConfirmed: true,
      rating: fbRating,
      comment: fbComment,
    });
    queryClient.invalidateQueries({ queryKey: ['report-detail', id] });
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs text-[var(--ap-muted)]">
            {report.reporterAlias} · {new Date(report.createdAt).toLocaleString()} · {report.locationLabel}
          </p>
          <h1 className="text-2xl font-bold text-[var(--ap-text)]">{report.title}</h1>
        </div>
        <StatusLabel status={report.status} size="md" />
      </div>

      <Card className="space-y-4">
        <p className="text-sm text-[var(--ap-text)] leading-relaxed">{report.description}</p>
        {translated && (
          <div className="p-3 rounded-lg bg-[var(--ap-surface-2)] border border-[var(--ap-border)] text-xs text-[var(--ap-text)]">
            <strong>Translation:</strong> {translated}
          </div>
        )}
        <div className="flex flex-wrap gap-2 pt-2">
          {user && (
            <Button size="sm" variant="outline" onClick={handleTranslate}>
              <Languages className="w-3.5 h-3.5" />
              <span>Translate ({report.language === 'bn' ? 'to English' : 'to বাংলা'})</span>
            </Button>
          )}
          {user && (
            <Button size="sm" variant="outline" onClick={() => setDisputeOpen(true)}>
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Dispute Status</span>
            </Button>
          )}
        </div>

        {report.evidenceUrls.length > 0 && (
          <div className="pt-3 border-t border-[var(--ap-border)] space-y-2">
            <h2 className="text-xs font-bold text-[var(--ap-text)]">Uploaded Photo Evidence</h2>
            <div className="flex flex-wrap gap-3">
              {report.evidenceUrls.map((url) => (
                <img
                  key={url}
                  src={url}
                  alt="Submitted barrier evidence"
                  className="h-36 rounded-lg border border-[var(--ap-border)] object-cover"
                />
              ))}
            </div>
          </div>
        )}
      </Card>

      {report.aiClassification && (
        <Card className="bg-[var(--ap-surface-2)] space-y-1.5 text-xs">
          <p className="font-bold text-[#18C6AD]">
            AI Triage Recommendation ({report.aiClassification.provider}) — Not Authoritative Truth
          </p>
          <p className="text-[var(--ap-muted)]">{report.aiClassification.summary}</p>
          <p className="text-[var(--ap-text)]">
            Suggested Category: <code className="font-mono text-[#32A7D9]">{report.aiClassification.category}</code> · Suggested Action: {report.aiClassification.suggestedAction}
          </p>
        </Card>
      )}

      {/* Status Timeline */}
      <Card className="space-y-4">
        <h2 className="text-base font-bold text-[var(--ap-text)]">Verification &amp; Resolution Timeline</h2>
        <ol className="space-y-3">
          {report.timeline.map((ev, i) => (
            <li key={`${ev.timestamp}-${i}`} className="text-xs border-b border-[var(--ap-border)] pb-2.5 last:border-b-0">
              <div className="flex items-center justify-between">
                <StatusLabel status={ev.status} />
                <span className="text-[var(--ap-muted)] tabular-nums">{new Date(ev.timestamp).toLocaleString()}</span>
              </div>
              <p className="text-[var(--ap-text)] mt-1">{ev.note}</p>
            </li>
          ))}
        </ol>
      </Card>

      {report.status === 'resolved' && user && !report.resolutionFeedback && (
        <Card className="space-y-3">
          <h2 className="text-base font-bold text-[var(--ap-text)]">Confirm Barrier Resolution</h2>
          <form onSubmit={handleResolutionFeedback} className="space-y-3">
            <div className="flex flex-wrap gap-3 items-center">
              <Select
                aria-label="Resolution rating"
                value={String(fbRating)}
                onChange={(e) => setFbRating(Number(e.target.value))}
                className="w-32"
              >
                <option value="5">5 - Fixed well</option>
                <option value="4">4 - Good</option>
                <option value="3">3 - Acceptable</option>
                <option value="2">2 - Partial</option>
                <option value="1">1 - Still blocked</option>
              </Select>
              <Input
                value={fbComment}
                onChange={(e) => setFbComment(e.target.value)}
                placeholder="Confirm if the path is now safely passable..."
                className="flex-1"
              />
              <Button type="submit" size="sm">Submit Confirmation</Button>
            </div>
          </form>
        </Card>
      )}

      {report.resolutionFeedback && (
        <Card className="bg-[var(--ap-surface-2)] border-[#18C6AD]/40 text-xs text-[#18C6AD] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>
            Resolution confirmed ({report.resolutionFeedback.rating}/5): {report.resolutionFeedback.comment}
          </span>
        </Card>
      )}

      {/* Comments */}
      <Card className="space-y-4">
        <h2 className="text-base font-bold text-[var(--ap-text)]">Community Discussion</h2>
        {report.comments.length === 0 ? (
          <p className="text-xs text-[var(--ap-muted)]">No comments yet.</p>
        ) : (
          <div className="space-y-3">
            {report.comments.map((c) => (
              <div key={c.id} className="p-3 rounded-lg bg-[var(--ap-surface-2)] border border-[var(--ap-border)] text-xs">
                <p className="font-bold text-[var(--ap-text)]">
                  {c.authorLabel} · <span className="font-normal text-[var(--ap-muted)]">{new Date(c.createdAt).toLocaleString()}</span>
                </p>
                <p className="mt-1 text-[var(--ap-text)]">{c.content}</p>
              </div>
            ))}
          </div>
        )}
        {user && (
          <form onSubmit={handleComment} className="flex gap-2">
            <Input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add verification observation or update..."
              aria-label="Add comment"
            />
            <Button type="submit" size="sm">Post</Button>
          </form>
        )}
      </Card>

      <Modal open={disputeOpen} onClose={() => setDisputeOpen(false)} title="Dispute Report Status">
        <form onSubmit={handleDispute} className="space-y-4">
          <FormField label="Reason for dispute" htmlFor="dispute-reason" required>
            <Textarea
              id="dispute-reason"
              rows={3}
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              required
              minLength={5}
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDisputeOpen(false)}>Cancel</Button>
            <Button type="submit" variant="danger">Submit Dispute</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
