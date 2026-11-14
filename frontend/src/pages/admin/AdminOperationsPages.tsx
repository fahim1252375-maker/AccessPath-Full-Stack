import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Plus, RefreshCw, Shield } from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAppStore } from '../../store/useAppStore.ts';
import {
  Button,
  Card,
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
  AccessibilityReportDTO,
  AuditLogDTO,
  CampusIntegrationDTO,
  EmergencyRouteDTO,
  LocationNodeDTO,
  MaintenanceTaskDTO,
  PathEdgeDTO,
  UserRole,
} from '../../../../shared/types.ts';

export const AdminDashboardPage: React.FC = () => {
  const { selectedCampusId } = useAppStore();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard', selectedCampusId],
    queryFn: () =>
      api.get<{
        reportsTotal: number;
        pendingVerificationCount: number;
        openMaintenanceCount: number;
        blockedEdgesCount: number;
        usersCount: number;
        recentAuditLogs: AuditLogDTO[];
      }>(`/admin/dashboard?campusId=${selectedCampusId}`),
  });

  if (isLoading || !data) return <SkeletonRows rows={5} />;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-[var(--ap-text)]">Campus Administration Dashboard</h1>
            <HelpButton featureId="F115" label="Admin Dashboard Guide" />
          </div>
          <p className="text-sm text-[var(--ap-muted)] mt-1">
            Manage authoritative accessibility graph data, report verification, maintenance work orders, and campus alerts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/app/admin/reports"><Button size="sm">Manage Reports</Button></Link>
          <Link to="/app/admin/campus-editor"><Button size="sm" variant="secondary">Edit Campus Graph</Button></Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          ['Total Reports', data.reportsTotal],
          ['Pending Review', data.pendingVerificationCount],
          ['Open Maintenance', data.openMaintenanceCount],
          ['Blocked Paths', data.blockedEdgesCount],
          ['Campus Users', data.usersCount],
        ].map(([label, val]) => (
          <Card key={String(label)} padding="sm">
            <p className="text-xs text-[var(--ap-muted)]">{label}</p>
            <p className="text-2xl font-bold text-[var(--ap-text)] tabular-nums mt-1">{val}</p>
          </Card>
        ))}
      </div>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[var(--ap-text)]">Recent Administrative Audit Activity</h2>
          <Link to="/app/admin/audit-logs" className="text-xs font-semibold text-[#18C6AD] hover:underline">
            View Full Logs
          </Link>
        </div>
        <div className="divide-y divide-[var(--ap-border)] text-xs">
          {data.recentAuditLogs.slice(0, 8).map((log) => (
            <div key={log.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <span className="font-mono font-semibold text-[#18C6AD]">{log.action}</span> ·{' '}
                <span className="text-[var(--ap-text)]">{log.details}</span>
              </div>
              <span className="text-[var(--ap-muted)] tabular-nums">
                {log.actorEmail} · {new Date(log.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export const AdminReportsPage: React.FC = () => {
  const { selectedCampusId, user } = useAppStore();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<AccessibilityReportDTO | null>(null);
  const [status, setStatus] = useState('verified');
  const [edgeStatus, setEdgeStatus] = useState<'' | 'open' | 'blocked' | 'caution'>('');
  const [note, setNote] = useState('');

  const { data: reports, isLoading } = useQuery({
    queryKey: ['admin-reports', selectedCampusId],
    queryFn: () => api.get<AccessibilityReportDTO[]>(`/reports?campusId=${selectedCampusId}`),
  });

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    await api.patch(`/reports/${editing.id}`, {
      status,
      note,
      ...(edgeStatus ? { updateEdgeStatus: edgeStatus } : {}),
    });
    setEditing(null);
    setNote('');
    setEdgeStatus('');
    queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
  };

  if (isLoading) return <SkeletonRows rows={5} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[var(--ap-text)]">Barrier Report Moderation &amp; Verification</h1>
        <HelpButton featureId="F107" label="Moderation Guide" />
      </div>

      <Card padding="none" className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-[var(--ap-surface-2)] border-b border-[var(--ap-border)] text-xs text-[var(--ap-muted)]">
            <tr>
              <th className="px-4 py-3">Report</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--ap-border)]">
            {(reports || []).map((rep) => (
              <tr key={rep.id} className="hover:bg-[var(--ap-surface-2)]/70 transition-colors">
                <td className="px-4 py-3 font-semibold text-[#18C6AD]">
                  <Link to={`/app/reports/${rep.id}`} className="hover:underline">{rep.title}</Link>
                </td>
                <td className="px-4 py-3 text-[var(--ap-muted)]">{rep.locationLabel}</td>
                <td className="px-4 py-3 text-[var(--ap-text)]">{rep.category.replace(/_/g, ' ')}</td>
                <td className="px-4 py-3 capitalize text-[var(--ap-text)]">{rep.priority}</td>
                <td className="px-4 py-3"><StatusLabel status={rep.status} /></td>
                <td className="px-4 py-3 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditing(rep);
                      setStatus(rep.status);
                    }}
                  >
                    Review
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title="Review & Verify Report">
        <form onSubmit={handleUpdate} className="space-y-4">
          <FormField label="Authoritative Report Status" htmlFor="adm-rep-status">
            <Select id="adm-rep-status" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="pending_review">Pending Review</option>
              <option value="under_verification">Under Verification</option>
              <option value="verified">Verified</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
              <option value="duplicate">Duplicate</option>
            </Select>
          </FormField>

          {editing?.pathEdgeId && ['campus_admin', 'super_admin'].includes(user?.role || '') && (
            <FormField label="Update Linked Path Edge Status (Optional)" htmlFor="adm-edge-status">
              <Select
                id="adm-edge-status"
                value={edgeStatus}
                onChange={(e) => setEdgeStatus(e.target.value as any)}
              >
                <option value="">Do not change graph edge</option>
                <option value="blocked">Mark Path Blocked / Closed</option>
                <option value="caution">Mark Path Caution</option>
                <option value="open">Reopen Path as Verified Open</option>
              </Select>
            </FormField>
          )}

          <FormField label="Verification / Audit Note" htmlFor="adm-rep-note">
            <Textarea id="adm-rep-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </FormField>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit">Save Decision</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export const AdminCampusEditorPage: React.FC = () => {
  const { selectedCampusId } = useAppStore();
  const queryClient = useQueryClient();
  const [newNodeOpen, setNewNodeOpen] = useState(false);
  const [nodeName, setNodeName] = useState('');
  const [nodeType, setNodeType] = useState('facility');
  const [nodeLat, setNodeLat] = useState('23.7280');
  const [nodeLng, setNodeLng] = useState('90.3914');

  const [gisValidation, setGisValidation] = useState<any | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const [inspectMsg, setInspectMsg] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-campus-graph', selectedCampusId],
    queryFn: () =>
      api.get<{
        locations: LocationNodeDTO[];
        edges: PathEdgeDTO[];
        emergencyRoutes: EmergencyRouteDTO[];
      }>(`/campuses/${selectedCampusId}/map`),
  });

  const { data: trustData } = useQuery({
    queryKey: ['admin-campus-trust', selectedCampusId],
    queryFn: () =>
      api.get<{
        counts: Record<string, number>;
        edgeAssessments: Array<{
          edgeId: string;
          edgeName: string;
          trustState: string;
          daysSinceVerification: number | null;
          explanation: string;
        }>;
      }>(`/campuses/${selectedCampusId}/trust`),
  });

  const { data: versions } = useQuery({
    queryKey: ['admin-gis-versions', selectedCampusId],
    queryFn: () => api.get<any[]>(`/campuses/${selectedCampusId}/gis/versions`),
  });

  const toggleEdgeStatus = async (edge: PathEdgeDTO, nextStatus: 'open' | 'blocked' | 'caution') => {
    await api.patch(`/campuses/${selectedCampusId}/edges/${edge.id}`, {
      status: nextStatus,
      temporaryClosure: nextStatus === 'blocked',
      closureReason: nextStatus === 'open' ? '' : 'Updated by Campus Administrator in Graph Editor.',
      verificationStatus: 'verified',
    });
    queryClient.invalidateQueries({ queryKey: ['admin-campus-graph'] });
    queryClient.invalidateQueries({ queryKey: ['admin-campus-trust'] });
  };

  const toggleEdgeVerified = async (edge: PathEdgeDTO) => {
    await api.patch(`/campuses/${selectedCampusId}/edges/${edge.id}`, {
      verificationStatus: edge.verificationStatus === 'verified' ? 'unverified' : 'verified',
    });
    queryClient.invalidateQueries({ queryKey: ['admin-campus-graph'] });
    queryClient.invalidateQueries({ queryKey: ['admin-campus-trust'] });
  };

  const handleInspectEdge = async (edgeId: string) => {
    await api.post(`/verifications/edges/${edgeId}/inspect`, {
      expiryDays: 30,
      notes: 'Field re-inspection approved in Campus Graph Editor.',
    });
    setInspectMsg(`Segment ${edgeId} inspection renewed (+30 days).`);
    queryClient.invalidateQueries({ queryKey: ['admin-campus-trust'] });
    queryClient.invalidateQueries({ queryKey: ['admin-campus-graph'] });
  };

  const handleValidateGis = async () => {
    const rep = await api.get<any>(`/campuses/${selectedCampusId}/gis/validate`);
    setGisValidation(rep);
  };

  const handleExportGeoJson = async () => {
    const res = await fetch(`/api/v1/campuses/${selectedCampusId}/gis/export`, {
      credentials: 'include',
    });
    const text = await res.text();
    const blob = new Blob([text], { type: 'application/geo+json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accesspath-${selectedCampusId}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportGeoJson = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportMsg('');
    try {
      const parsed = JSON.parse(importText);
      const res = await api.post<{ graphVersion: number; importedNodes: number; importedEdges: number }>(
        `/campuses/${selectedCampusId}/gis/import`,
        {
          changeSummary: 'GeoJSON import via Campus Editor',
          geojson: parsed,
        }
      );
      setImportMsg(`Imported ${res.importedNodes} node(s) & ${res.importedEdges} edge(s). Graph now v${res.graphVersion}.`);
      setImportOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-campus-graph'] });
      queryClient.invalidateQueries({ queryKey: ['admin-gis-versions'] });
    } catch (err) {
      setImportMsg((err as Error).message);
    }
  };

  const handleAddNode = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post(`/campuses/${selectedCampusId}/locations`, {
      campusId: selectedCampusId,
      name: nodeName,
      type: nodeType,
      floor: 0,
      lat: Number(nodeLat),
      lng: Number(nodeLng),
      description: 'Added via Campus Graph Editor.',
      isAccessibleEntrance: true,
      hasElevator: false,
      hasAccessibleRestroom: false,
      hasRamp: true,
      verificationStatus: 'verified',
      facilities: ['Accessible Node'],
    });
    setNewNodeOpen(false);
    setNodeName('');
    queryClient.invalidateQueries({ queryKey: ['admin-campus-graph'] });
  };

  const toggleEmergencyApproval = async (er: EmergencyRouteDTO) => {
    await api.patch(`/campuses/${selectedCampusId}/emergency-routes/${er.id}/approve`, {
      adminApproved: !er.adminApproved,
    });
    queryClient.invalidateQueries({ queryKey: ['admin-campus-graph'] });
  };

  if (isLoading || !data) return <SkeletonRows rows={6} />;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-[var(--ap-text)]">Campus Graph, Path &amp; Closure Editor</h1>
            <HelpButton featureId="F116" label="Graph Editor Guide" />
          </div>
          <p className="text-sm text-[var(--ap-muted)] mt-1">
            Edit edge operational states, temporary closures, verification flags, and emergency route approvals. Changes immediately control Dijkstra routing.
          </p>
        </div>
        <Button onClick={() => setNewNodeOpen(true)}>
          <Plus className="w-4 h-4" />
          <span>Add Location Node</span>
        </Button>
      </div>

      <Card padding="none" className="overflow-x-auto">
        <div className="px-5 py-3 border-b border-[var(--ap-border)]">
          <h2 className="text-sm font-bold text-[var(--ap-text)]">Campus Path Edges ({data.edges.length})</h2>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-[var(--ap-surface-2)] border-b border-[var(--ap-border)] text-[var(--ap-muted)]">
            <tr>
              <th className="px-4 py-3">Edge Name</th>
              <th className="px-4 py-3">Metrics</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Verification</th>
              <th className="px-4 py-3 text-right">Quick Controls</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--ap-border)]">
            {data.edges.map((edge) => (
              <tr key={edge.id} className="hover:bg-[var(--ap-surface-2)]/70 transition-colors">
                <td className="px-4 py-3 font-semibold text-[var(--ap-text)]">
                  {edge.name}
                  {edge.hasStairs && <span className="text-[var(--ap-danger)] ml-1">(Stairs: {edge.stairCount})</span>}
                </td>
                <td className="px-4 py-3 font-mono tabular-nums text-[var(--ap-muted)]">
                  {edge.distanceMeters}m · {edge.widthMeters}m wide · {edge.slopePercent}% slope
                </td>
                <td className="px-4 py-3"><StatusLabel status={edge.status} /></td>
                <td className="px-4 py-3"><StatusLabel status={edge.verificationStatus} /></td>
                <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                  <Button size="sm" variant="outline" onClick={() => toggleEdgeStatus(edge, 'open')}>Open</Button>
                  <Button size="sm" variant="outline" onClick={() => toggleEdgeStatus(edge, 'caution')}>Caution</Button>
                  <Button size="sm" variant="danger" onClick={() => toggleEdgeStatus(edge, 'blocked')}>Block</Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleEdgeVerified(edge)}>Toggle Verified</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-base font-bold text-[var(--ap-text)]">Emergency Evacuation Route Approvals</h2>
        <div className="divide-y divide-[var(--ap-border)] text-xs">
          {data.emergencyRoutes.map((er) => (
            <div key={er.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="font-bold text-[var(--ap-text)]">{er.name}</p>
                <p className="text-[var(--ap-muted)]">{er.notes}</p>
              </div>
              <Button
                size="sm"
                variant={er.adminApproved ? 'outline' : 'secondary'}
                onClick={() => toggleEmergencyApproval(er)}
              >
                {er.adminApproved ? 'Revoke Approval' : 'Approve Emergency Route'}
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[var(--ap-text)]">Accessibility Trust &amp; Freshness Audit</h2>
            <p className="text-xs text-[var(--ap-muted)]">
              Segments approaching verification expiry or marked STALE/DISPUTED require human inspection. AI never certifies segments.
            </p>
          </div>
          {trustData && (
            <div className="text-xs text-[var(--ap-muted)] tabular-nums">
              Current: <strong className="text-[var(--ap-text)]">{trustData.counts.VERIFIED_CURRENT}</strong> · Expiring:{' '}
              <strong className="text-[var(--ap-text)]">{trustData.counts.VERIFICATION_EXPIRING}</strong> · Stale:{' '}
              <strong className="text-[var(--ap-text)]">{trustData.counts.STALE}</strong>
            </div>
          )}
        </div>
        {inspectMsg && <p className="text-xs font-semibold text-[var(--ap-ok)]">{inspectMsg}</p>}
        <div className="divide-y divide-[var(--ap-border)] text-xs">
          {(trustData?.edgeAssessments || [])
            .filter((a) => a.trustState !== 'VERIFIED_CURRENT')
            .slice(0, 8)
            .map((a) => (
              <div key={a.edgeId} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--ap-text)]">{a.edgeName}</span>
                    <StatusLabel status={a.trustState} />
                  </div>
                  <p className="text-[var(--ap-muted)] mt-0.5">{a.explanation}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleInspectEdge(a.edgeId)}>
                  Re-Verify Inspection (+30d)
                </Button>
              </div>
            ))}
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[var(--ap-text)]">GIS GeoJSON Tools &amp; Graph Versioning</h2>
            <p className="text-xs text-[var(--ap-muted)]">
              Export campus graph as GeoJSON FeatureCollection, run topological checks, or import versioned updates.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={handleValidateGis}>Validate Topology</Button>
            <Button size="sm" variant="outline" onClick={handleExportGeoJson}>Export GeoJSON</Button>
            <Button size="sm" variant="secondary" onClick={() => setImportOpen(true)}>Import GeoJSON</Button>
          </div>
        </div>
        {importMsg && <p className="text-xs font-semibold text-[var(--ap-ok)]">{importMsg}</p>}
        {gisValidation && (
          <div className="p-3 rounded-lg bg-[var(--ap-surface-2)] border border-[var(--ap-border)] text-xs space-y-1">
            <p className="font-bold text-[var(--ap-text)]">
              Validation Result: {gisValidation.valid ? 'Topological Integrity Passed' : 'Errors Detected'} ({gisValidation.stats.nodeCount} nodes, {gisValidation.stats.edgeCount} edges)
            </p>
            {gisValidation.warnings.length > 0 && (
              <p className="text-[var(--ap-warn)]">Warnings: {gisValidation.warnings.join(' · ')}</p>
            )}
            {gisValidation.errors.length > 0 && (
              <p className="text-[var(--ap-danger)]">Errors: {gisValidation.errors.join(' · ')}</p>
            )}
          </div>
        )}
        {versions && versions.length > 0 && (
          <div className="divide-y divide-[var(--ap-border)] text-xs">
            {versions.slice(0, 5).map((v) => (
              <div key={v.id} className="py-2 flex items-center justify-between">
                <span className="text-[var(--ap-text)]">
                  <strong>v{v.version}</strong> · {v.changeSummary} ({v.nodeCount} nodes / {v.edgeCount} edges)
                </span>
                <span className="text-[var(--ap-muted)] tabular-nums">{v.publishedBy} · {new Date(v.publishedAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={newNodeOpen} onClose={() => setNewNodeOpen(false)} title="Add Campus Location Node">
        <form onSubmit={handleAddNode} className="space-y-4">
          <FormField label="Location Name" htmlFor="node-name" required>
            <Input id="node-name" value={nodeName} onChange={(e) => setNodeName(e.target.value)} required />
          </FormField>
          <FormField label="Node Type" htmlFor="node-type">
            <Select id="node-type" value={nodeType} onChange={(e) => setNodeType(e.target.value)}>
              <option value="facility">Facility</option>
              <option value="entrance">Entrance</option>
              <option value="building">Building</option>
              <option value="ramp">Ramp</option>
              <option value="elevator">Elevator</option>
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Latitude" htmlFor="node-lat" required>
              <Input id="node-lat" value={nodeLat} onChange={(e) => setNodeLat(e.target.value)} required />
            </FormField>
            <FormField label="Longitude" htmlFor="node-lng" required>
              <Input id="node-lng" value={nodeLng} onChange={(e) => setNodeLng(e.target.value)} required />
            </FormField>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setNewNodeOpen(false)}>Cancel</Button>
            <Button type="submit">Create Node</Button>
          </div>
        </form>
      </Modal>

      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Import GeoJSON FeatureCollection">
        <form onSubmit={handleImportGeoJson} className="space-y-4">
          <FormField label="GeoJSON Payload" htmlFor="gis-import-json" required>
            <Textarea
              id="gis-import-json"
              rows={7}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='{"type":"FeatureCollection","features":[...]}'
              required
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button type="submit">Validate &amp; Import</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export const AdminMaintenancePage: React.FC = () => {
  const { selectedCampusId } = useAppStore();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [team, setTeam] = useState('Civil & Grounds Unit');
  const [priority, setPriority] = useState('high');

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['admin-maintenance', selectedCampusId],
    queryFn: () => api.get<MaintenanceTaskDTO[]>(`/admin/maintenance?campusId=${selectedCampusId}`),
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/admin/maintenance', {
      campusId: selectedCampusId,
      title,
      assignedTeam: team,
      priority,
    });
    setTitle('');
    queryClient.invalidateQueries({ queryKey: ['admin-maintenance'] });
  };

  const updateStatus = async (id: string, status: MaintenanceTaskDTO['status']) => {
    await api.patch(`/admin/maintenance/${id}`, { status });
    queryClient.invalidateQueries({ queryKey: ['admin-maintenance'] });
  };

  if (isLoading) return <SkeletonRows rows={4} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[var(--ap-text)]">Maintenance Work Orders</h1>
        <HelpButton featureId="F121" label="Maintenance Guide" />
      </div>

      <Card>
        <form onSubmit={handleCreate} className="grid sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-5">
            <FormField label="New Maintenance Task" htmlFor="mt-title" required>
              <Input
                id="mt-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Repair Science Hall west curb cut"
                required
              />
            </FormField>
          </div>
          <div className="sm:col-span-3">
            <FormField label="Assigned Team" htmlFor="mt-team">
              <Input id="mt-team" value={team} onChange={(e) => setTeam(e.target.value)} />
            </FormField>
          </div>
          <div className="sm:col-span-2">
            <FormField label="Priority" htmlFor="mt-prio">
              <Select id="mt-prio" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </Select>
            </FormField>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" className="w-full">Assign Task</Button>
          </div>
        </form>
      </Card>

      <div className="space-y-3">
        {(tasks || []).map((t) => (
          <Card key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-bold text-[var(--ap-text)]">{t.title}</p>
              <p className="text-xs text-[var(--ap-muted)] mt-0.5">
                Team: {t.assignedTeam} · Priority: {t.priority}
                {t.estimatedCompletionDate ? ` · ETA: ${t.estimatedCompletionDate}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <StatusLabel status={t.status} />
              {t.status !== 'completed' && (
                <>
                  <Button size="sm" variant="outline" onClick={() => updateStatus(t.id, 'in_progress')}>
                    In Progress
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => updateStatus(t.id, 'completed')}>
                    Mark Completed
                  </Button>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export const AdminUsersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get<any[]>('/admin/users'),
  });
  const { data: transfers } = useQuery({
    queryKey: ['admin-transfers'],
    queryFn: () => api.get<any[]>('/admin/transfer-requests'),
  });

  const updateUser = async (userId: string, patch: { role?: UserRole; isActive?: boolean }) => {
    await api.patch(`/admin/users/${userId}`, patch);
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  };

  const reviewTransfer = async (id: string, decision: 'approved' | 'rejected') => {
    await api.patch(`/admin/transfer-requests/${id}`, { decision });
    queryClient.invalidateQueries({ queryKey: ['admin-transfers'] });
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  };

  if (isLoading) return <SkeletonRows rows={4} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[var(--ap-text)]">Users, Volunteers &amp; RBAC Management</h1>
        <HelpButton featureId="F124" label="RBAC Guide" />
      </div>
      <Card padding="none" className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-[var(--ap-surface-2)] border-b border-[var(--ap-border)] text-xs text-[var(--ap-muted)]">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Manage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--ap-border)]">
            {(users || []).map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-semibold text-[var(--ap-text)]">{u.name}</td>
                <td className="px-4 py-3 text-[var(--ap-muted)]">{u.email}</td>
                <td className="px-4 py-3">
                  <select
                    aria-label={`Role for ${u.name}`}
                    value={u.role}
                    onChange={(e) => updateUser(u.id, { role: e.target.value as UserRole })}
                    className="px-2 py-1 text-xs border border-[var(--ap-border)] rounded bg-[var(--ap-surface-2)] text-[var(--ap-text)]"
                  >
                    <option value="student">Student</option>
                    <option value="volunteer">Volunteer</option>
                    <option value="moderator">Moderator</option>
                    <option value="campus_admin">Campus Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </td>
                <td className="px-4 py-3"><StatusLabel status={u.isActive ? 'active' : 'rejected'} /></td>
                <td className="px-4 py-3 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateUser(u.id, { isActive: !u.isActive })}
                  >
                    {u.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-base font-bold text-[var(--ap-text)]">Campus Transfer Requests</h2>
        {!transfers || transfers.length === 0 ? (
          <p className="text-xs text-[var(--ap-muted)]">No campus transfer requests queued.</p>
        ) : (
          <div className="divide-y divide-[var(--ap-border)] text-xs">
            {transfers.map((tr) => (
              <div key={tr.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-[var(--ap-text)]">
                    {tr.userEmail} · {tr.fromCampusId} &rarr; {tr.toCampusId}
                  </p>
                  <p className="text-[var(--ap-muted)]">{tr.reason}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusLabel status={tr.status} />
                  {tr.status === 'pending' && (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => reviewTransfer(tr.id, 'approved')}>
                        Approve
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => reviewTransfer(tr.id, 'rejected')}>
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export const AdminIntegrationsPage: React.FC = () => {
  const { selectedCampusId } = useAppStore();
  const queryClient = useQueryClient();
  const [testMessages, setTestMessages] = useState<Record<string, string>>({});
  const [annTitle, setAnnTitle] = useState('');
  const [annMsg, setAnnMsg] = useState('');
  const [annSaved, setAnnSaved] = useState(false);

  const { data: integrations, isLoading } = useQuery({
    queryKey: ['admin-integrations', selectedCampusId],
    queryFn: () =>
      api.get<CampusIntegrationDTO[]>(`/admin/integrations?campusId=${selectedCampusId}`),
  });

  const { data: observability } = useQuery({
    queryKey: ['admin-observability'],
    queryFn: () =>
      api.get<{
        services: Array<{ service: string; status: string; message: string }>;
        recentErrorCount: number;
        failedJobsCount: number;
      }>('/admin/system/observability'),
  });

  const handleTest = async (key: string) => {
    const res = await api.post<{ message: string; status: string }>(
      `/admin/integrations/${key}/test`,
      { campusId: selectedCampusId }
    );
    setTestMessages((prev) => ({ ...prev, [key]: res.message }));
    queryClient.invalidateQueries({ queryKey: ['admin-integrations'] });
  };

  const publishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/admin/announcements', {
      campusId: selectedCampusId,
      title: annTitle,
      message: annMsg,
      severity: 'warning',
    });
    setAnnTitle('');
    setAnnMsg('');
    setAnnSaved(true);
  };

  if (isLoading) return <SkeletonRows rows={5} />;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ap-text)]">Integrations, Readiness &amp; Announcements</h1>
          <p className="text-sm text-[var(--ap-muted)] mt-1">
            Inspect live vs. simulated integration adapters and service health readiness. AccessPath never claims unconfigured adapters are live.
          </p>
        </div>
        <HelpButton featureId="F144" label="Integrations Guide" />
      </div>

      {observability && (
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[var(--ap-text)]">Live Service Readiness Monitor</h2>
            <span className="text-xs text-[var(--ap-muted)] tabular-nums">
              5xx Errors Buffered: {observability.recentErrorCount} · Failed Jobs: {observability.failedJobsCount}
            </span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {observability.services.map((s) => (
              <div key={s.service} className="p-3 rounded-lg bg-[var(--ap-surface-2)] border border-[var(--ap-border)] space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-[var(--ap-text)]">{s.service}</span>
                  <StatusLabel status={s.status} />
                </div>
                <p className="text-[var(--ap-muted)]">{s.message}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(integrations || []).map((intg) => (
          <Card key={intg.id} className="flex flex-col justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-[var(--ap-text)]">{intg.name}</h2>
                <StatusLabel status={intg.connectionStatus} />
              </div>
              <p className="text-xs text-[var(--ap-muted)] font-medium">{intg.providerName} · Mode: {intg.mode}</p>
              <p className="text-xs text-[var(--ap-muted)]">{intg.description}</p>
              {testMessages[intg.key] && (
                <p className="text-xs text-[var(--ap-text)] bg-[var(--ap-surface-2)] p-2 rounded border border-[var(--ap-border)]">
                  {testMessages[intg.key]}
                </p>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={() => handleTest(intg.key)}>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Test Connection</span>
            </Button>
          </Card>
        ))}
      </div>

      <Card className="space-y-4">
        <h2 className="text-base font-bold text-[var(--ap-text)]">Publish Campus Announcement</h2>
        {annSaved && (
          <p className="text-xs text-[var(--ap-ok)] font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>Announcement broadcast to campus users.</span>
          </p>
        )}
        <form onSubmit={publishAnnouncement} className="space-y-3">
          <FormField label="Announcement Title" htmlFor="ann-title" required>
            <Input id="ann-title" value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} required />
          </FormField>
          <FormField label="Message" htmlFor="ann-msg" required>
            <Textarea id="ann-msg" rows={3} value={annMsg} onChange={(e) => setAnnMsg(e.target.value)} required />
          </FormField>
          <Button type="submit">Publish Campus Alert</Button>
        </form>
      </Card>
    </div>
  );
};

export const AdminAuditLogsPage: React.FC = () => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => api.get<AuditLogDTO[]>('/admin/audit-logs'),
  });

  if (isLoading) return <SkeletonRows rows={5} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#18C6AD]" />
          <h1 className="text-2xl font-bold text-[var(--ap-text)]">Activity Audit Logs</h1>
        </div>
        <HelpButton featureId="F126" label="Audit Logs Guide" />
      </div>

      <Card padding="none" className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[var(--ap-surface-2)] border-b border-[var(--ap-border)] text-[var(--ap-muted)]">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--ap-border)]">
            {(logs || []).map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-2.5 font-mono tabular-nums text-[var(--ap-muted)]">
                  {new Date(l.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-[var(--ap-text)]">{l.actorEmail}</td>
                <td className="px-4 py-2.5 text-[var(--ap-text)]">{l.actorRole}</td>
                <td className="px-4 py-2.5 font-mono font-semibold text-[#18C6AD]">{l.action}</td>
                <td className="px-4 py-2.5 text-[var(--ap-muted)]">{l.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};
