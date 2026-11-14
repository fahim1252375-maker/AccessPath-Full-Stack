/**
 * Bilingual (English / বাংলা) turn-by-turn directions for accessible routes.
 *
 * This module is intentionally dependency-free and side-effect-free so that it
 * can run on the Express API, in the browser (including offline, from a cached
 * route) and in plain Node smoke tests.
 *
 * It never invents accessibility facts: every callout is derived from fields
 * already present on the route step (slope, surface, lighting, trust state).
 */
import type {
  CalculatedRouteDTO,
  CompassPoint,
  DirectionLanguage,
  DirectionStepDTO,
  DirectionStepKind,
  DirectionTurn,
  LocationNodeDTO,
  RouteDirectionsDTO,
  RouteStepDTO,
} from './types.ts';

/* -------------------------------------------------------------------------- */
/* Thresholds                                                                 */
/* -------------------------------------------------------------------------- */

/** Slope above which a segment is described as steep (the planner's "low gradient" limit). */
export const STEEP_SLOPE_PERCENT = 5;
/** 1:12 ratio, the common maximum ramp gradient. */
export const VERY_STEEP_SLOPE_PERCENT = 8.33;
/** Paths narrower than this (meters) get a "narrow path" callout. */
export const NARROW_WIDTH_METERS = 1.2;

const ROUGH_SURFACES = new Set(['cobblestone', 'unpaved_rough']);
const COORDINATE_EPSILON = 1e-7;

/* -------------------------------------------------------------------------- */
/* Geometry helpers                                                           */
/* -------------------------------------------------------------------------- */

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
const toDegrees = (radians: number): number => (radians * 180) / Math.PI;

interface LatLng {
  lat: number;
  lng: number;
}

