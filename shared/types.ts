export type UserRole =
  | 'student'
  | 'volunteer'
  | 'moderator'
  | 'campus_admin'
  | 'super_admin';

export type ReportStatus =
  | 'submitted'
  | 'ai_classified'
  | 'pending_review'
  | 'under_verification'
  | 'verified'
  | 'assigned'
  | 'in_progress'
  | 'resolved'
  | 'rejected'
  | 'disputed'
  | 'duplicate';

export type ReportCategory =
  | 'broken_ramp'
  | 'missing_ramp'
  | 'blocked_walkway'
  | 'damaged_pavement'
  | 'broken_elevator'
  | 'missing_accessible_entrance'
  | 'stairs_only_access'
  | 'insufficient_lighting'
  | 'narrow_passage'
  | 'construction_obstruction'
  | 'other';

export type ReportPriority = 'low' | 'medium' | 'high' | 'critical';

export type NodeType =
  | 'entrance'
  | 'building'
  | 'classroom'
  | 'corridor'
  | 'intersection'
  | 'elevator'
  | 'ramp'
  | 'facility';

export type SurfaceType =
  | 'smooth_concrete'
  | 'asphalt'
  | 'brick_paver'
  | 'tactile_tile'
  | 'cobblestone'
  | 'unpaved_rough';

export type VerificationStatus =
  | 'verified'
  | 'unverified'
  | 'unknown'
  | 'disputed';

export type TrustState =
  | 'VERIFIED_CURRENT'
  | 'VERIFICATION_EXPIRING'
  | 'STALE'
  | 'UNVERIFIED'
  | 'DISPUTED'
  | 'BLOCKED'
  | 'UNKNOWN';

export type LightingQuality = 'well_lit' | 'moderate' | 'poor' | 'unknown';

export interface AccessibilityPreferences {
  wheelchairMode: boolean;
  stepFreeMode: boolean;
  limitedMobilityMode: boolean;
  rampRequired: boolean;
  elevatorRequired: boolean;
  stairsAvoidance: boolean;
  smoothSurfacePreference: boolean;
  widePathPreference: boolean;
  lowGradientPreference: boolean;
  wellLitPreference: boolean;
  visualAssistanceMode: boolean;
  customNotes: string;
}

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  campusId: string;
  institutionId: string;
  emailVerified: boolean;
  consentAnalytics: boolean;
  consentLocation: boolean;
  language: 'en' | 'bn';
  isActive: boolean;
  isDemoAccount?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserSessionDTO {
  id: string;
  jti: string;
  userId: string;
  revoked: boolean;
  revokedReason?: string;
  expiresAt: string;
  createdAt: string;
}

