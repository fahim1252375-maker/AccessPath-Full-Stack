import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  password: z.string().min(8).max(100),
  campusId: z.string().trim().min(1).default('campus_demo_north'),
  language: z.enum(['en', 'bn']).default('en'),
  consentAnalytics: z.boolean().default(true),
  consentLocation: z.boolean().default(false),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const profilePatchSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    language: z.enum(['en', 'bn']).optional(),
    consentAnalytics: z.boolean().optional(),
    consentLocation: z.boolean().optional(),
  })
  .strict();

export const campusTransferRequestSchema = z.object({
  toCampusId: z.string().trim().min(1),
  reason: z.string().trim().min(5).max(500),
});

export const accessibilityProfileSchema = z.object({
  wheelchairMode: z.boolean().default(false),
  stepFreeMode: z.boolean().default(true),
  limitedMobilityMode: z.boolean().default(false),
  rampRequired: z.boolean().default(false),
  elevatorRequired: z.boolean().default(false),
  stairsAvoidance: z.boolean().default(true),
  smoothSurfacePreference: z.boolean().default(false),
  widePathPreference: z.boolean().default(false),
  lowGradientPreference: z.boolean().default(false),
  wellLitPreference: z.boolean().default(false),
  visualAssistanceMode: z.boolean().default(false),
  customNotes: z.string().max(500).default(''),
});

/**
 * Per-request preference overrides for routing endpoints.
 *
 * Deliberately built from plain booleans (no `.default()`): a missing key must stay
 * missing so it never overwrites the signed-in user's saved accessibility profile.
 */
export const routePreferencesOverrideSchema = z
  .object({
    wheelchairMode: z.boolean(),
    stepFreeMode: z.boolean(),
    limitedMobilityMode: z.boolean(),
    rampRequired: z.boolean(),
    elevatorRequired: z.boolean(),
    stairsAvoidance: z.boolean(),
    smoothSurfacePreference: z.boolean(),
    widePathPreference: z.boolean(),
    lowGradientPreference: z.boolean(),
    wellLitPreference: z.boolean(),
    visualAssistanceMode: z.boolean(),
    customNotes: z.string().max(500),
  })
  .partial();

const routeAlgorithmSchema = z.enum(['dijkstra', 'astar']);
const directionLanguageSchema = z.enum(['en', 'bn']);

const routeEndpointsShape = {
  campusId: z.string().min(1),
  fromNodeId: z.string().min(1),
  toNodeId: z.string().min(1),
  preferences: routePreferencesOverrideSchema.optional(),
};

export const routeCalculateSchema = z.object({
  ...routeEndpointsShape,
  allowUnverifiedFallback: z.boolean().optional().default(false),
  includeAlternatives: z.boolean().optional().default(true),
  algorithm: routeAlgorithmSchema.optional().default('dijkstra'),
  topK: z.number().int().min(1).max(3).optional().default(3),
});

/** #216 — bilingual turn-by-turn directions for the calculated routes. */
export const routeDirectionsSchema = z.object({
  ...routeEndpointsShape,
  language: directionLanguageSchema.optional().default('en'),
  allowUnverifiedFallback: z.boolean().optional().default(false),
  algorithm: routeAlgorithmSchema.optional().default('dijkstra'),
  topK: z.number().int().min(1).max(3).optional().default(3),
});

/** #217 — single-point-of-failure analysis of the primary accessible route. */
export const routeResilienceSchema = z.object({
  ...routeEndpointsShape,
  language: directionLanguageSchema.optional().default('en'),
  algorithm: routeAlgorithmSchema.optional().default('dijkstra'),
});

/** #218 — signed, expiring, read-only route-share link. */
export const routeShareSchema = z.object({
  ...routeEndpointsShape,
  algorithm: routeAlgorithmSchema.optional().default('dijkstra'),
  ttlHours: z.number().int().min(1).max(168).optional().default(48),
});

export const favoriteLocationSchema = z.object({
  campusId: z.string().min(1),
  locationNodeId: z.string().min(1),
  label: z.string().trim().max(80).optional(),
});

