/**
 * Route resilience analysis (feature #217).
 *
 * Answers: "If any single segment of my route closes, is there still a verified
 * accessible way to get there — and how much longer is it?"
 *
 * The analysis re-runs the strict verified-route engine once per segment of the
 * primary route on a detached copy of the graph with that one segment blocked.
 * It never mutates repository data, never relaxes verification requirements and
 * never claims physical availability: it is a graph-model estimate.
 */
import type {
  AccessibilityPreferences,
  AccessibilityReportDTO,
  DirectionLanguage,
  LiveFacilityStatusDTO,
  LocationNodeDTO,
  PathEdgeDTO,
  ResilienceLevel,
  ResilienceSegmentDTO,
  RouteResilienceDTO,
} from '../../../../shared/types.ts';
import { calculateAccessibleRoutes } from './dijkstra.ts';

export interface ResilienceInput {
  campusId: string;
  fromNodeId: string;
  toNodeId: string;
  locations: LocationNodeDTO[];
  edges: PathEdgeDTO[];
  preferences: AccessibilityPreferences;
  liveFacilities?: LiveFacilityStatusDTO[];
  reports?: AccessibilityReportDTO[];
  algorithm?: 'dijkstra' | 'astar';
  language?: DirectionLanguage;
}

/** Share of a segment's resilience credit that survives a given detour. */
const DETOUR_TIERS: ReadonlyArray<{ maxPercent: number; credit: number }> = [
  { maxPercent: 25, credit: 1 },
  { maxPercent: 50, credit: 0.75 },
  { maxPercent: 100, credit: 0.5 },
];
const LONG_DETOUR_CREDIT = 0.25;

const HIGH_SCORE_THRESHOLD = 75;
const MEDIUM_CRITICAL_SHARE = 1 / 3;

export function detourCredit(detourPercent: number): number {
  for (const tier of DETOUR_TIERS) {
    if (detourPercent <= tier.maxPercent) return tier.credit;
  }
  return LONG_DETOUR_CREDIT;
}

/**
 * Level rules (kept simple so they can be explained to users):
 *  - any single point of failure rules out HIGH;
 *  - with no critical segment, HIGH needs a score of at least 75;
 *  - with critical segments, at most one third critical keeps the route MEDIUM.
 */
export function classifyResilience(
  score: number,
  criticalCount: number,
  segmentCount: number
): ResilienceLevel {
  if (criticalCount === 0) return score >= HIGH_SCORE_THRESHOLD ? 'HIGH' : 'MEDIUM';
  return criticalCount / segmentCount <= MEDIUM_CRITICAL_SHARE ? 'MEDIUM' : 'LOW';
}

interface CopyPack {
  levelMessage: Record<ResilienceLevel, string>;
  noRoute: string;
  critical: (name: string) => string;
  criticalElevator: (name: string) => string;
  allClear: string;
  notes: string[];
}

const COPY: Record<DirectionLanguage, CopyPack> = {
  en: {
    levelMessage: {
      HIGH: 'This route still works if any single segment closes.',
      MEDIUM:
        'Most segments have a verified alternative, but some are single points of failure.',
      LOW: 'Several segments have no verified accessible alternative. Check live status before you leave.',
    },
    noRoute: 'No verified accessible route exists, so resilience cannot be analyzed.',
    critical: (name) =>
      `If "${name}" closes, no verified accessible alternative exists. Check live status before you leave.`,
    criticalElevator: (name) =>
      `Elevator or lift access at "${name}" is a single point of failure. Ask campus facilities about a backup plan.`,
    allClear: 'No single point of failure was found on this route.',
    notes: [
      'Each closure is tested one at a time, using verified accessible segments only.',
      'This is a graph-model estimate, not a guarantee of physical availability.',
    ],
  },
  bn: {
    levelMessage: {
      HIGH: 'কোনো একটি অংশ বন্ধ হলেও এই রুট ব্যবহার করা যাবে।',
      MEDIUM:
        'বেশিরভাগ অংশের যাচাইকৃত বিকল্প আছে, তবে কয়েকটি অংশ বন্ধ হলে আর কোনো উপায় থাকবে না।',
      LOW: 'একাধিক অংশের কোনো যাচাইকৃত বাধামুক্ত বিকল্প নেই। রওনা দেওয়ার আগে লাইভ স্ট্যাটাস দেখে নিন।',
    },
    noRoute: 'কোনো যাচাইকৃত বাধামুক্ত রুট নেই, তাই স্থিতিস্থাপকতা বিশ্লেষণ করা যায়নি।',
    critical: (name) =>
      `"${name}" বন্ধ হলে কোনো যাচাইকৃত বাধামুক্ত বিকল্প থাকবে না। রওনা দেওয়ার আগে লাইভ স্ট্যাটাস দেখে নিন।`,
    criticalElevator: (name) =>
      `"${name}" অংশের লিফট বা উত্তোলন সুবিধা বন্ধ হলে বিকল্প নেই। ক্যাম্পাস সুবিধা বিভাগের সঙ্গে ব্যাকআপ পরিকল্পনা নিয়ে কথা বলুন।`,
    allClear: 'এই রুটে কোনো ঝুঁকিপূর্ণ একক অংশ পাওয়া যায়নি।',
    notes: [
      'প্রতিটি অংশ আলাদাভাবে বন্ধ ধরে পরীক্ষা করা হয়েছে এবং শুধু যাচাইকৃত বাধামুক্ত অংশ ব্যবহার করা হয়েছে।',
      'এটি গ্রাফ-মডেলভিত্তিক অনুমান, বাস্তব অবস্থার নিশ্চয়তা নয়।',
    ],
  },
};

