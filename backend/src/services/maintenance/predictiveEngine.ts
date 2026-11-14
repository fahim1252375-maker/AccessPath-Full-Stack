import type {
  BuildingDTO,
  EquipmentIncidentDTO,
  MaintenanceTaskDTO,
} from '../../../../shared/types.ts';

export interface BuildingRiskAssessment {
  buildingId: string;
  buildingName: string;
  buildingCode: string;
  incidentCount: number;
  openTasksCount: number;
  mttrHours: number | null;
  slaCompliancePercent: number | null;
  riskScore: number;
  riskLevel: 'low' | 'moderate' | 'elevated' | 'critical';
  recurringIssues: string[];
  forecastNote: string;
  sufficientHistoricalData: boolean;
}

export interface PredictiveMaintenanceOverview {
  totalIncidents: number;
  resolvedIncidents: number;
  overallMttrHours: number | null;
  overallSlaCompliancePercent: number | null;
  buildingRisks: BuildingRiskAssessment[];
  recurringPatterns: Array<{ equipmentName: string; count: number; latestCause: string }>;
  methodologyNote: string;
}

export function computePredictiveMaintenanceOverview(
  buildings: BuildingDTO[],
  incidents: EquipmentIncidentDTO[],
  tasks: MaintenanceTaskDTO[]
): PredictiveMaintenanceOverview {
  const resolved = incidents.filter((i) => typeof i.durationMinutes === 'number' && i.resolvedAt);
  const overallMttrHours =
    resolved.length > 0
      ? Number(
          (
            resolved.reduce((acc, i) => acc + (i.durationMinutes || 0), 0) /
            resolved.length /
            60
          ).toFixed(1)
        )
      : null;

  const slaEvaluated = incidents.filter((i) => typeof i.slaMet === 'boolean');
  const overallSlaCompliancePercent =
    slaEvaluated.length > 0
      ? Math.round((slaEvaluated.filter((i) => i.slaMet).length / slaEvaluated.length) * 100)
      : null;

  // Detect recurring equipment issues (>= 2 incidents on same equipment)
  const equipGroups = new Map<string, EquipmentIncidentDTO[]>();
  for (const inc of incidents) {
    const arr = equipGroups.get(inc.equipmentName) || [];
    arr.push(inc);
    equipGroups.set(inc.equipmentName, arr);
  }
  const recurringPatterns = Array.from(equipGroups.entries())
    .filter(([, list]) => list.length >= 2)
    .map(([equipmentName, list]) => {
      const sorted = [...list].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
      return {
        equipmentName,
        count: list.length,
        latestCause: sorted[0].rootCause,
      };
    });

  const buildingRisks: BuildingRiskAssessment[] = buildings.map((b) => {
    const bInc = incidents.filter((i) => i.buildingId === b.id);
    const bResolved = bInc.filter((i) => typeof i.durationMinutes === 'number' && i.resolvedAt);
    const mttrHours =
      bResolved.length > 0
        ? Number(
            (
              bResolved.reduce((acc, i) => acc + (i.durationMinutes || 0), 0) /
              bResolved.length /
              60
            ).toFixed(1)
          )
        : null;

    const bSla = bInc.filter((i) => typeof i.slaMet === 'boolean');
    const slaCompliancePercent =
      bSla.length > 0
        ? Math.round((bSla.filter((i) => i.slaMet).length / bSla.length) * 100)
        : null;

    const openTasksCount = tasks.filter(
      (t) =>
        t.status !== 'completed' &&
        t.status !== 'deferred' &&
        (t.title.toLowerCase().includes(b.name.toLowerCase()) ||
          bInc.some((inc) => inc.edgeId && inc.edgeId === t.edgeId))
    ).length;

    const recurringIssues: string[] = [];
    for (const [eqName, list] of equipGroups.entries()) {
      if (list.some((i) => i.buildingId === b.id) && list.length >= 2) {
        recurringIssues.push(`${eqName} (${list.length} failures logged)`);
      }
    }

    const sufficientHistoricalData = bInc.length >= 2;
    let riskScore = 15 + bInc.length * 14 + openTasksCount * 16 + recurringIssues.length * 18;
    if (slaCompliancePercent !== null && slaCompliancePercent < 70) {
      riskScore += 18;
    }
    riskScore = Math.min(100, riskScore);

    const riskLevel: BuildingRiskAssessment['riskLevel'] =
      riskScore >= 75
        ? 'critical'
        : riskScore >= 50
        ? 'elevated'
        : riskScore >= 30
        ? 'moderate'
        : 'low';

    const forecastNote = sufficientHistoricalData
      ? recurringIssues.length > 0
        ? `Elevated preventive maintenance priority due to recurring faults: ${recurringIssues.join('; ')}.`
        : `${bInc.length} recorded incident(s); average repair MTTR ${mttrHours ?? 'N/A'}h.`
      : 'Insufficient historical incident samples for failure forecasting (< 2 recorded incidents). Monitoring baseline checks.';

    return {
      buildingId: b.id,
      buildingName: b.name,
      buildingCode: b.code,
      incidentCount: bInc.length,
      openTasksCount,
      mttrHours,
      slaCompliancePercent,
      riskScore,
      riskLevel,
      recurringIssues,
      forecastNote,
      sufficientHistoricalData,
    };
  });

  buildingRisks.sort((a, b) => b.riskScore - a.riskScore);

  return {
    totalIncidents: incidents.length,
    resolvedIncidents: resolved.length,
    overallMttrHours,
    overallSlaCompliancePercent,
    buildingRisks,
    recurringPatterns,
    methodologyNote:
      'Explainable risk indicators derived strictly from recorded EquipmentIncidents and open MaintenanceTasks. Forecasts remain disabled where fewer than 2 historical incidents exist.',
  };
}
