import { Router } from 'express';
import { db } from '../repositories/db.ts';
import { authenticate, optionalAuthenticate } from '../middleware/auth.ts';
import { computePredictiveMaintenanceOverview } from '../services/maintenance/predictiveEngine.ts';
import { computeBuildingTrustCoverage } from '../services/trust/trustEngine.ts';
import type {
  AccessibilityReportDTO,
  BuildingDTO,
  CampusDTO,
  EquipmentIncidentDTO,
  LocationNodeDTO,
  MaintenanceTaskDTO,
  PathEdgeDTO,
} from '../../../shared/types.ts';

export const analyticsRouter = Router();

function computeMetrics(params: {
  campus: CampusDTO | null;
  buildings: BuildingDTO[];
  locations: LocationNodeDTO[];
  edges: PathEdgeDTO[];
  reports: AccessibilityReportDTO[];
  tasks: MaintenanceTaskDTO[];
  incidents: EquipmentIncidentDTO[];
}) {
  const { campus, buildings, locations, edges, reports, tasks, incidents } = params;
  const totalReports = reports.length;
  const pendingReports = reports.filter((r) =>
    ['submitted', 'ai_classified', 'pending_review', 'under_verification'].includes(r.status)
  ).length;
  const verifiedBarriers = reports.filter((r) =>
    ['verified', 'assigned', 'in_progress'].includes(r.status)
  ).length;
  const resolvedIssues = reports.filter((r) => r.status === 'resolved').length;

  const demoCount = reports.filter((r) => r.isDemoData).length;
  const operationalCount = reports.length - demoCount;

  const resolvedDurations = reports
    .filter((r) => r.status === 'resolved')
    .map((r) => {
      const start = new Date(r.createdAt).getTime();
      const end = new Date(r.updatedAt).getTime();
      return Math.max(1, (end - start) / 3600_000);
    });
  const avgResolutionHours =
    resolvedDurations.length > 0
      ? Number(
          (resolvedDurations.reduce((a, b) => a + b, 0) / resolvedDurations.length).toFixed(1)
        )
      : 0;

  const categoryMap: Record<string, number> = {};
  for (const r of reports) {
    categoryMap[r.category] = (categoryMap[r.category] || 0) + 1;
  }
  const byCategory = Object.entries(categoryMap).map(([category, count]) => ({
    category,
    label: category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    count,
  }));

  const statusMap: Record<string, number> = {};
  for (const r of reports) {
    statusMap[r.status] = (statusMap[r.status] || 0) + 1;
  }
  const byStatus = Object.entries(statusMap).map(([status, count]) => ({ status, count }));

  const buildingScores = buildings.map((b) => {
    const bReports = reports.filter((r) => r.buildingId === b.id && r.status !== 'resolved');
    let score = 40;
    if (b.hasAccessibleEntrance) score += 25;
    if (b.hasElevator || b.floors === 1) score += 20;
    if (b.hasAccessibleRestroom) score += 15;
    score = Math.max(10, score - bReports.length * 10);
    return {
      buildingId: b.id,
      name: b.name,
      code: b.code,
      score,
      openBarriers: bReports.length,
      hasElevator: b.hasElevator,
      hasAccessibleEntrance: b.hasAccessibleEntrance,
      isDemoData: b.isDemoData,
    };
  });

  const verifiedEdges = edges.filter((e) => e.verificationStatus === 'verified');
  const accessibleOpenEdges = verifiedEdges.filter((e) => e.status === 'open' && !e.hasStairs);
  const blockedEdges = edges.filter((e) => e.status === 'blocked' || e.temporaryClosure);

  const heatmapPoints = reports
    .filter((r) => typeof r.lat === 'number' && typeof r.lng === 'number')
    .map((r) => ({
      id: r.id,
      lat: r.lat!,
      lng: r.lng!,
      locationLabel: r.locationLabel,
      priority: r.priority,
      status: r.status,
      weight: r.priority === 'critical' ? 4 : r.priority === 'high' ? 3 : 2,
    }));

  const sufficientHistory = reports.length >= 5 && edges.length >= 10;
  const predictiveInsights = sufficientHistory
    ? [
        ...edges
          .filter((e) => e.status === 'caution' || e.surface === 'brick_paver' || e.lighting === 'poor')
          .slice(0, 3)
          .map((e) => ({
            targetId: e.id,
            targetName: e.name,
            riskLevel: e.status === 'caution' ? 'elevated' : 'moderate',
            rationale:
              e.status === 'caution'
                ? 'Active caution surface condition with prior barrier reports.'
                : `Surface (${e.surface}) or lighting (${e.lighting}) warrants scheduled inspection.`,
            isEstimate: true,
          })),
      ]
    : [];

  const trustCoverage = computeBuildingTrustCoverage(buildings, locations, edges, reports);
  const predictiveMaintenance2 = computePredictiveMaintenanceOverview(buildings, incidents, tasks);

  return {
    campusId: campus?.id || '',
    campusName: campus?.name || 'Campus',
    isDemoData: Boolean(campus?.isDemoData),
    dataProvenance: {
      demoRecords: demoCount,
      operationalRecords: operationalCount,
      disclaimer:
        'Analytics are computed directly from database records. Seeded demo records are explicitly separated from live operational data.',
    },
    totals: {
      totalReports,
      pendingReports,
      verifiedBarriers,
      resolvedIssues,
      avgResolutionHours,
      buildingsCount: buildings.length,
      locationsCount: locations.length,
      edgesCount: edges.length,
      verifiedStepFreeEdgesCount: accessibleOpenEdges.length,
      blockedEdgesCount: blockedEdges.length,
      activeMaintenanceTasks: tasks.filter((t) => t.status !== 'completed').length,
      campusAccessibilityIndex:
        buildingScores.length > 0
          ? Math.round(
              buildingScores.reduce((acc, b) => acc + b.score, 0) / buildingScores.length
            )
          : 0,
    },
    byCategory,
    byStatus,
    buildingScores,
    heatmapPoints,
    trustCoverage,
    predictiveMaintenance2,
    predictiveInsights: {
      sufficientHistory,
      minimumRequiredReports: 5,
      note: 'Predictive insights are statistical estimates based on recorded barrier history and edge conditions, not certified failure forecasts.',
      items: predictiveInsights,
    },
  };
}

