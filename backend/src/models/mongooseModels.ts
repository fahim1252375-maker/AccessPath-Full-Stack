import mongoose, { Schema } from 'mongoose';

const InstitutionSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    country: { type: String, required: true },
    contactEmail: { type: String, required: true },
    isDemoData: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  },
  { timestamps: true }
);

const UserSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['student', 'volunteer', 'moderator', 'campus_admin', 'super_admin'],
      default: 'student',
      index: true,
    },
    campusId: { type: String, required: true, index: true },
    institutionId: { type: String, required: true, index: true },
    emailVerified: { type: Boolean, default: false },
    verificationTokenHash: { type: String },
    verificationTokenExpiresAt: { type: Date },
    resetTokenHash: { type: String },
    resetTokenExpiresAt: { type: Date },
    consentAnalytics: { type: Boolean, default: true },
    consentLocation: { type: Boolean, default: false },
    language: { type: String, enum: ['en', 'bn'], default: 'en' },
    isActive: { type: Boolean, default: true },
    isDemoAccount: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const UserSessionSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    jti: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    revoked: { type: Boolean, default: false, index: true },
    revokedReason: { type: String },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

const CampusTransferRequestSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    userEmail: { type: String, required: true },
    fromCampusId: { type: String, required: true },
    toCampusId: { type: String, required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    reviewedBy: { type: String },
    reviewedAt: { type: String },
  },
  { timestamps: true }
);

const CampusSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    institutionId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    shortCode: { type: String, required: true },
    city: { type: String, required: true },
    description: { type: String, default: '' },
    centerLat: { type: Number, required: true },
    centerLng: { type: Number, required: true },
    defaultZoom: { type: Number, default: 17 },
    graphVersion: { type: Number, default: 1 },
    isDemoData: { type: Boolean, default: false },
    demoBannerText: { type: String },
    accessibilityScore: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const BuildingSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    campusId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    code: { type: String, required: true },
    category: { type: String, required: true },
    floors: { type: Number, default: 1 },
    hasElevator: { type: Boolean, default: false },
    hasAccessibleEntrance: { type: Boolean, default: false },
    hasAccessibleRestroom: { type: Boolean, default: false },
    accessibilitySummary: { type: String, default: '' },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    verificationStatus: {
      type: String,
      enum: ['verified', 'unverified', 'unknown', 'disputed'],
      default: 'unverified',
    },
    isDemoData: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const LocationSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    campusId: { type: String, required: true, index: true },
    buildingId: { type: String, index: true },
    corridorId: { type: String },
    roomNumber: { type: String },
    name: { type: String, required: true },
    nameBn: { type: String },
    code: { type: String },
    type: {
      type: String,
      enum: ['entrance', 'building', 'classroom', 'corridor', 'intersection', 'elevator', 'ramp', 'facility'],
      required: true,
      index: true,
    },
    floor: { type: Number, default: 0 },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    svgX: { type: Number },
    svgY: { type: Number },
    description: { type: String, default: '' },
    isAccessibleEntrance: { type: Boolean, default: false },
    hasElevator: { type: Boolean, default: false },
    hasAccessibleRestroom: { type: Boolean, default: false },
    hasRamp: { type: Boolean, default: false },
    isEmergencyExit: { type: Boolean, default: false },
    qrCodeId: { type: String },
    beaconId: { type: String },
    verificationStatus: {
      type: String,
      enum: ['verified', 'unverified', 'unknown', 'disputed'],
      default: 'unverified',
    },
    lastVerifiedAt: { type: String },
    verificationExpiresAt: { type: String },
    facilities: [{ type: String }],
    isDemoData: { type: Boolean, default: false },
  },
  { timestamps: true }
);
LocationSchema.index({ campusId: 1, type: 1 });

const PathEdgeSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    campusId: { type: String, required: true, index: true },
    fromNodeId: { type: String, required: true, index: true },
    toNodeId: { type: String, required: true, index: true },
    bidirectional: { type: Boolean, default: true },
    name: { type: String, required: true },
    distanceMeters: { type: Number, required: true, min: 1 },
    widthMeters: { type: Number, required: true, min: 0.4 },
    surface: { type: String, required: true },
    hasStairs: { type: Boolean, default: false },
    stairCount: { type: Number, default: 0 },
    rampAvailable: { type: Boolean, default: false },
    rampVerified: { type: Boolean, default: false },
    slopePercent: { type: Number, default: 0 },
    elevatorAvailable: { type: Boolean, default: false },
    elevatorOperational: { type: Boolean, default: true },
    lighting: { type: String, default: 'unknown' },
    status: { type: String, enum: ['open', 'blocked', 'caution'], default: 'open', index: true },
    temporaryClosure: { type: Boolean, default: false },
    closureReason: { type: String },
    verificationStatus: {
      type: String,
      enum: ['verified', 'unverified', 'unknown', 'disputed'],
      default: 'unverified',
      index: true,
    },
    lastVerifiedAt: { type: String },
    verificationExpiresAt: { type: String },
    verifiedByRole: { type: String },
    verificationSource: { type: String },
    indoorFloorTransition: { type: Boolean, default: false },
    isDemoData: { type: Boolean, default: false },
  },
  { timestamps: true }
);
PathEdgeSchema.index({ campusId: 1, status: 1, verificationStatus: 1 });

const AccessibilityProfileSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true, unique: true, index: true },
    wheelchairMode: { type: Boolean, default: false },
    stepFreeMode: { type: Boolean, default: true },
    limitedMobilityMode: { type: Boolean, default: false },
    rampRequired: { type: Boolean, default: false },
    elevatorRequired: { type: Boolean, default: false },
    stairsAvoidance: { type: Boolean, default: true },
    smoothSurfacePreference: { type: Boolean, default: false },
    widePathPreference: { type: Boolean, default: false },
    lowGradientPreference: { type: Boolean, default: false },
    wellLitPreference: { type: Boolean, default: false },
    visualAssistanceMode: { type: Boolean, default: false },
    customNotes: { type: String, default: '' },
  },
  { timestamps: true }
);

const AccessibilityReportSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    campusId: { type: String, required: true, index: true },
    buildingId: { type: String },
    locationNodeId: { type: String, index: true },
    pathEdgeId: { type: String, index: true },
    clientRequestId: { type: String, index: true },
    reporterId: { type: String, required: true, index: true },
    reporterAlias: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    language: { type: String, enum: ['en', 'bn'], default: 'en' },
    category: { type: String, required: true, index: true },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    status: { type: String, default: 'submitted', index: true },
    lat: { type: Number },
    lng: { type: Number },
    locationLabel: { type: String, required: true },
    evidenceUrls: [{ type: String }],
    aiClassification: { type: Schema.Types.Mixed },
    upvotes: { type: Number, default: 0 },
    upvoterIds: [{ type: String }],
    duplicateOfId: { type: String },
    assignedToId: { type: String },
    timeline: [{ type: Schema.Types.Mixed }],
    comments: [{ type: Schema.Types.Mixed }],
    resolutionFeedback: { type: Schema.Types.Mixed },
    isDemoData: { type: Boolean, default: false },
  },
  { timestamps: true }
);
AccessibilityReportSchema.index({ campusId: 1, status: 1, createdAt: -1 });

const ReportEvidenceSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    reportId: { type: String, required: true, index: true },
    campusId: { type: String, required: true, index: true },
    uploaderId: { type: String, required: true },
    fileUrl: { type: String, required: true },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
  },
  { timestamps: true }
);

const VerificationSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    campusId: { type: String, required: true, index: true },
    reportId: { type: String, required: true, index: true },
    edgeId: { type: String },
    verifierId: { type: String, required: true },
    verifierRole: { type: String, required: true },
    decision: { type: String, required: true },
    notes: { type: String, default: '' },
    evidenceUrls: [{ type: String }],
    appliedToGraph: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const MaintenanceTaskSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    campusId: { type: String, required: true, index: true },
    reportId: { type: String, index: true },
    edgeId: { type: String },
    locationNodeId: { type: String },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    status: { type: String, enum: ['open', 'assigned', 'in_progress', 'completed', 'deferred'], default: 'open', index: true },
    assignedTeam: { type: String, default: 'Facilities Maintenance' },
    slaTargetHours: { type: Number, default: 48 },
    estimatedCompletionDate: { type: String },
    completedAt: { type: String },
    isDemoData: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const RouteHistorySchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    campusId: { type: String, required: true, index: true },
    fromNodeId: { type: String, required: true },
    toNodeId: { type: String, required: true },
    fromName: { type: String, required: true },
    toName: { type: String, required: true },
    distanceMeters: { type: Number, required: true },
    estimatedMinutes: { type: Number, required: true },
    isSaved: { type: Boolean, default: false },
    feedbackRating: { type: Number },
    feedbackComment: { type: String },
  },
  { timestamps: true }
);

const FavoriteLocationSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    campusId: { type: String, required: true },
    locationNodeId: { type: String, required: true },
    label: { type: String },
  },
  { timestamps: true }
);
FavoriteLocationSchema.index({ userId: 1, locationNodeId: 1 }, { unique: true });

const NotificationSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    campusId: { type: String, required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

const AnnouncementSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    campusId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    severity: { type: String, enum: ['info', 'warning', 'urgent'], default: 'info' },
    authorName: { type: String, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const CampusIntegrationSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    campusId: { type: String, required: true, index: true },
    key: { type: String, required: true },
    name: { type: String, required: true },
    providerName: { type: String, required: true },
    mode: { type: String, required: true },
    connectionStatus: { type: String, required: true },
    configured: { type: Boolean, default: false },
    lastSyncAt: { type: String },
    lastError: { type: String },
    description: { type: String },
  },
  { timestamps: true }
);

const AuditLogSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    campusId: { type: String, index: true },
    actorId: { type: String, required: true },
    actorEmail: { type: String, required: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true, index: true },
    targetType: { type: String, required: true },
    targetId: { type: String, required: true },
    details: { type: String, required: true },
  },
  { timestamps: true }
);

const AIInteractionSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    campusId: { type: String, index: true },
    userId: { type: String },
    feature: { type: String, required: true, index: true },
    provider: { type: String, enum: ['gemini', 'mock'], required: true },
    model: { type: String, required: true },
    latencyMs: { type: Number, required: true },
    success: { type: Boolean, required: true },
    inputSummary: { type: String, required: true },
    outputSummary: { type: String, required: true },
    errorMessage: { type: String },
  },
  { timestamps: true }
);

const EmergencyRouteSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    campusId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    fromBuildingId: { type: String, required: true },
    floorNumber: { type: Number, default: 0 },
    assemblyPointName: { type: String, required: true },
    assemblyLat: { type: Number },
    assemblyLng: { type: Number },
    wheelchairCompatible: { type: Boolean, default: true },
    alternativeRouteIds: [{ type: String }],
    nodeIds: [{ type: String }],
    edgeIds: [{ type: String }],
    adminApproved: { type: Boolean, default: false },
    approvedBy: { type: String },
    approvedAt: { type: String },
    notes: { type: String, default: '' },
    isDemoData: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const FloorPlanSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    campusId: { type: String, required: true, index: true },
    buildingId: { type: String, required: true, index: true },
    floorNumber: { type: Number, required: true },
    floorLabel: { type: String, required: true },
    svgWidth: { type: Number, default: 800 },
    svgHeight: { type: Number, default: 460 },
    corridors: [{ type: Schema.Types.Mixed }],
    rooms: [{ type: Schema.Types.Mixed }],
    qrWaypoints: [{ type: Schema.Types.Mixed }],
    bleBeacons: [{ type: Schema.Types.Mixed }],
    isDemoData: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const LiveFacilityStatusSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    campusId: { type: String, required: true, index: true },
    buildingId: { type: String },
    locationNodeId: { type: String },
    edgeId: { type: String },
    facilityType: { type: String, required: true },
    name: { type: String, required: true },
    status: { type: String, required: true, index: true },
    source: { type: String, required: true },
    authorityVerified: { type: Boolean, default: false },
    providerStatus: { type: String, required: true },
    lastSyncAt: { type: String, required: true },
    notes: { type: String },
    isDemoData: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const FacilitySubscriptionSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    campusId: { type: String, required: true, index: true },
    facilityId: { type: String, required: true, index: true },
    channel: { type: String, enum: ['in_app', 'web_push'], default: 'in_app' },
    pushEndpoint: { type: String },
  },
  { timestamps: true }
);

const ClassScheduleItemSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    campusId: { type: String, required: true, index: true },
    courseCode: { type: String, required: true },
    courseTitle: { type: String, required: true },
    dayOfWeek: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    buildingId: { type: String, required: true },
    locationNodeId: { type: String, required: true },
    roomLabel: { type: String, required: true },
    bufferMinutes: { type: Number, default: 10 },
  },
  { timestamps: true }
);

const EquipmentIncidentSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    campusId: { type: String, required: true, index: true },
    buildingId: { type: String, required: true },
    facilityId: { type: String },
    edgeId: { type: String },
    equipmentName: { type: String, required: true },
    startedAt: { type: String, required: true },
    resolvedAt: { type: String },
    durationMinutes: { type: Number },
    severity: { type: String, required: true },
    slaTargetHours: { type: Number, default: 24 },
    slaMet: { type: Boolean },
    rootCause: { type: String, required: true },
    isDemoData: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const GraphVersionSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    campusId: { type: String, required: true, index: true },
    version: { type: Number, required: true },
    publishedBy: { type: String, required: true },
    changeSummary: { type: String, required: true },
    nodeCount: { type: Number, required: true },
    edgeCount: { type: Number, required: true },
    publishedAt: { type: String, required: true },
  },
  { timestamps: true }
);

export const MongooseModels = {
  Institution: mongoose.models.Institution || mongoose.model('Institution', InstitutionSchema),
  User: mongoose.models.User || mongoose.model('User', UserSchema),
  UserSession: mongoose.models.UserSession || mongoose.model('UserSession', UserSessionSchema),
  CampusTransferRequest:
    mongoose.models.CampusTransferRequest ||
    mongoose.model('CampusTransferRequest', CampusTransferRequestSchema),
  Campus: mongoose.models.Campus || mongoose.model('Campus', CampusSchema),
  Building: mongoose.models.Building || mongoose.model('Building', BuildingSchema),
  Location: mongoose.models.Location || mongoose.model('Location', LocationSchema),
  PathEdge: mongoose.models.PathEdge || mongoose.model('PathEdge', PathEdgeSchema),
  AccessibilityProfile:
    mongoose.models.AccessibilityProfile ||
    mongoose.model('AccessibilityProfile', AccessibilityProfileSchema),
  AccessibilityReport:
    mongoose.models.AccessibilityReport ||
    mongoose.model('AccessibilityReport', AccessibilityReportSchema),
  ReportEvidence:
    mongoose.models.ReportEvidence || mongoose.model('ReportEvidence', ReportEvidenceSchema),
  Verification: mongoose.models.Verification || mongoose.model('Verification', VerificationSchema),
  MaintenanceTask:
    mongoose.models.MaintenanceTask || mongoose.model('MaintenanceTask', MaintenanceTaskSchema),
  RouteHistory: mongoose.models.RouteHistory || mongoose.model('RouteHistory', RouteHistorySchema),
  FavoriteLocation:
    mongoose.models.FavoriteLocation || mongoose.model('FavoriteLocation', FavoriteLocationSchema),
  Notification: mongoose.models.Notification || mongoose.model('Notification', NotificationSchema),
  Announcement: mongoose.models.Announcement || mongoose.model('Announcement', AnnouncementSchema),
  CampusIntegration:
    mongoose.models.CampusIntegration || mongoose.model('CampusIntegration', CampusIntegrationSchema),
  AuditLog: mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema),
  AIInteraction: mongoose.models.AIInteraction || mongoose.model('AIInteraction', AIInteractionSchema),
  EmergencyRoute: mongoose.models.EmergencyRoute || mongoose.model('EmergencyRoute', EmergencyRouteSchema),
  FloorPlan: mongoose.models.FloorPlan || mongoose.model('FloorPlan', FloorPlanSchema),
  LiveFacilityStatus:
    mongoose.models.LiveFacilityStatus ||
    mongoose.model('LiveFacilityStatus', LiveFacilityStatusSchema),
  FacilitySubscription:
    mongoose.models.FacilitySubscription ||
    mongoose.model('FacilitySubscription', FacilitySubscriptionSchema),
  ClassScheduleItem:
    mongoose.models.ClassScheduleItem ||
    mongoose.model('ClassScheduleItem', ClassScheduleItemSchema),
  EquipmentIncident:
    mongoose.models.EquipmentIncident ||
    mongoose.model('EquipmentIncident', EquipmentIncidentSchema),
  GraphVersion: mongoose.models.GraphVersion || mongoose.model('GraphVersion', GraphVersionSchema),
};