function blockEdge(edges: PathEdgeDTO[], edgeId: string): PathEdgeDTO[] {
  return edges.map((edge) =>
    edge.id === edgeId
      ? {
          ...edge,
          status: 'blocked' as const,
          temporaryClosure: true,
          closureReason: 'Closed in a resilience what-if analysis',
        }
      : edge
  );
}

export function analyzeRouteResilience(input: ResilienceInput): RouteResilienceDTO {
  const language: DirectionLanguage = input.language ?? 'en';
  const copy = COPY[language];
  const analyzedAt = new Date().toISOString();

  const calculate = (edges: PathEdgeDTO[]) =>
    calculateAccessibleRoutes(input.locations, edges, {
      campusId: input.campusId,
      fromNodeId: input.fromNodeId,
      toNodeId: input.toNodeId,
      preferences: input.preferences,
      allowUnverifiedFallback: false,
      includeAlternatives: false,
      algorithm: input.algorithm ?? 'dijkstra',
      topK: 1,
      liveFacilities: input.liveFacilities,
      reports: input.reports,
    });

  const base = {
    campusId: input.campusId,
    fromNodeId: input.fromNodeId,
    toNodeId: input.toNodeId,
    language,
    analyzedAt,
  };

  const baseline = calculate(input.edges);
  const primary = baseline.found ? baseline.routes[0] : undefined;
  if (!primary) {
    return {
      ...base,
      found: false,
      level: null,
      score: null,
      baselineDistanceMeters: null,
      baselineEdgeIds: [],
      criticalSegmentCount: 0,
      segments: [],
      message: copy.noRoute,
      recommendations: [],
      notes: copy.notes,
    };
  }

  const nodeById = new Map(input.locations.map((node) => [node.id, node]));
  const edgeById = new Map(input.edges.map((edge) => [edge.id, edge]));
  const nodeLabel = (id: string | undefined) => {
    const node = id ? nodeById.get(id) : undefined;
    return node ? (language === 'bn' && node.nameBn ? node.nameBn : node.name) : (id ?? '');
  };

  const uniqueEdgeIds = [...new Set(primary.edgeIds)];
  const segments: ResilienceSegmentDTO[] = uniqueEdgeIds.map((edgeId) => {
    const edge = edgeById.get(edgeId);
    const position = primary.edgeIds.indexOf(edgeId);
    const alternative = calculate(blockEdge(input.edges, edgeId));
    const alternativeRoute = alternative.found ? alternative.routes[0] : undefined;

    const detourMeters = alternativeRoute
      ? Math.max(0, Math.round(alternativeRoute.totalDistanceMeters - primary.totalDistanceMeters))
      : null;
    let detourPercent: number | null = null;
    if (detourMeters !== null) {
      detourPercent =
        primary.totalDistanceMeters > 0
          ? Math.round((detourMeters / primary.totalDistanceMeters) * 100)
          : 0;
    }

    return {
      edgeId,
      name: edge?.name ?? edgeId,
      fromName: nodeLabel(primary.nodeIds[position]),
      toName: nodeLabel(primary.nodeIds[position + 1]),
      critical: alternativeRoute === undefined,
      detourMeters,
      detourPercent,
      alternativeEdgeIds: alternativeRoute?.edgeIds ?? [],
      involvesElevator: Boolean(edge?.elevatorAvailable || edge?.indoorFloorTransition),
      involvesRamp: Boolean(edge?.rampAvailable && edge?.rampVerified),
    };
  });

  const criticalSegments = segments.filter((segment) => segment.critical);
  const credits = segments.map((segment) =>
    segment.critical ? 0 : detourCredit(segment.detourPercent ?? 0)
  );
  const score = Math.round((credits.reduce((sum, value) => sum + value, 0) / segments.length) * 100);
  const level = classifyResilience(score, criticalSegments.length, segments.length);

  const recommendations =
    criticalSegments.length === 0
      ? [copy.allClear]
      : criticalSegments.map((segment) =>
          segment.involvesElevator ? copy.criticalElevator(segment.name) : copy.critical(segment.name)
        );

  return {
    ...base,
    found: true,
    level,
    score,
    baselineDistanceMeters: Math.round(primary.totalDistanceMeters),
    baselineEdgeIds: primary.edgeIds,
    criticalSegmentCount: criticalSegments.length,
    segments,
    message: copy.levelMessage[level],
    recommendations,
    notes: copy.notes,
  };
}