export interface CampusTransferRequestDTO {
  id: string;
  userId: string;
  userEmail: string;
  fromCampusId: string;
  toCampusId: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface InstitutionDTO {
  id: string;
  name: string;
  code: string;
  country: string;
  contactEmail: string;
  isDemoData: boolean;
  status: 'active' | 'suspended';
  createdAt: string;
}

export interface CampusDTO {
  id: string;
  institutionId: string;
  name: string;
  shortCode: string;
  city: string;
  description: string;
  centerLat: number;
  centerLng: number;
  defaultZoom: number;
  graphVersion?: number;
  isDemoData: boolean;
  demoBannerText?: string;
  accessibilityScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface BuildingDTO {
  id: string;
  campusId: string;
  name: string;
  code: string;
  category: 'academic' | 'library' | 'laboratory' | 'student_services' | 'medical' | 'dining' | 'auditorium';
  floors: number;
  hasElevator: boolean;
  hasAccessibleEntrance: boolean;
  hasAccessibleRestroom: boolean;
  accessibilitySummary: string;
  lat: number;
  lng: number;
  verificationStatus: VerificationStatus;
  isDemoData: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LocationNodeDTO {
  id: string;
  campusId: string;
  buildingId?: string;
  corridorId?: string;
  roomNumber?: string;
  name: string;
  nameBn?: string;
  code?: string;
  type: NodeType;
  floor: number;
  lat: number;
  lng: number;
  svgX?: number;
  svgY?: number;
  description: string;
  isAccessibleEntrance: boolean;
  hasElevator: boolean;
  hasAccessibleRestroom: boolean;
  hasRamp: boolean;
  isEmergencyExit?: boolean;
  qrCodeId?: string;
  beaconId?: string;
  verificationStatus: VerificationStatus;
  lastVerifiedAt?: string;
  verificationExpiresAt?: string;
  facilities: string[];
  isDemoData: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PathEdgeDTO {
  id: string;
  campusId: string;
  fromNodeId: string;
  toNodeId: string;
  bidirectional: boolean;
  name: string;
  distanceMeters: number;
  widthMeters: number;
  surface: SurfaceType;
  hasStairs: boolean;
  stairCount: number;
  rampAvailable: boolean;
  rampVerified: boolean;
  slopePercent: number;
  elevatorAvailable: boolean;
  elevatorOperational: boolean;
  lighting: LightingQuality;
  status: 'open' | 'blocked' | 'caution';
  temporaryClosure: boolean;
  closureReason?: string;
  verificationStatus: VerificationStatus;
  lastVerifiedAt?: string;
  verificationExpiresAt?: string;
  verifiedByRole?: UserRole;
  verificationSource?: string;
  indoorFloorTransition?: boolean;
  isDemoData: boolean;
  createdAt: string;
  updatedAt: string;
}


export type GraphSimulationAction = 'fixed' | 'closed' | 'ramp_added';

export interface GraphSimulationRoutePairDTO {
  fromNodeId: string;
  toNodeId: string;
}

export interface GraphSimulationRouteChangeDTO {
  fromNodeId: string;
  toNodeId: string;
  beforeFound: boolean;
  afterFound: boolean;
  beforeDistanceMeters: number | null;
  afterDistanceMeters: number | null;
  beforeRouteEdgeIds: string[];
  afterRouteEdgeIds: string[];
}

export interface GraphSimulationResultDTO {
  simulationOnly: true;
  simulatedAt: string;
  campusId: string;
  edgeId: string;
  action: GraphSimulationAction;
  verificationPreserved: true;
  unlockedRoutes: GraphSimulationRouteChangeDTO[];
  lostRoutes: GraphSimulationRouteChangeDTO[];
  unchangedRoutes: GraphSimulationRouteChangeDTO[];
  buildingsAffected: Array<{ id: string; name: string }>;
  changes: {
    before: Pick<PathEdgeDTO, 'status' | 'temporaryClosure' | 'rampAvailable' | 'rampVerified' | 'verificationStatus'>;
    after: Pick<PathEdgeDTO, 'status' | 'temporaryClosure' | 'rampAvailable' | 'rampVerified' | 'verificationStatus'>;
  };
  notes: string[];
}

export interface RouteStepDTO {
  edgeId: string;
  fromNodeId: string;
  fromName: string;
  toNodeId: string;
  toName: string;
  instruction: string;
  distanceMeters: number;
  estimatedMinutes: number;
  surface: SurfaceType;
  slopePercent: number;
  hasRamp: boolean;
  hasElevator: boolean;
  hasStairs: boolean;
  lighting: LightingQuality;
  verificationStatus: VerificationStatus;
  trustState?: TrustState;
  lastVerifiedAt?: string;
  warnings: string[];
}

export interface RouteFreshnessSummary {
  overallTrustState: TrustState;
  verifiedSegmentsCount: number;
  expiringSegmentsCount: number;
  staleSegmentsCount: number;
  unverifiedSegmentsCount: number;
  disputedSegmentsCount: number;
  conflictingReportsCount: number;
  oldestInspectionAt?: string;
  newestInspectionAt?: string;
}

export interface CalculatedRouteDTO {
  id: string;
  label: string;
  isPrimary: boolean;
  totalDistanceMeters: number;
  estimatedMinutes: number;
  isEstimate: boolean;
  algorithmUsed?: 'dijkstra' | 'astar';
  confidenceScore?: number;
  diversityScore?: number;
  nodeIds: string[];
  edgeIds: string[];
  coordinates: [number, number][];
  steps: RouteStepDTO[];
  reasons: string[];
  warnings: string[];
  verificationSummary: 'all_verified' | 'contains_caution' | 'unverified_included' | 'contains_stale';
  trustSummary?: RouteFreshnessSummary;
  constraintsApplied: string[];
}

export interface RouteCalculationResultDTO {
  found: boolean;
  campusId: string;
  fromNodeId: string;
  toNodeId: string;
  graphVersion?: number;
  reasonCode?: 'NO_VERIFIED_ACCESSIBLE_ROUTE' | 'SAME_ORIGIN_DESTINATION' | 'NODE_NOT_FOUND';
  message: string;
  blockingFactors: string[];
  routes: CalculatedRouteDTO[];
  calculatedAt: string;
}

export interface AIClassificationDTO {
  category: ReportCategory;
  location: string;
  description: string;
  accessibilityImpact: string;
  suggestedPriority: ReportPriority;
  confidence: number;
  requiresHumanVerification: true;
  summary: string;
  suggestedAction: string;
  missingInformation?: string[];
  detectedLanguage: 'en' | 'bn' | 'mixed';
  provider: 'gemini' | 'mock';
}

export interface AIAssistantSourceDTO {
  type: 'location' | 'edge' | 'facility' | 'report' | 'floor_plan';
  label: string;
  verifiedAt?: string;
}

export interface AIAssistantResponseDTO {
  reply: string;
  language: 'en' | 'bn' | 'mixed';
  suggestedLocationIds: string[];
  suggestedRouteTarget?: { fromNodeId: string; toNodeId: string };
  calculatedRoute?: CalculatedRouteDTO | null;
  routeFound?: boolean;
  appliedConstraints?: string[];
  blockingFactors?: string[];
  missingInformation?: string[];
  sources?: AIAssistantSourceDTO[];
  provider: 'gemini' | 'mock';
}

export interface AIAnalyticsQAResponseDTO {
  answer: string;
  highlights: string[];
  recommendedActions: string[];
  metricsSnapshot: {
    totalReports: number;
    openReports: number;
    resolvedReports: number;
    blockedEdges: number;
    staleSegments: number;
  };
  disclaimer: string;
  provider: 'gemini' | 'mock';
}

export interface ReportStatusEvent {
  status: ReportStatus;
  note: string;
  actorRole: UserRole | 'system';
  timestamp: string;
}

export interface ReportCommentDTO {
  id: string;
  authorLabel: string;
  authorRole: UserRole;
  content: string;
  createdAt: string;
}

export interface AccessibilityReportDTO {
  id: string;
  campusId: string;
  buildingId?: string;
  locationNodeId?: string;
  pathEdgeId?: string;
  clientRequestId?: string;
  reporterId: string;
  reporterAlias: string;
  title: string;
  description: string;
  language: 'en' | 'bn';
  category: ReportCategory;
  priority: ReportPriority;
  status: ReportStatus;
  lat?: number;
  lng?: number;
  locationLabel: string;
  evidenceUrls: string[];
  aiClassification?: AIClassificationDTO;
  upvotes: number;
  upvoterIds: string[];
  duplicateOfId?: string;
  assignedToId?: string;
  timeline: ReportStatusEvent[];
  comments: ReportCommentDTO[];
  resolutionFeedback?: {
    resolvedConfirmed: boolean;
    rating: number;
    comment: string;
    submittedAt: string;
  };
  isDemoData: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VerificationRecordDTO {
  id: string;
  campusId: string;
  reportId: string;
  edgeId?: string;
  verifierId: string;
  verifierRole: UserRole;
  decision: 'confirmed' | 'rejected' | 'needs_more_evidence' | 'resolved_confirmed';
  notes: string;
  evidenceUrls: string[];
  appliedToGraph: boolean;
  createdAt: string;
}

export interface MaintenanceTaskDTO {
  id: string;
  campusId: string;
  reportId?: string;
  edgeId?: string;
  locationNodeId?: string;
  title: string;
  description: string;
  priority: ReportPriority;
  status: 'open' | 'assigned' | 'in_progress' | 'completed' | 'deferred';
  assignedTeam: string;
  slaTargetHours?: number;
  estimatedCompletionDate?: string;
  completedAt?: string;
  isDemoData: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationDTO {
  id: string;
  userId: string;
  campusId: string;
  type: 'report_status' | 'verification' | 'route_alert' | 'closure' | 'maintenance' | 'announcement';
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface AnnouncementDTO {
  id: string;
  campusId: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'urgent';
  authorName: string;
  active: boolean;
  createdAt: string;
}

export interface CampusIntegrationDTO {
  id: string;
  campusId: string;
  key:
    | 'gemini_ai'
    | 'image_storage'
    | 'email_delivery'
    | 'browser_geolocation'
    | 'map_tiles'
    | 'qr_scanner'
    | 'bluetooth_beacon'
    | 'elevator_status'
    | 'institutional_api'
    | 'push_notifications'
    | 'ar_navigation'
    | 'sensor_monitoring';
  name: string;
  providerName: string;
  mode: 'live' | 'demo' | 'unconfigured' | 'hardware_dependent';
  connectionStatus: 'connected' | 'simulated' | 'not_configured' | 'error';
  configured: boolean;
  lastSyncAt?: string;
  lastError?: string;
  description: string;
}

export interface AuditLogDTO {
  id: string;
  campusId?: string;
  actorId: string;
  actorEmail: string;
  actorRole: UserRole;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  createdAt: string;
}

export interface EmergencyRouteDTO {
  id: string;
  campusId: string;
  name: string;
  fromBuildingId: string;
  floorNumber?: number;
  assemblyPointName: string;
  assemblyLat?: number;
  assemblyLng?: number;
  wheelchairCompatible?: boolean;
  alternativeRouteIds?: string[];
  nodeIds: string[];
  edgeIds: string[];
  adminApproved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  notes: string;
  isDemoData: boolean;
}

// Phase 2 — Accessibility Trust & Freshness Engine
export interface EdgeTrustAssessment {
  edgeId: string;
  edgeName: string;
  trustState: TrustState;
  lastVerifiedAt?: string;
  verificationExpiresAt?: string;
  daysSinceVerification: number | null;
  conflictingReportsCount: number;
  conflictingReportIds: string[];
  requiresHumanReview: boolean;
  explanation: string;
}

export interface BuildingTrustCoverage {
  buildingId: string;
  buildingName: string;
  buildingCode: string;
  totalEdges: number;
  verifiedCurrentCount: number;
  expiringCount: number;
  staleCount: number;
  disputedCount: number;
  coveragePercent: number;
}

// Phase 3 — Indoor Navigation
export interface FloorPlanDTO {
  id: string;
  campusId: string;
  buildingId: string;
  floorNumber: number;
  floorLabel: string;
  svgWidth: number;
  svgHeight: number;
  corridors: Array<{ id: string; name: string; points: Array<[number, number]>; accessible: boolean; widthMeters: number }>;
  rooms: Array<{ id: string; nodeId: string; label: string; x: number; y: number; w: number; h: number; accessible: boolean }>;
  qrWaypoints: Array<{ code: string; nodeId: string; label: string; x: number; y: number }>;
  bleBeacons: Array<{ uuid: string; nodeId: string; label: string; x: number; y: number; simulated: boolean }>;
  isDemoData: boolean;
}

// Phase 4 — Live Campus Accessibility Status
export type FacilityType =
  | 'elevator'
  | 'restroom'
  | 'entrance_door'
  | 'auto_door'
  | 'ramp'
  | 'construction_zone'
  | 'temporary_barrier'
  | 'pathway';

export type FacilityOperationalStatus = 'operational' | 'degraded' | 'outage' | 'closed' | 'unknown';

export interface LiveFacilityStatusDTO {
  id: string;
  campusId: string;
  buildingId?: string;
  locationNodeId?: string;
  edgeId?: string;
  facilityType: FacilityType;
  name: string;
  status: FacilityOperationalStatus;
  source: string;
  authorityVerified: boolean;
  providerStatus: 'live' | 'demo_simulated' | 'unconfigured';
  lastSyncAt: string;
  notes?: string;
  isDemoData: boolean;
  updatedAt: string;
}

export interface FacilitySubscriptionDTO {
  id: string;
  userId: string;
  campusId: string;
  facilityId: string;
  channel: 'in_app' | 'web_push';
  pushEndpoint?: string;
  createdAt: string;
}

// Phase 5 — AI Smart Class Schedule Planner
export interface ClassScheduleItemDTO {
  id: string;
  userId: string;
  campusId: string;
  courseCode: string;
  courseTitle: string;
  dayOfWeek: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  buildingId: string;
  locationNodeId: string;
  roomLabel: string;
  bufferMinutes: number;
  createdAt: string;
}

export interface DayPlanTransitionDTO {
  fromClassId?: string;
  toClassId: string;
  fromLocationName: string;
  toLocationName: string;
  recommendedDepartureTime: string;
  classStartTime: string;
  availableMinutes: number;
  estimatedTravelMinutes: number;
  bufferMinutes: number;
  routeFound: boolean;
  tightScheduleWarning?: string;
  routeResult: RouteCalculationResultDTO;
}

// Phase 8 — Predictive Maintenance 2.0
export interface EquipmentIncidentDTO {
  id: string;
  campusId: string;
  buildingId: string;
  facilityId?: string;
  edgeId?: string;
  equipmentName: string;
  startedAt: string;
  resolvedAt?: string;
  durationMinutes?: number;
  severity: ReportPriority;
  slaTargetHours: number;
  slaMet?: boolean;
  rootCause: string;
  isDemoData: boolean;
}

// Phase 10 — GIS Graph Versioning
export interface GraphVersionDTO {
  id: string;
  campusId: string;
  version: number;
  publishedBy: string;
  changeSummary: string;
  nodeCount: number;
  edgeCount: number;
  publishedAt: string;
}

// Phase 11 — System Observability
export interface ServiceHealthStatus {
  service: 'API' | 'DATABASE' | 'AI_PROVIDER' | 'EMAIL_PROVIDER' | 'MAP_PROVIDER' | 'STORAGE' | 'NOTIFICATIONS';
  status: 'healthy' | 'degraded' | 'simulated' | 'unconfigured' | 'error';
  configured: boolean;
  message: string;
  checkedAt: string;
}


// ---------------------------------------------------------------------------
// Module W — Navigation Assistance & Route Resilience (#216–#218)
// ---------------------------------------------------------------------------

export type DirectionLanguage = 'en' | 'bn';

export type CompassPoint = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export type DirectionTurn =
  | 'straight'
  | 'slight_left'
  | 'slight_right'
  | 'left'
  | 'right'
  | 'sharp_left'
  | 'sharp_right'
  | 'u_turn';

export type DirectionStepKind = 'walk' | 'ramp' | 'elevator' | 'arrive';

export interface DirectionStepDTO {
  index: number;
  kind: DirectionStepKind;
  /** Relative turn from the previous step. `null` for the first step, elevators and arrival. */
  turn: DirectionTurn | null;
  edgeId: string | null;
  fromNodeId: string | null;
  toNodeId: string;
  /** Main instruction in the requested language. */
  text: string;
  /** Accessibility callouts (slope, width, surface, lighting, verification freshness). */
  callouts: string[];
  /** Instruction plus callouts, ready for text-to-speech. */
  spoken: string;
  distanceMeters: number;
  cumulativeMeters: number;
  remainingMeters: number;
  bearingDegrees: number | null;
  heading: CompassPoint | null;
}

export interface RouteDirectionsDTO {
  language: DirectionLanguage;
  routeId: string;
  title: string;
  summary: string;
  highlights: string[];
  steps: DirectionStepDTO[];
  /** Whole route as one speakable script. */
  script: string;
  totalDistanceMeters: number;
  estimatedMinutes: number;
}

export type ResilienceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ResilienceSegmentDTO {
  edgeId: string;
  name: string;
  fromName: string;
  toName: string;
  /** True when closing this segment leaves no verified accessible alternative. */
  critical: boolean;
  detourMeters: number | null;
  detourPercent: number | null;
  alternativeEdgeIds: string[];
  involvesElevator: boolean;
  involvesRamp: boolean;
}

export interface RouteResilienceDTO {
  found: boolean;
  campusId: string;
  fromNodeId: string;
  toNodeId: string;
  language: DirectionLanguage;
  level: ResilienceLevel | null;
  /** 0–100, where 100 means every segment has a short verified detour. */
  score: number | null;
  baselineDistanceMeters: number | null;
  baselineEdgeIds: string[];
  criticalSegmentCount: number;
  segments: ResilienceSegmentDTO[];
  message: string;
  recommendations: string[];
  notes: string[];
  analyzedAt: string;
}

export interface RouteShareLinkDTO {
  token: string;
  /** Front-end path that opens the shared route, e.g. `/shared-route/<token>`. */
  path: string;
  createdAt: string;
  expiresAt: string;
}

export interface SharedRouteDTO extends RouteCalculationResultDTO {
  fromName: string;
  toName: string;
  share: { createdAt: string; expiresAt: string };
  directions: Record<DirectionLanguage, RouteDirectionsDTO> | null;
}