export const routeSavePatchSchema = z
  .object({
    isSaved: z.boolean().optional(),
    feedbackRating: z.number().int().min(1).max(5).optional(),
    feedbackComment: z.string().trim().max(500).optional(),
  })
  .strict();

export const createReportSchema = z.object({
  campusId: z.string().min(1),
  buildingId: z.string().optional(),
  locationNodeId: z.string().optional(),
  pathEdgeId: z.string().optional(),
  clientRequestId: z.string().max(120).optional(),
  title: z.string().trim().min(4).max(160),
  description: z.string().trim().min(10).max(2000),
  language: z.enum(['en', 'bn']).default('en'),
  category: z.enum([
    'broken_ramp',
    'missing_ramp',
    'blocked_walkway',
    'damaged_pavement',
    'broken_elevator',
    'missing_accessible_entrance',
    'stairs_only_access',
    'insufficient_lighting',
    'narrow_passage',
    'construction_obstruction',
    'other',
  ]),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  locationLabel: z.string().trim().min(2).max(160),
  lat: z.number().optional(),
  lng: z.number().optional(),
  runAiClassification: z.boolean().optional().default(true),
});

export const updateReportSchema = z.object({
  status: z
    .enum([
      'submitted',
      'ai_classified',
      'pending_review',
      'under_verification',
      'verified',
      'assigned',
      'in_progress',
      'resolved',
      'rejected',
      'disputed',
      'duplicate',
    ])
    .optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assignedToId: z.string().optional(),
  duplicateOfId: z.string().optional(),
  note: z.string().max(500).optional(),
  updateEdgeStatus: z.enum(['open', 'blocked', 'caution']).optional(),
});

export const verificationSchema = z.object({
  campusId: z.string().min(1),
  reportId: z.string().min(1),
  edgeId: z.string().optional(),
  decision: z.enum(['confirmed', 'rejected', 'needs_more_evidence', 'resolved_confirmed']),
  notes: z.string().trim().min(3).max(1000),
  applyToGraphStatus: z.enum(['open', 'blocked', 'caution']).optional(),
});

export const edgeMutationSchema = z.object({
  campusId: z.string().min(1),
  fromNodeId: z.string().min(1),
  toNodeId: z.string().min(1),
  bidirectional: z.boolean().default(true),
  name: z.string().trim().min(2).max(140),
  distanceMeters: z.number().min(1).max(5000),
  widthMeters: z.number().min(0.4).max(20),
  surface: z.enum([
    'smooth_concrete',
    'asphalt',
    'brick_paver',
    'tactile_tile',
    'cobblestone',
    'unpaved_rough',
  ]),
  hasStairs: z.boolean().default(false),
  stairCount: z.number().min(0).max(500).default(0),
  rampAvailable: z.boolean().default(false),
  rampVerified: z.boolean().default(false),
  slopePercent: z.number().min(0).max(45).default(0),
  elevatorAvailable: z.boolean().default(false),
  elevatorOperational: z.boolean().default(true),
  lighting: z.enum(['well_lit', 'moderate', 'poor', 'unknown']).default('well_lit'),
  status: z.enum(['open', 'blocked', 'caution']).default('open'),
  temporaryClosure: z.boolean().default(false),
  closureReason: z.string().max(400).optional(),
  verificationStatus: z.enum(['verified', 'unverified', 'unknown', 'disputed']).default('unverified'),
  indoorFloorTransition: z.boolean().optional(),
});

