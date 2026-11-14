import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckSquare, Upload } from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAppStore } from '../../store/useAppStore.ts';
import {
  Button,
  Card,
  EmptyState,
  FormField,
  HelpButton,
  Modal,
  Select,
  SkeletonRows,
  StatusLabel,
  Textarea,
} from '../../components/ui/Primitives.tsx';
import type { AccessibilityReportDTO, VerificationRecordDTO } from '../../../../shared/types.ts';

export const VolunteerDashboardPage: React.FC = () => {
  const { selectedCampusId } = useAppStore();
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState<AccessibilityReportDTO | null>(null);
  const [decision, setDecision] = useState<'confirmed' | 'rejected' | 'needs_more_evidence'>('confirmed');
  const [notes, setNotes] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: queue, isLoading } = useQuery({
    queryKey: ['verification-queue', selectedCampusId],
    queryFn: () =>
      api.get<AccessibilityReportDTO[]>(`/verifications/queue?campusId=${selectedCampusId}`),
  });

  const { data: history } = useQuery({
    queryKey: ['verification-history'],
    queryFn: () => api.get<VerificationRecordDTO[]>('/verifications/history'),
  });

  const submitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;
    setSaving(true);
    try {
      if (evidenceFile) {
        const fd = new FormData();
        fd.append('image', evidenceFile);
        await api.post(`/reports/${selectedReport.id}/evidence`, fd);
      }
      await api.post('/verifications', {
        campusId: selectedReport.campusId,
        reportId: selectedReport.id,
        decision,
        notes,
      });
      setSelectedReport(null);
      setNotes('');
      setEvidenceFile(null);
      queryClient.invalidateQueries({ queryKey: ['verification-queue'] });
      queryClient.invalidateQueries({ queryKey: ['verification-history'] });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ap-text)]">Volunteer Verification Queue</h1>
          <p className="text-sm text-[var(--ap-muted)] mt-1">
            Inspect pending accessibility reports on campus, attach field verification evidence, and submit recommendations for campus administration.
          </p>
        </div>
        <HelpButton featureId="F103" label="Verification Guide" />
      </div>

      {isLoading ? (
        <SkeletonRows rows={4} />
      ) : !queue || queue.length === 0 ? (
        <EmptyState
          title="Verification queue is clear"
          description="All submitted barrier reports on this campus have been verified or resolved."
        />
      ) : (
        <div className="space-y-3">
          {queue.map((rep) => (
            <Card key={rep.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs text-[var(--ap-muted)]">
                  {rep.locationLabel} · Priority: <strong className="text-[var(--ap-text)]">{rep.priority}</strong>
                </div>
                <Link to={`/app/reports/${rep.id}`} className="text-base font-bold text-[#18C6AD] hover:underline">
                  {rep.title}
                </Link>
                <p className="text-xs text-[var(--ap-muted)]">{rep.description}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <StatusLabel status={rep.status} />
                <Button size="sm" variant="secondary" onClick={() => setSelectedReport(rep)}>
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Verify On-Site</span>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="space-y-3">
        <h2 className="text-base font-bold text-[var(--ap-text)]">My Verification Activity</h2>
        {!history || history.length === 0 ? (
          <p className="text-xs text-[var(--ap-muted)]">No verification records submitted yet.</p>
        ) : (
          <div className="divide-y divide-[var(--ap-border)] text-xs">
            {history.map((v) => (
              <div key={v.id} className="py-2.5 flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-[var(--ap-text)]">
                    Report {v.reportId} · Decision: <span className="text-[#18C6AD]">{v.decision.replace(/_/g, ' ')}</span>
                  </p>
                  <p className="text-[var(--ap-muted)]">{v.notes}</p>
                </div>
                <span className="text-[var(--ap-muted)] tabular-nums shrink-0">
                  {new Date(v.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={Boolean(selectedReport)}
        onClose={() => setSelectedReport(null)}
        title={`Verify Report: ${selectedReport?.title || ''}`}
      >
        <form onSubmit={submitVerification} className="space-y-4">
          <FormField label="Verification Recommendation" htmlFor="ver-decision">
            <Select
              id="ver-decision"
              value={decision}
              onChange={(e) => setDecision(e.target.value as any)}
            >
              <option value="confirmed">Confirmed — Barrier exists as described</option>
              <option value="needs_more_evidence">Needs More Evidence</option>
              <option value="rejected">Not Found / False Report</option>
            </Select>
          </FormField>

          <FormField label="Field Inspection Notes" htmlFor="ver-notes" required>
            <Textarea
              id="ver-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Include width, slope, or obstruction details observed..."
              required
              minLength={3}
            />
          </FormField>

          <div>
            <label htmlFor="ver-photo" className="block text-xs font-semibold text-[var(--ap-text)] mb-1">
              Attach Verification Photo (Optional)
            </label>
            <label
              htmlFor="ver-photo"
              className="inline-flex items-center gap-2 px-3 py-2 text-xs border border-[var(--ap-border)] rounded-lg bg-[var(--ap-surface-2)] text-[var(--ap-text)] cursor-pointer hover:border-[#18C6AD]/60"
            >
              <Upload className="w-3.5 h-3.5 text-[#18C6AD]" />
              <span>{evidenceFile ? evidenceFile.name : 'Choose Photo'}</span>
            </label>
            <input
              id="ver-photo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
              className="sr-only"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setSelectedReport(null)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Submitting...' : 'Submit Verification'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
