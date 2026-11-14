import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api.ts';
import {
  Button,
  Card,
  FormField,
  HelpButton,
  Input,
  SkeletonRows,
  StatusLabel,
} from '../../components/ui/Primitives.tsx';
import type { CampusDTO, InstitutionDTO } from '../../../../shared/types.ts';

export const SuperAdminPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [instName, setInstName] = useState('');
  const [instCode, setInstCode] = useState('');
  const [instEmail, setInstEmail] = useState('');

  const { data: institutions, isLoading } = useQuery({
    queryKey: ['super-institutions'],
    queryFn: () => api.get<InstitutionDTO[]>('/admin/institutions'),
  });

  const { data: campuses } = useQuery({
    queryKey: ['super-campuses'],
    queryFn: () => api.get<CampusDTO[]>('/campuses'),
  });

  const { data: aiStatus } = useQuery({
    queryKey: ['super-ai-status'],
    queryFn: () =>
      api.get<{ configuredProvider: string; activeProvider: string; model: string; hasApiKey: boolean }>(
        '/ai/status'
      ),
  });

  const { data: aiLogs } = useQuery({
    queryKey: ['super-ai-logs'],
    queryFn: () => api.get<any[]>('/ai/logs'),
  });

  const [integrityReport, setIntegrityReport] = useState<any | null>(null);
  const [backupMsg, setBackupMsg] = useState('');

  const handleAddInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/admin/institutions', {
      name: instName,
      code: instCode,
      country: 'Bangladesh',
      contactEmail: instEmail,
    });
    setInstName('');
    setInstCode('');
    setInstEmail('');
    queryClient.invalidateQueries({ queryKey: ['super-institutions'] });
  };

  const handleIntegrityCheck = async () => {
    const rep = await api.get<any>('/admin/system/integrity');
    setIntegrityReport(rep);
  };

  const handleDownloadBackup = async () => {
    const data = await api.get<any>('/admin/system/backup');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accesspath-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupMsg(`Exported database backup snapshot (schema v${data.schemaVersion}).`);
  };

  if (isLoading) return <SkeletonRows rows={5} />;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ap-text)]">Platform Super Administration</h1>
          <p className="text-sm text-[var(--ap-muted)] mt-1">
            Multi-campus institution governance, database backup &amp; integrity controls, and AI configuration monitoring.
          </p>
        </div>
        <HelpButton featureId="F128" label="Super Admin Guide" />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card padding="sm">
          <p className="text-xs text-[var(--ap-muted)]">Institutions</p>
          <p className="text-2xl font-bold text-[var(--ap-text)] tabular-nums mt-1">{institutions?.length || 0}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-[var(--ap-muted)]">Campuses</p>
          <p className="text-2xl font-bold text-[var(--ap-text)] tabular-nums mt-1">{campuses?.length || 0}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-[var(--ap-muted)]">AI Service Provider</p>
          <p className="text-sm font-bold text-[#18C6AD] mt-1">
            {aiStatus?.activeProvider === 'gemini' ? `Gemini (${aiStatus.model})` : 'Mock Provider (No live key)'}
          </p>
        </Card>
      </div>

      <Card className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[var(--ap-text)]">Database Integrity &amp; Backup Procedures</h2>
            <p className="text-xs text-[var(--ap-muted)]">
              Verify cross-collection foreign-key integrity and export full tenant-complete JSON backups.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={handleIntegrityCheck}>Run Integrity Check</Button>
            <Button size="sm" variant="secondary" onClick={handleDownloadBackup}>Export Backup JSON</Button>
          </div>
        </div>
        {backupMsg && <p className="text-xs font-semibold text-[var(--ap-ok)]">{backupMsg}</p>}
        {integrityReport && (
          <div className="p-3 rounded-lg bg-[var(--ap-surface-2)] border border-[var(--ap-border)] text-xs space-y-1">
            <p className="font-bold text-[var(--ap-text)]">
              Integrity Status: {integrityReport.ok ? 'All Checks Passed' : 'Issues Found'} ({integrityReport.counts?.edges || 0} edges, {integrityReport.counts?.reports || 0} reports)
            </p>
            {integrityReport.issues?.length > 0 && (
              <p className="text-[var(--ap-danger)]">{integrityReport.issues.join(' · ')}</p>
            )}
          </div>
        )}
      </Card>

      <Card className="space-y-4">
        <h2 className="text-base font-bold text-[var(--ap-text)]">Institutions Registry</h2>
        <form onSubmit={handleAddInstitution} className="grid sm:grid-cols-4 gap-3 items-end">
          <FormField label="Institution Name" htmlFor="inst-name" required>
            <Input id="inst-name" value={instName} onChange={(e) => setInstName(e.target.value)} required />
          </FormField>
          <FormField label="Code" htmlFor="inst-code" required>
            <Input id="inst-code" value={instCode} onChange={(e) => setInstCode(e.target.value)} required />
          </FormField>
          <FormField label="Contact Email" htmlFor="inst-email" required>
            <Input id="inst-email" type="email" value={instEmail} onChange={(e) => setInstEmail(e.target.value)} required />
          </FormField>
          <Button type="submit">Add Institution</Button>
        </form>

        <div className="divide-y divide-[var(--ap-border)] text-xs">
          {(institutions || []).map((inst) => (
            <div key={inst.id} className="py-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-[var(--ap-text)]">{inst.name} ({inst.code})</p>
                <p className="text-[var(--ap-muted)]">{inst.contactEmail} · {inst.isDemoData ? 'Demo Seed' : 'Operational'}</p>
              </div>
              <StatusLabel status={inst.status} />
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-base font-bold text-[var(--ap-text)]">Recent Server-Side AI Request Logs (PII-Minimized)</h2>
        {!aiLogs || aiLogs.length === 0 ? (
          <p className="text-xs text-[var(--ap-muted)]">No AI requests logged in this session yet.</p>
        ) : (
          <div className="divide-y divide-[var(--ap-border)] text-xs">
            {aiLogs.slice(0, 12).map((log) => (
              <div key={log.id} className="py-2 flex items-center justify-between gap-2">
                <div>
                  <span className="font-mono font-semibold text-[#18C6AD]">{log.feature}</span> ·{' '}
                  <span className="text-[var(--ap-text)]">{log.provider} ({log.model})</span> ·{' '}
                  <span className="text-[var(--ap-muted)]">{log.outputSummary}</span>
                </div>
                <span className="font-mono tabular-nums text-[var(--ap-muted)]">{log.latencyMs}ms</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