export const edgePatchSchema = z
  .object({
    name: z.string().trim().min(2).max(140).optional(),
    distanceMeters: z.number().min(1).max(5000).optional(),
    widthMeters: z.number().min(0.4).max(20).optional(),
    surface: z
      .enum([
        'smooth_concrete',
        'asphalt',
        'brick_paver',
        'tactile_tile',
        'cobblestone',
        'unpaved_rough',
      ])
      .optional(),
    hasStairs: z.boolean().optional(),
    stairCount: z.number().min(0).max(500).optional(),
    rampAvailable: z.boolean().optional(),
    rampVerified: z.boolean().optional(),
    slopePercent: z.number().min(0).max(45).optional(),
    elevatorAvailable: z.boolean().optional(),
    elevatorOperational: z.boolean().optional(),
    lighting: z.enum(['well_lit', 'moderate', 'poor', 'unknown']).optional(),
    status: z.enum(['open', 'blocked', 'caution']).optional(),
    temporaryClosure: z.boolean().optional(),
    closureReason: z.string().max(400).optional(),
    verificationStatus: z.enum(['verified', 'unverified', 'unknown', 'disputed']).optional(),
    lastVerifiedAt: z.string().optional(),
    verificationExpiresAt: z.string().optional(),
    verificationSource: z.string().max(160).optional(),
    indoorFloorTransition: z.boolean().optional(),
  })
  .strict();

export const locationMutationSchema = z.object({
  campusId: z.string().min(1),
  buildingId: z.string().optional(),
  corridorId: z.string().optional(),
  roomNumber: z.string().max(40).optional(),
  name: z.string().trim().min(2).max(140),
  nameBn: z.string().max(140).optional(),
  code: z.string().max(30).optional(),
  type: z.enum([
    'entrance',
    'building',
    'classroom',
    'corridor',
    'intersection',
    'elevator',
    'ramp',
    'facility',
  ]),
  floor: z.number().int().min(-3).max(50).default(0),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  description: z.string().max(600).default(''),
  isAccessibleEntrance: z.boolean().default(false),
  hasElevator: z.boolean().default(false),
  hasAccessibleRestroom: z.boolean().default(false),
  hasRamp: z.boolean().default(false),
  isEmergencyExit: z.boolean().optional(),
  qrCodeId: z.string().max(80).optional(),
  beaconId: z.string().max(80).optional(),
  verificationStatus: z.enum(['verified', 'unverified', 'unknown', 'disputed']).default('unverified'),
  facilities: z.array(z.string()).default([]),
});

export const locationPatchSchema = locationMutationSchema
  .omit({ campusId: true })
  .partial()
  .strict();

export const buildingPatchSchema = z
  .object({
    name: z.string().trim().min(2).max(140).optional(),
    code: z.string().trim().min(1).max(30).optional(),
    category: z
      .enum([
        'academic',
        'library',
        'laboratory',
        'student_services',
        'medical',
        'dining',
        'auditorium',
      ])
      .optional(),
    floors: z.number().int().min(1).max(60).optional(),
    hasElevator: z.boolean().optional(),
    hasAccessibleEntrance: z.boolean().optional(),
    hasAccessibleRestroom: z.boolean().optional(),
    accessibilitySummary: z.string().max(600).optional(),
    verificationStatus: z.enum(['verified', 'unverified', 'unknown', 'disputed']).optional(),
  })
  .strict();

export const emergencyApprovePatchSchema = z
  .object({
    adminApproved: z.boolean(),
    notes: z.string().max(600).optional(),
    wheelchairCompatible: z.boolean().optional(),
  })
  .strict();

export const liveFacilityPatchSchema = z
  .object({
    status: z.enum(['operational', 'degraded', 'outage', 'closed', 'unknown']),
    source: z.string().trim().min(2).max(140).optional(),
    authorityVerified: z.boolean().optional(),
    notes: z.string().max(500).optional(),
  })
  .strict();

export const classScheduleCreateSchema = z.object({
  campusId: z.string().min(1).default('campus_demo_north'),
  courseCode: z.string().trim().min(2).max(30),
  courseTitle: z.string().trim().min(2).max(120),
  dayOfWeek: z.enum(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:mm format'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:mm format'),
  buildingId: z.string().min(1),
  locationNodeId: z.string().min(1),
  roomLabel: z.string().trim().min(1).max(60),
  bufferMinutes: z.number().int().min(0).max(60).default(10),
});