/** Initial great-circle bearing from `from` to `to`, in degrees clockwise from north (0–360). */
export function bearingDegrees(from: LatLng, to: LatLng): number {
  const phi1 = toRadians(from.lat);
  const phi2 = toRadians(to.lat);
  const deltaLambda = toRadians(to.lng - from.lng);
  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

const COMPASS_POINTS: readonly CompassPoint[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export function compassPoint(bearing: number): CompassPoint {
  const normalized = ((bearing % 360) + 360) % 360;
  return COMPASS_POINTS[Math.round(normalized / 45) % 8];
}

/** Signed turn angle in (-180, 180]. Positive values turn right (clockwise). */
export function signedTurnAngle(previousBearing: number, nextBearing: number): number {
  return ((((nextBearing - previousBearing) % 360) + 540) % 360) - 180;
}

export function classifyTurn(angle: number): DirectionTurn {
  const magnitude = Math.abs(angle);
  const toRight = angle > 0;
  if (magnitude < 20) return 'straight';
  if (magnitude < 45) return toRight ? 'slight_right' : 'slight_left';
  if (magnitude < 120) return toRight ? 'right' : 'left';
  if (magnitude < 160) return toRight ? 'sharp_right' : 'sharp_left';
  return 'u_turn';
}

function hasDistinctCoordinates(a: LatLng, b: LatLng): boolean {
  return Math.abs(a.lat - b.lat) + Math.abs(a.lng - b.lng) > COORDINATE_EPSILON;
}

/* -------------------------------------------------------------------------- */
/* Language packs                                                             */
/* -------------------------------------------------------------------------- */

interface CalloutValues {
  slope: string;
  width: string;
}

interface LanguagePack {
  digits: (value: number | string) => string;
  meters: (value: number) => string;
  minutes: (value: number) => string;
  compass: Record<CompassPoint, string>;
  turnLead: Record<DirectionTurn, string>;
  floorLabel: (floor: number) => string;
  title: (route: CalculatedRouteDTO) => string;
  summary: (meters: number, minutes: number, steps: number) => string;
  stepWord: (index: number) => string;
  start: (from: string) => string;
  walk: (lead: string | null, meters: string, to: string) => string;
  ramp: (lead: string | null, meters: string, to: string) => string;
  elevator: (from: string, goingUp: boolean, floorLabel: string) => string;
  arrive: (destination: string) => string;
  callouts: {
    steep: (v: CalloutValues) => string;
    verySteep: (v: CalloutValues) => string;
    narrow: (v: CalloutValues) => string;
    rough: string;
    poorLighting: string;
    stale: string;
    unverified: string;
    disputed: string;
    expiring: string;
  };
  highlights: {
    ramps: (count: number) => string;
    elevators: (count: number) => string;
    steepest: (slope: string) => string;
    careSections: (count: number) => string;
    allClear: string;
  };
}

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

const toBengaliDigits = (value: number | string): string =>
  String(value).replace(/\d/g, (digit) => BENGALI_DIGITS[Number(digit)]);

const formatNumber = (value: number): string =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);

/** Zero-width joiner makes the Bengali word for "ramp" render correctly (র‍্যাম্প). */
const BN_RAMP = 'র\u200D্যাম্প';

const EN: LanguagePack = {
  digits: (value) => String(value),
  meters: (value) => `${value} ${value === 1 ? 'meter' : 'meters'}`,
  minutes: (value) => `${value} ${value === 1 ? 'minute' : 'minutes'}`,
  compass: {
    N: 'north',
    NE: 'north-east',
    E: 'east',
    SE: 'south-east',
    S: 'south',
    SW: 'south-west',
    W: 'west',
    NW: 'north-west',
  },
  turnLead: {
    straight: 'Continue straight',
    slight_left: 'Bear slightly left',
    slight_right: 'Bear slightly right',
    left: 'Turn left',
    right: 'Turn right',
    sharp_left: 'Make a sharp left turn',
    sharp_right: 'Make a sharp right turn',
    u_turn: 'Turn around',
  },
  floorLabel: (floor) => (floor === 0 ? 'the ground floor' : `floor ${floor}`),
  title: (route) => route.label,
  summary: (meters, minutes, steps) =>
    `${EN.meters(meters)}, about ${EN.minutes(minutes)}, ${steps} ${steps === 1 ? 'step' : 'steps'}.`,
  stepWord: (index) => `Step ${index}`,
  start: (from) => `Start at ${from}.`,
  walk: (lead, meters, to) =>
    lead ? `${lead} and walk ${meters} to ${to}.` : `Walk ${meters} to ${to}.`,
  ramp: (lead, meters, to) =>
    lead ? `${lead} and use the ramp for ${meters} to ${to}.` : `Use the ramp for ${meters} to ${to}.`,
  elevator: (from, goingUp, floorLabel) =>
    `At ${from}, take the elevator ${goingUp ? 'up' : 'down'} to ${floorLabel}.`,
  arrive: (destination) => `You have arrived at ${destination}.`,
  callouts: {
    steep: ({ slope }) => `Steep section (${slope}% slope). Take your time.`,
    verySteep: ({ slope }) => `Very steep section (${slope}% slope). Assistance is recommended.`,
    narrow: ({ width }) => `Narrow path (${width} m wide).`,
    rough: 'Rough or uneven surface.',
    poorLighting: 'Poorly lit section.',
    stale: 'The last accessibility check for this section is out of date.',
    unverified: 'This section has not been verified yet.',
    disputed: 'Reports about this section conflict with each other.',
    expiring: 'Verification for this section expires soon.',
  },
  highlights: {
    ramps: (count) => `${count} ramp ${count === 1 ? 'section' : 'sections'}`,
    elevators: (count) => `${count} elevator ${count === 1 ? 'ride' : 'rides'}`,
    steepest: (slope) => `Steepest slope: ${slope}%`,
    careSections: (count) => `${count} ${count === 1 ? 'section needs' : 'sections need'} extra care`,
    allClear: 'No special conditions flagged on this route',
  },
};

const BN: LanguagePack = {
  digits: toBengaliDigits,
  meters: (value) => `${toBengaliDigits(value)} মিটার`,
  minutes: (value) => `${toBengaliDigits(value)} মিনিট`,
  compass: {
    N: 'উত্তর',
    NE: 'উত্তর-পূর্ব',
    E: 'পূর্ব',
    SE: 'দক্ষিণ-পূর্ব',
    S: 'দক্ষিণ',
    SW: 'দক্ষিণ-পশ্চিম',
    W: 'পশ্চিম',
    NW: 'উত্তর-পশ্চিম',
  },
  turnLead: {
    straight: 'সোজা এগিয়ে',
    slight_left: 'একটু বাঁ দিকে ঘুরে',
    slight_right: 'একটু ডান দিকে ঘুরে',
    left: 'বাঁ দিকে ঘুরে',
    right: 'ডান দিকে ঘুরে',
    sharp_left: 'তীব্রভাবে বাঁ দিকে ঘুরে',
    sharp_right: 'তীব্রভাবে ডান দিকে ঘুরে',
    u_turn: 'ঘুরে উল্টো দিকে ফিরে',
  },
  floorLabel: (floor) => (floor === 0 ? 'নিচতলা' : `ফ্লোর ${toBengaliDigits(floor)}`),
  title: (route) => (route.isPrimary ? 'প্রস্তাবিত বাধামুক্ত রুট' : 'বিকল্প বাধামুক্ত রুট'),
  summary: (meters, minutes, steps) =>
    `মোট ${BN.meters(meters)}, আনুমানিক ${BN.minutes(minutes)}, ${toBengaliDigits(steps)}টি ধাপ।`,
  stepWord: (index) => `ধাপ ${toBengaliDigits(index)}`,
  start: (from) => `শুরু: ${from}।`,
  walk: (lead, meters, to) =>
    lead
      ? `${lead}, ${meters} হেঁটে যান। পরবর্তী স্থান: ${to}।`
      : `${meters} হেঁটে যান। পরবর্তী স্থান: ${to}।`,
  ramp: (lead, meters, to) =>
    lead
      ? `${lead}, ${BN_RAMP} ধরে ${meters} এগিয়ে যান। পরবর্তী স্থান: ${to}।`
      : `${BN_RAMP} ধরে ${meters} এগিয়ে যান। পরবর্তী স্থান: ${to}।`,
  elevator: (from, goingUp, floorLabel) =>
    `${from} থেকে লিফটে ${goingUp ? 'ওপরে' : 'নিচে'} যান। গন্তব্য তলা: ${floorLabel}।`,
  arrive: (destination) => `আপনি গন্তব্যে পৌঁছে গেছেন: ${destination}।`,
  callouts: {
    steep: ({ slope }) => `ঢালু অংশ (${slope} শতাংশ ঢাল)। ধীরে চলুন।`,
    verySteep: ({ slope }) =>
      `খুব ঢালু অংশ (${slope} শতাংশ ঢাল)। কারও সাহায্য নেওয়ার পরামর্শ দেওয়া হচ্ছে।`,
    narrow: ({ width }) => `সরু পথ (প্রস্থ ${width} মিটার)।`,
    rough: 'পথের পৃষ্ঠ অমসৃণ বা এবড়োখেবড়ো।',
    poorLighting: 'এই অংশে আলো কম।',
    stale: 'এই অংশের সর্বশেষ যাচাই অনেক আগের।',
    unverified: 'এই অংশ এখনো যাচাই করা হয়নি।',
    disputed: 'এই অংশ নিয়ে পরস্পরবিরোধী রিপোর্ট আছে।',
    expiring: 'এই অংশের যাচাইয়ের মেয়াদ শিগগির শেষ হবে।',
  },
  highlights: {
    ramps: (count) => `${toBengaliDigits(count)}টি ${BN_RAMP} অংশ`,
    elevators: (count) => `${toBengaliDigits(count)}বার লিফট ব্যবহার`,
    steepest: (slope) => `সবচেয়ে বেশি ঢাল: ${slope} শতাংশ`,
    careSections: (count) => `${toBengaliDigits(count)}টি অংশে বাড়তি সতর্কতা দরকার`,
    allClear: 'এই রুটে বিশেষ কোনো সতর্কতা চিহ্নিত হয়নি',
  },
};

const PACKS: Record<DirectionLanguage, LanguagePack> = { en: EN, bn: BN };

/* -------------------------------------------------------------------------- */
/* Step construction                                                          */
/* -------------------------------------------------------------------------- */

function localizedName(node: LocationNodeDTO | undefined, fallback: string, language: DirectionLanguage) {
  if (!node) return fallback;
  return language === 'bn' && node.nameBn ? node.nameBn : node.name;
}

function buildCallouts(step: RouteStepDTO, width: number | undefined, pack: LanguagePack): string[] {
  const callouts: string[] = [];
  const slope = Math.abs(step.slopePercent);
  const values: CalloutValues = {
    slope: pack.digits(formatNumber(Math.round(slope * 10) / 10)),
    width: pack.digits(width === undefined ? '' : formatNumber(width)),
  };

  if (slope >= VERY_STEEP_SLOPE_PERCENT) callouts.push(pack.callouts.verySteep(values));
  else if (slope >= STEEP_SLOPE_PERCENT) callouts.push(pack.callouts.steep(values));

  if (width !== undefined && width < NARROW_WIDTH_METERS) callouts.push(pack.callouts.narrow(values));
  if (ROUGH_SURFACES.has(step.surface)) callouts.push(pack.callouts.rough);
  if (step.lighting === 'poor') callouts.push(pack.callouts.poorLighting);

  switch (step.trustState) {
    case 'STALE':
      callouts.push(pack.callouts.stale);
      break;
    case 'UNVERIFIED':
    case 'UNKNOWN':
      callouts.push(pack.callouts.unverified);
      break;
    case 'DISPUTED':
      callouts.push(pack.callouts.disputed);
      break;
    case 'VERIFICATION_EXPIRING':
      callouts.push(pack.callouts.expiring);
      break;
    default:
      break;
  }
  return callouts;
}

export interface BuildDirectionsOptions {
  language?: DirectionLanguage;
  /**
   * Optional per-edge widths (meters). `RouteStepDTO` does not carry path width,
   * so callers that have the edge list can supply it to unlock "narrow path" callouts.
   */
  edgeWidths?: Record<string, number>;
}

/**
 * Converts a calculated accessible route into localized, screen-reader-friendly
 * directions. Pure function: same input always yields the same output.
 */
export function buildRouteDirections(
  route: CalculatedRouteDTO,
  locations: LocationNodeDTO[],
  options: BuildDirectionsOptions = {}
): RouteDirectionsDTO {
  const language: DirectionLanguage = options.language ?? 'en';
  const pack = PACKS[language];
  const nodeById = new Map(locations.map((node) => [node.id, node]));
  const totalExact = route.steps.reduce((sum, step) => sum + step.distanceMeters, 0);

  const steps: DirectionStepDTO[] = [];
  let cumulative = 0;
  let previousBearing: number | null = null;
  let rampCount = 0;
  let elevatorCount = 0;
  let steepest = 0;
  let careSections = 0;

  route.steps.forEach((routeStep, position) => {
    const fromNode = nodeById.get(routeStep.fromNodeId);
    const toNode = nodeById.get(routeStep.toNodeId);
    const fromName = localizedName(fromNode, routeStep.fromName, language);
    const toName = localizedName(toNode, routeStep.toName, language);
    const isFirst = position === 0;

    const floorChange =
      fromNode && toNode && fromNode.floor !== toNode.floor ? { from: fromNode.floor, to: toNode.floor } : null;
    const bearing =
      fromNode && toNode && hasDistinctCoordinates(fromNode, toNode) ? bearingDegrees(fromNode, toNode) : null;

    let kind: DirectionStepKind = 'walk';
    if (routeStep.hasElevator && floorChange) kind = 'elevator';
    else if (routeStep.hasRamp) kind = 'ramp';

    let turn: DirectionTurn | null = null;
    if (kind !== 'elevator' && bearing !== null && previousBearing !== null) {
      turn = classifyTurn(signedTurnAngle(previousBearing, bearing));
    }

    const meters = Math.round(routeStep.distanceMeters);
    const distanceText = pack.meters(meters);
    let lead: string | null = null;
    if (turn) lead = pack.turnLead[turn];
    else if (isFirst && bearing !== null) {
      lead = language === 'bn' ? `${pack.compass[compassPoint(bearing)]} দিকে মুখ করে` : `Head ${pack.compass[compassPoint(bearing)]}`;
    }

    let text: string;
    if (kind === 'elevator' && floorChange) {
      text = pack.elevator(fromName, floorChange.to > floorChange.from, pack.floorLabel(floorChange.to));
      elevatorCount += 1;
    } else if (kind === 'ramp') {
      text = pack.ramp(lead, distanceText, toName);
      rampCount += 1;
    } else {
      text = pack.walk(lead, distanceText, toName);
    }
    if (isFirst) text = `${pack.start(fromName)} ${text}`;

    const callouts = buildCallouts(routeStep, options.edgeWidths?.[routeStep.edgeId], pack);
    if (callouts.length > 0) careSections += 1;
    steepest = Math.max(steepest, Math.abs(routeStep.slopePercent));

    cumulative += routeStep.distanceMeters;
    if (bearing !== null) previousBearing = bearing;

    steps.push({
      index: steps.length + 1,
      kind,
      turn,
      edgeId: routeStep.edgeId,
      fromNodeId: routeStep.fromNodeId,
      toNodeId: routeStep.toNodeId,
      text,
      callouts,
      spoken: [text, ...callouts].join(' '),
      distanceMeters: meters,
      cumulativeMeters: Math.round(cumulative),
      remainingMeters: Math.max(0, Math.round(totalExact - cumulative)),
      bearingDegrees: bearing === null ? null : Math.round(bearing),
      heading: bearing === null ? null : compassPoint(bearing),
    });
  });

  const lastStep = route.steps[route.steps.length - 1];
  if (lastStep) {
    const destinationNode = nodeById.get(lastStep.toNodeId);
    const destinationName = localizedName(destinationNode, lastStep.toName, language);
    const arrivalText = pack.arrive(destinationName);
    steps.push({
      index: steps.length + 1,
      kind: 'arrive',
      turn: null,
      edgeId: null,
      fromNodeId: lastStep.toNodeId,
      toNodeId: lastStep.toNodeId,
      text: arrivalText,
      callouts: [],
      spoken: arrivalText,
      distanceMeters: 0,
      cumulativeMeters: Math.round(totalExact),
      remainingMeters: 0,
      bearingDegrees: null,
      heading: null,
    });
  }

  const highlights: string[] = [];
  if (rampCount > 0) highlights.push(pack.highlights.ramps(rampCount));
  if (elevatorCount > 0) highlights.push(pack.highlights.elevators(elevatorCount));
  if (steepest >= STEEP_SLOPE_PERCENT) {
    highlights.push(pack.highlights.steepest(pack.digits(formatNumber(Math.round(steepest * 10) / 10))));
  }
  if (careSections > 0) highlights.push(pack.highlights.careSections(careSections));
  if (highlights.length === 0) highlights.push(pack.highlights.allClear);

  const title = pack.title(route);
  const summary = pack.summary(Math.round(route.totalDistanceMeters), Math.round(route.estimatedMinutes), steps.length);
  const script = [title + '.', summary, ...steps.map((step) => `${pack.stepWord(step.index)}. ${step.spoken}`)].join(' ');

  return {
    language,
    routeId: route.id,
    title,
    summary,
    highlights,
    steps,
    script,
    totalDistanceMeters: Math.round(route.totalDistanceMeters),
    estimatedMinutes: Math.round(route.estimatedMinutes),
  };
}

/** Convenience helper: both languages at once (used by shared-route links). */
export function buildBilingualDirections(
  route: CalculatedRouteDTO,
  locations: LocationNodeDTO[],
  options: Omit<BuildDirectionsOptions, 'language'> = {}
): Record<DirectionLanguage, RouteDirectionsDTO> {
  return {
    en: buildRouteDirections(route, locations, { ...options, language: 'en' }),
    bn: buildRouteDirections(route, locations, { ...options, language: 'bn' }),
  };
}