analyticsRouter.get('/overview', optionalAuthenticate, async (req, res) => {
  const requestedCampus = typeof req.query.campusId === 'string' && req.query.campusId ? req.query.campusId : null;
  if (req.auth && req.auth.role !== 'super_admin' && requestedCampus && requestedCampus !== req.auth.campusId) {
    res.status(403).json({
      success: false,
      error: 'Forbidden: cross-campus operational analytics access is restricted to Super Administrators',
    });
    return;
  }

  const campusId = requestedCampus || req.auth?.campusId || 'campus_demo_north';

  const [campus, buildings, locations, edges, reports, tasks, incidents] = await Promise.all([
    db.findOne<CampusDTO>('campuses', { id: campusId }),
    db.find<BuildingDTO>('buildings', { campusId }),
    db.find<LocationNodeDTO>('locations', { campusId }),
    db.find<PathEdgeDTO>('pathEdges', { campusId }),
    db.find<AccessibilityReportDTO>('accessibilityReports', { campusId }),
    db.find<MaintenanceTaskDTO>('maintenanceTasks', { campusId }),
    db.find<EquipmentIncidentDTO>('equipmentIncidents', { campusId }),
  ]);

  let filteredReports = reports;
  if (typeof req.query.category === 'string' && req.query.category) {
    filteredReports = filteredReports.filter((r: AccessibilityReportDTO) => r.category === req.query.category);
  }
  if (typeof req.query.buildingId === 'string' && req.query.buildingId) {
    filteredReports = filteredReports.filter((r: AccessibilityReportDTO) => r.buildingId === req.query.buildingId);
  }

  res.json({
    success: true,
    data: computeMetrics({
      campus,
      buildings,
      locations,
      edges,
      reports: filteredReports,
      tasks,
      incidents,
    }),
  });
});

analyticsRouter.get('/export', authenticate, async (req, res) => {
  const requestedCampus = typeof req.query.campusId === 'string' && req.query.campusId ? req.query.campusId : null;
  if (req.auth!.role !== 'super_admin' && requestedCampus && requestedCampus !== req.auth!.campusId) {
    res.status(403).json({
      success: false,
      error: 'Forbidden: cross-campus CSV export is restricted to Super Administrators',
    });
    return;
  }
  const campusId = requestedCampus || req.auth!.campusId;
  const reports = await db.find<AccessibilityReportDTO>('accessibilityReports', { campusId });

  const header = [
    'ID',
    'Title',
    'Category',
    'Priority',
    'Status',
    'Location',
    'Upvotes',
    'DemoSeedData',
    'CreatedAt',
    'UpdatedAt',
  ].join(',');

  const escapeCsv = (val: unknown) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const rows = reports.map((r) =>
    [
      r.id,
      r.title,
      r.category,
      r.priority,
      r.status,
      r.locationLabel,
      r.upvotes,
      r.isDemoData ? 'YES' : 'NO',
      r.createdAt,
      r.updatedAt,
    ]
      .map(escapeCsv)
      .join(',')
  );

  const csv = [header, ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="accesspath-reports-${campusId}.csv"`);
  res.send(csv);
});
