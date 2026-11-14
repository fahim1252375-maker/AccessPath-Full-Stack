import { GoogleGenAI, Type } from '@google/genai';
import { env } from '../../config/env.ts';
import { db } from '../../repositories/db.ts';
import { logger } from '../../utils/logger.ts';
import {
  calculateAccessibleRoutes,
  describeAppliedConstraints,
} from '../routing/dijkstra.ts';
import { assessEdgeTrust } from '../trust/trustEngine.ts';
import type {
  AIAnalyticsQAResponseDTO,
  AIAssistantResponseDTO,
  AIAssistantSourceDTO,
  AIClassificationDTO,
  AccessibilityPreferences,
  AccessibilityReportDTO,
  BuildingDTO,
  EquipmentIncidentDTO,
  FloorPlanDTO,
  LiveFacilityStatusDTO,
  LocationNodeDTO,
  MaintenanceTaskDTO,
  PathEdgeDTO,
  ReportCategory,
  ReportPriority,
} from '../../../../shared/types.ts';
import { newId } from '../../utils/ids.ts';

const GEMINI_MODEL = 'gemini-4-hydrogen';

function getGeminiClient(): GoogleGenAI | null {
  if (env.AI_PROVIDER === 'mock' || !env.GEMINI_API_KEY || env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey: env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function detectLanguage(text: string): 'en' | 'bn' | 'mixed' {
  const hasBengali = /[\u0980-\u09FF]/.test(text);
  const hasLatin = /[a-zA-Z]/.test(text);
  if (hasBengali && hasLatin) return 'mixed';
  if (hasBengali) return 'bn';
  return 'en';
}

function detectMissingReportDetails(text: string, locationHint?: string): string[] {
  const missing: string[] = [];
  const lower = text.toLowerCase();
  const hasLocation =
    Boolean(locationHint && locationHint.trim().length >= 3) ||
    /(library|science|gate|union|cafeteria|auditorium|medical|building|floor|room|লাইব্রেরি|গেট|ভবন|তলা)/i.test(text);
  if (!hasLocation) {
    missing.push('Exact building entrance, floor number, or nearest landmark');
  }
  if (!/(ramp|width|slope|meter|cm|stairs|step|door|elevator|lift|র‍্যাম্প|সিঁড়ি|লিফট|দরজা)/i.test(lower)) {
    missing.push('Physical dimensions or structural barrier type (e.g. slope, width, stair count)');
  }
  if (!/(detour|alternative|blocked|passable|বন্ধ|বিকল্প)/i.test(lower)) {
    missing.push('Whether any step-free alternative path nearby remains passable');
  }
  return missing;
}

function mockClassifyText(text: string, locationHint?: string): AIClassificationDTO {
  const lower = text.toLowerCase();
  const lang = detectLanguage(text);

  let category: ReportCategory = 'other';
  let impact = 'accessibility_review_needed';
  let priority: ReportPriority = 'medium';
  let action = 'Dispatch campus accessibility volunteer to inspect and document measurements.';

  if (lower.includes('elevator') || lower.includes('lift') || text.includes('লিফট')) {
    category = 'broken_elevator';
    impact = 'vertical_access_unavailable';
    priority = 'critical';
    action = 'Notify facilities electrical team and mark elevator transition temporarily unavailable.';
  } else if (
    lower.includes('construction') ||
    lower.includes('trench') ||
    lower.includes('block') ||
    text.includes('বন্ধ') ||
    text.includes('নির্মাণ')
  ) {
    category = 'construction_obstruction';
    impact = 'walkway_or_ramp_blocked';
    priority = 'high';
    action = 'Verify blockage boundaries and issue temporary route closure detour alert.';
  } else if (
    lower.includes('ramp') &&
    (lower.includes('broken') || lower.includes('damage') || lower.includes('loose') || text.includes('র‍্যাম্প') || text.includes('ভাঙ্গা'))
  ) {
    category = 'broken_ramp';
    impact = 'ramp_unsafe_for_wheelchair';
    priority = 'high';
    action = 'Restrict heavy wheelchair traffic on ramp segment and assign carpentry/masonry repair.';
  } else if (
    lower.includes('no ramp') ||
    lower.includes('missing ramp') ||
    lower.includes('stairs only') ||
    text.includes('সিঁড়ি') ||
    text.includes('সিঁড়ি')
  ) {
    category = 'missing_ramp';
    impact = 'step_free_entry_missing';
    priority = 'high';
    action = 'Evaluate portable ramp placement or capital retrofit schedule.';
  } else if (lower.includes('light') || lower.includes('dark') || text.includes('আলো') || text.includes('অন্ধকার')) {
    category = 'insufficient_lighting';
    impact = 'low_evening_visibility';
    priority = 'medium';
    action = 'Schedule campus electrical maintenance to inspect pathway lighting.';
  } else if (
    lower.includes('pavement') ||
    lower.includes('uneven') ||
    lower.includes('crack') ||
    text.includes('ইট') ||
    text.includes('উঁচু')
  ) {
    category = 'damaged_pavement';
    impact = 'surface_hazard_mobility';
    priority = 'high';
    action = 'Mark segment as caution and schedule surface leveling repair.';
  } else if (lower.includes('narrow') || text.includes('সরু')) {
    category = 'narrow_passage';
    impact = 'wheelchair_clearance_restricted';
    priority = 'medium';
    action = 'Measure clear width (< 1.2m check) and update path edge attributes.';
  }

  return {
    category,
    location: locationHint || 'Campus location pending human pin confirmation',
    description: text.slice(0, 220),
    accessibilityImpact: impact,
    suggestedPriority: priority,
    confidence: 0.84,
    requiresHumanVerification: true,
    summary:
      lang === 'bn'
        ? `AI-সহায়তায় শ্রেণিবদ্ধ (${category}): মানবিক যাচাইকরণ প্রয়োজন।`
        : `AI-assisted classification (${category}): requires human verification before altering map.`,
    suggestedAction: action,
    missingInformation: detectMissingReportDetails(text, locationHint),
    detectedLanguage: lang,
    provider: 'mock',
  };
}

async function withTimeoutAndRetry<T>(fn: () => Promise<T>, timeoutMs = 12000, retries = 1): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AI request timed out')), timeoutMs)
        ),
      ]);
      return result;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

async function logAIInteraction(entry: {
  campusId?: string;
  userId?: string;
  feature: string;
  provider: 'gemini' | 'mock';
  model: string;
  latencyMs: number;
  success: boolean;
  inputSummary: string;
  outputSummary: string;
  errorMessage?: string;
}): Promise<void> {
  try {
    await db.insert('aiInteractions', {
      id: newId('ai'),
      ...entry,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.warn('Failed to log AI interaction', { error: (err as Error).message });
  }
}

function matchLocationsFromText(text: string, locations: LocationNodeDTO[]): LocationNodeDTO[] {
  const lower = text.toLowerCase();
  const matches: LocationNodeDTO[] = [];
  const pushUnique = (loc?: LocationNodeDTO) => {
    if (loc && !matches.some((m) => m.id === loc.id)) matches.push(loc);
  };

  if (lower.includes('library') || text.includes('লাইব্রেরি') || text.includes('গ্রন্থাগার')) {
    pushUnique(locations.find((l) => l.id === 'loc_library_entrance') || locations.find((l) => l.id.includes('library')));
  }
  if (lower.includes('science') || lower.includes('lab') || text.includes('বিজ্ঞান') || text.includes('ল্যাব')) {
    pushUnique(locations.find((l) => l.id.includes('science') || l.id.includes('computer_lab')));
  }
  if (lower.includes('medical') || lower.includes('clinic') || text.includes('মেডিকেল') || text.includes('চিকিৎসা')) {
    pushUnique(locations.find((l) => l.id.includes('med')));
  }
  if (lower.includes('union') || lower.includes('commons') || text.includes('ছাত্র সংসদ')) {
    pushUnique(locations.find((l) => l.id.includes('union')));
  }
  if (lower.includes('cafeteria') || lower.includes('dining') || text.includes('ক্যাফেটেরিয়া')) {
    pushUnique(locations.find((l) => l.id.includes('cafeteria')));
  }
  if (lower.includes('auditorium') || text.includes('অডিটোরিয়াম')) {
    pushUnique(locations.find((l) => l.id.includes('auditorium')));
  }
  if (lower.includes('arts') || lower.includes('heritage')) {
    pushUnique(locations.find((l) => l.id.includes('arts')));
  }
  if (lower.includes('lecture') || lower.includes('nlc')) {
    pushUnique(locations.find((l) => l.id.includes('north_lecture')));
  }
  if (lower.includes('restroom') || lower.includes('toilet') || lower.includes('washroom') || text.includes('ওয়াশরুম') || text.includes('শৌচাগার')) {
    for (const loc of locations) {
      if (loc.hasAccessibleRestroom) pushUnique(loc);
    }
  }
  if (lower.includes('elevator') || lower.includes('lift') || text.includes('লিফট')) {
    for (const loc of locations) {
      if (loc.hasElevator) pushUnique(loc);
    }
  }

  for (const loc of locations) {
    const firstWord = loc.name.toLowerCase().split(' ')[0];
    if (firstWord.length > 3 && lower.includes(firstWord)) {
      pushUnique(loc);
    }
  }

  return matches;
}

function buildEffectivePreferences(
  message: string,
  userPrefs?: AccessibilityPreferences
): AccessibilityPreferences {
  const lower = message.toLowerCase();
  const base: AccessibilityPreferences = userPrefs
    ? { ...userPrefs }
    : {
        wheelchairMode: false,
        stepFreeMode: true,
        limitedMobilityMode: false,
        rampRequired: false,
        elevatorRequired: false,
        stairsAvoidance: true,
        smoothSurfacePreference: false,
        widePathPreference: false,
        lowGradientPreference: false,
        wellLitPreference: false,
        visualAssistanceMode: false,
        customNotes: '',
      };

  if (lower.includes('wheelchair') || message.includes('হুইলচেয়ার') || message.includes('হুইলচেয়ার')) {
    base.wheelchairMode = true;
    base.stepFreeMode = true;
    base.stairsAvoidance = true;
    base.rampRequired = true;
  }
  if (
    lower.includes('no stairs') ||
    lower.includes('without stairs') ||
    lower.includes('step-free') ||
    lower.includes('step free') ||
    message.includes('সিঁড়ি') ||
    message.includes('সিঁড়ি')
  ) {
    base.stepFreeMode = true;
    base.stairsAvoidance = true;
  }
  if (lower.includes('elevator') || lower.includes('lift') || message.includes('লিফট')) {
    base.elevatorRequired = true;
  }
  if (lower.includes('well lit') || lower.includes('night') || lower.includes('evening') || message.includes('আলো')) {
    base.wellLitPreference = true;
  }
  return base;
}

export const aiService = {
  getProviderStatus() {
    const client = getGeminiClient();
    return {
      configuredProvider: env.AI_PROVIDER,
      activeProvider: client ? 'gemini' : 'mock',
      model: GEMINI_MODEL,
      hasApiKey: Boolean(env.GEMINI_API_KEY && env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
    };
  },

  async classifyReport(params: {
    text: string;
    locationHint?: string;
    campusId?: string;
    userId?: string;
  }): Promise<AIClassificationDTO> {
    const start = Date.now();
    const client = getGeminiClient();
    const cleanText = params.text.trim().slice(0, 2000);
    const heuristicMissing = detectMissingReportDetails(cleanText, params.locationHint);

    if (!client) {
      const result = mockClassifyText(cleanText, params.locationHint);
      await logAIInteraction({
        campusId: params.campusId,
        userId: params.userId,
        feature: 'classify_report',
        provider: 'mock',
        model: 'mock-deterministic-nlp',
        latencyMs: Date.now() - start,
        success: true,
        inputSummary: `len=${cleanText.length}`,
        outputSummary: `${result.category}:${result.suggestedPriority}`,
      });
      return result;
    }

    try {
      const response = await withTimeoutAndRetry(() =>
        client.models.generateContent({
          model: GEMINI_MODEL,
          contents: `Analyze this campus accessibility barrier report (English or Bengali) and extract structured metadata plus any missing critical information that would help volunteers verify faster. Location hint: "${params.locationHint || 'Not specified'}". Report text: "${cleanText}"`,
          config: {
            systemInstruction:
              'You are an accessibility triage assistant for AccessPath. Classify barrier reports strictly into allowed categories/priorities. Always set requiresHumanVerification true. List missing practical info (exact entrance/floor, approximate dimensions/slope, detour availability) if absent. Never invent facts.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                category: {
                  type: Type.STRING,
                  enum: [
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
                  ],
                },
                location: { type: Type.STRING },
                description: { type: Type.STRING },
                accessibilityImpact: { type: Type.STRING },
                suggestedPriority: {
                  type: Type.STRING,
                  enum: ['low', 'medium', 'high', 'critical'],
                },
                confidence: { type: Type.NUMBER },
                summary: { type: Type.STRING },
                suggestedAction: { type: Type.STRING },
                missingInformation: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: [
                'category',
                'location',
                'description',
                'accessibilityImpact',
                'suggestedPriority',
                'confidence',
                'summary',
                'suggestedAction',
              ],
            },
          },
        })
      );

      const parsed = JSON.parse((response.text ?? '{}').trim());
      const result: AIClassificationDTO = {
        category: parsed.category || 'other',
        location: parsed.location || params.locationHint || 'Unspecified campus location',
        description: parsed.description || cleanText.slice(0, 200),
        accessibilityImpact: parsed.accessibilityImpact || 'requires_inspection',
        suggestedPriority: parsed.suggestedPriority || 'medium',
        confidence: Math.min(1, Math.max(0, Number(parsed.confidence ?? 0.8))),
        requiresHumanVerification: true,
        summary: parsed.summary || 'AI-classified report awaiting human verification.',
        suggestedAction: parsed.suggestedAction || 'Assign volunteer for on-site verification.',
        missingInformation:
          Array.isArray(parsed.missingInformation) && parsed.missingInformation.length > 0
            ? parsed.missingInformation
            : heuristicMissing,
        detectedLanguage: detectLanguage(cleanText),
        provider: 'gemini',
      };

      await logAIInteraction({
        campusId: params.campusId,
        userId: params.userId,
        feature: 'classify_report',
        provider: 'gemini',
        model: GEMINI_MODEL,
        latencyMs: Date.now() - start,
        success: true,
        inputSummary: `len=${cleanText.length}`,
        outputSummary: `${result.category}:${result.suggestedPriority}`,
      });
      return result;
    } catch (err) {
      logger.warn('Gemini classification failed, falling back to mock NLP', {
        error: (err as Error).message,
      });
      const fallback = mockClassifyText(cleanText, params.locationHint);
      await logAIInteraction({
        campusId: params.campusId,
        userId: params.userId,
        feature: 'classify_report',
        provider: 'mock',
        model: GEMINI_MODEL,
        latencyMs: Date.now() - start,
        success: false,
        inputSummary: `len=${cleanText.length}`,
        outputSummary: fallback.category,
        errorMessage: (err as Error).message,
      });
      return fallback;
    }
  },

  async translateText(params: {
    text: string;
    targetLanguage: 'en' | 'bn';
    campusId?: string;
    userId?: string;
  }): Promise<{ translatedText: string; targetLanguage: 'en' | 'bn'; provider: 'gemini' | 'mock' }> {
    const start = Date.now();
    const client = getGeminiClient();
    const cleanText = params.text.trim().slice(0, 2000);

    if (!client) {
      const translatedText =
        params.targetLanguage === 'bn'
          ? `[অনুবাদ (ডেমো মোড)] ${cleanText}`
          : `[Translated (Demo Mode)] ${cleanText}`;
      await logAIInteraction({
        campusId: params.campusId,
        userId: params.userId,
        feature: 'translate',
        provider: 'mock',
        model: 'mock-translator',
        latencyMs: Date.now() - start,
        success: true,
        inputSummary: `target=${params.targetLanguage}`,
        outputSummary: `len=${translatedText.length}`,
      });
      return { translatedText, targetLanguage: params.targetLanguage, provider: 'mock' };
    }

    try {
      const targetName = params.targetLanguage === 'bn' ? 'Bengali (বাংলা)' : 'English';
      const response = await withTimeoutAndRetry(() =>
        client.models.generateContent({
          model: GEMINI_MODEL,
          contents: `Translate the following campus accessibility text accurately into ${targetName}. Return JSON with translatedText.\n\nText: "${cleanText}"`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                translatedText: { type: Type.STRING },
              },
              required: ['translatedText'],
            },
          },
        })
      );
      const parsed = JSON.parse((response.text ?? '{}').trim());
      const translatedText = parsed.translatedText || cleanText;
      await logAIInteraction({
        campusId: params.campusId,
        userId: params.userId,
        feature: 'translate',
        provider: 'gemini',
        model: GEMINI_MODEL,
        latencyMs: Date.now() - start,
        success: true,
        inputSummary: `target=${params.targetLanguage}`,
        outputSummary: `len=${translatedText.length}`,
      });
      return { translatedText, targetLanguage: params.targetLanguage, provider: 'gemini' };
    } catch {
      return {
        translatedText:
          params.targetLanguage === 'bn'
            ? `[অনুবাদ উপলব্ধ নয় — মূল বার্তা] ${cleanText}`
            : `[Translation fallback] ${cleanText}`,
        targetLanguage: params.targetLanguage,
        provider: 'mock',
      };
    }
  },

  async detectDuplicates(params: {
    title: string;
    description: string;
    locationLabel: string;
    existingReports: AccessibilityReportDTO[];
  }): Promise<{
    potentialDuplicates: Array<{ reportId: string; title: string; similarityScore: number; reason: string }>;
    provider: 'gemini' | 'mock';
  }> {
    const words = new Set(
      `${params.title} ${params.description} ${params.locationLabel}`
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 3)
    );
    const matches = params.existingReports
      .filter((r) => r.status !== 'rejected' && r.status !== 'duplicate')
      .map((r) => {
        const targetWords = `${r.title} ${r.description} ${r.locationLabel}`
          .toLowerCase()
          .split(/\W+/)
          .filter((w) => w.length > 3);
        const overlap = targetWords.filter((w) => words.has(w)).length;
        const score =
          targetWords.length > 0
            ? Math.min(0.95, overlap / Math.max(4, Math.min(words.size, targetWords.length)))
            : 0;
        return {
          reportId: r.id,
          title: r.title,
          similarityScore: Number(score.toFixed(2)),
          reason: `Shares ${overlap} key location/barrier terms with "${r.locationLabel}"`,
        };
      })
      .filter((m) => m.similarityScore >= 0.35)
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 3);

    return { potentialDuplicates: matches, provider: 'mock' };
  },

  async summarizeReports(params: {
    reports: AccessibilityReportDTO[];
    campusName: string;
    campusId?: string;
    userId?: string;
  }): Promise<{
    executiveSummary: string;
    topBarrierCategories: string[];
    recommendedFocusAreas: string[];
    provider: 'gemini' | 'mock';
    disclaimer: string;
  }> {
    const start = Date.now();
    const openCount = params.reports.filter((r) => r.status !== 'resolved' && r.status !== 'rejected').length;
    const resolvedCount = params.reports.filter((r) => r.status === 'resolved').length;
    const catCounts: Record<string, number> = {};
    for (const r of params.reports) {
      catCounts[r.category] = (catCounts[r.category] || 0) + 1;
    }
    const topCats = Object.entries(catCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([c, n]) => `${c.replace(/_/g, ' ')} (${n})`);

    const client = getGeminiClient();
    const disclaimer =
      'AI insight generated from stored report records. Recommendations require human review by campus accessibility staff.';

    if (!client) {
      const summary = `${params.campusName}: ${params.reports.length} total recorded barrier reports (${openCount} active/open, ${resolvedCount} resolved). Most frequent reported issues: ${topCats.join(', ') || 'none recorded'}.`;
      await logAIInteraction({
        campusId: params.campusId,
        userId: params.userId,
        feature: 'summarize_reports',
        provider: 'mock',
        model: 'mock-analytics-summarizer',
        latencyMs: Date.now() - start,
        success: true,
        inputSummary: `reports=${params.reports.length}`,
        outputSummary: `open=${openCount}`,
      });
      return {
        executiveSummary: summary,
        topBarrierCategories: topCats,
        recommendedFocusAreas: [
          'Prioritize critical obstructions and blocked step-free corridors.',
          'Complete verification on pending reports before updating campus routing.',
        ],
        provider: 'mock',
        disclaimer,
      };
    }

    try {
      const compact = params.reports.slice(0, 20).map((r) => ({
        category: r.category,
        priority: r.priority,
        status: r.status,
        location: r.locationLabel,
      }));
      const response = await withTimeoutAndRetry(() =>
        client.models.generateContent({
          model: GEMINI_MODEL,
          contents: `Summarize these campus accessibility reports for ${params.campusName} without inventing numbers:\n${JSON.stringify(compact)}`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                executiveSummary: { type: Type.STRING },
                recommendedFocusAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['executiveSummary', 'recommendedFocusAreas'],
            },
          },
        })
      );
      const parsed = JSON.parse((response.text ?? '{}').trim());
      await logAIInteraction({
        campusId: params.campusId,
        userId: params.userId,
        feature: 'summarize_reports',
        provider: 'gemini',
        model: GEMINI_MODEL,
        latencyMs: Date.now() - start,
        success: true,
        inputSummary: `reports=${params.reports.length}`,
        outputSummary: 'ok',
      });
      return {
        executiveSummary: parsed.executiveSummary || `${params.campusName}: ${params.reports.length} reports reviewed.`,
        topBarrierCategories: topCats,
        recommendedFocusAreas: parsed.recommendedFocusAreas || [],
        provider: 'gemini',
        disclaimer,
      };
    } catch {
      return {
        executiveSummary: `${params.campusName}: ${params.reports.length} recorded reports (${openCount} open, ${resolvedCount} resolved).`,
        topBarrierCategories: topCats,
        recommendedFocusAreas: ['Verify pending barrier reports and address critical route blockages.'],
        provider: 'mock',
        disclaimer,
      };
    }
  },

  async analyzeImage(params: {
    base64Data: string;
    mimeType: string;
    note?: string;
    campusId?: string;
    userId?: string;
  }): Promise<{
    detectedBarrier: string;
    suggestedCategory: ReportCategory;
    suggestedPriority: ReportPriority;
    confidence: number;
    requiresHumanVerification: true;
    provider: 'gemini' | 'mock';
  }> {
    const start = Date.now();
    const client = getGeminiClient();
    if (!client) {
      return {
        detectedBarrier:
          params.note ||
          'Uploaded barrier photo queued for human volunteer verification (AI vision running in offline mock mode).',
        suggestedCategory: 'blocked_walkway',
        suggestedPriority: 'medium',
        confidence: 0.72,
        requiresHumanVerification: true,
        provider: 'mock',
      };
    }

    try {
      const response = await withTimeoutAndRetry(() =>
        client.models.generateContent({
          model: GEMINI_MODEL,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: params.mimeType,
                  data: params.base64Data,
                },
              },
              {
                text: `Inspect this campus photo for physical accessibility barriers (ramps, stairs, blocked walkways, damaged pavement, elevators, lighting). Context note: "${params.note || 'None'}". Return JSON.`,
              },
            ],
          },
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                detectedBarrier: { type: Type.STRING },
                suggestedCategory: {
                  type: Type.STRING,
                  enum: [
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
                  ],
                },
                suggestedPriority: { type: Type.STRING, enum: ['low', 'medium', 'high', 'critical'] },
                confidence: { type: Type.NUMBER },
              },
              required: ['detectedBarrier', 'suggestedCategory', 'suggestedPriority', 'confidence'],
            },
          },
        })
      );
      const parsed = JSON.parse((response.text ?? '{}').trim());
      await logAIInteraction({
        campusId: params.campusId,
        userId: params.userId,
        feature: 'analyze_image',
        provider: 'gemini',
        model: GEMINI_MODEL,
        latencyMs: Date.now() - start,
        success: true,
        inputSummary: params.mimeType,
        outputSummary: parsed.suggestedCategory || 'other',
      });
      return {
        detectedBarrier: parsed.detectedBarrier || 'Barrier visible; verify exact condition on site.',
        suggestedCategory: parsed.suggestedCategory || 'other',
        suggestedPriority: parsed.suggestedPriority || 'medium',
        confidence: Number(parsed.confidence ?? 0.8),
        requiresHumanVerification: true,
        provider: 'gemini',
      };
    } catch {
      return {
        detectedBarrier: 'Image attached successfully; please confirm category manually for volunteer verification.',
        suggestedCategory: 'other',
        suggestedPriority: 'medium',
        confidence: 0.65,
        requiresHumanVerification: true,
        provider: 'mock',
      };
    }
  },

  async campusAssistant(params: {
    message: string;
    campusId: string;
    userId?: string;
    buildings: BuildingDTO[];
    locations: LocationNodeDTO[];
    edges: PathEdgeDTO[];
    reports: AccessibilityReportDTO[];
    liveFacilities?: LiveFacilityStatusDTO[];
    floorPlans?: FloorPlanDTO[];
    userPreferences?: AccessibilityPreferences;
  }): Promise<AIAssistantResponseDTO> {
    const start = Date.now();
    const lang = detectLanguage(params.message);
    const lower = params.message.toLowerCase();

    const blockedEdges = params.edges.filter((e) => e.status === 'blocked' || e.temporaryClosure);
    const matchingLocations = matchLocationsFromText(params.message, params.locations);
    const effectivePrefs = buildEffectivePreferences(params.message, params.userPreferences);
    const appliedConstraints = describeAppliedConstraints(effectivePrefs);

    // Determine whether this is a route-planning request
    const isRouteIntent =
      /(go to|route|path|navigate|walk|wheelchair|get to|how to reach|avoid|stairs|যেতে|রুট|পথ|কিভাবে|সিঁড়ি|সিঁড়ি|হুইলচেয়ার)/i.test(
        params.message
      ) || matchingLocations.length > 0;

    let routeResult = null;
    let routeTarget: { fromNodeId: string; toNodeId: string } | undefined = undefined;

    if (isRouteIntent && matchingLocations.length > 0) {
      const defaultOrigin =
        params.locations.find((l) => l.id === 'loc_main_gate') || params.locations[0];
      const dest =
        matchingLocations.find((l) => l.id !== defaultOrigin?.id) || matchingLocations[0];
      const origin =
        matchingLocations.length >= 2 &&
        /(from|থেকে)/i.test(params.message)
          ? matchingLocations[0]
          : defaultOrigin;

      if (origin && dest && origin.id !== dest.id) {
        routeTarget = { fromNodeId: origin.id, toNodeId: dest.id };
        routeResult = calculateAccessibleRoutes(params.locations, params.edges, {
          campusId: params.campusId,
          fromNodeId: origin.id,
          toNodeId: dest.id,
          preferences: effectivePrefs,
          liveFacilities: params.liveFacilities || [],
          reports: params.reports,
          algorithm: 'dijkstra',
          topK: 2,
        });
      }
    }

    const calculatedPrimary =
      routeResult && routeResult.found && routeResult.routes.length > 0
        ? routeResult.routes[0]
        : null;

    // Grounding sources with verification timestamps
    const sources: AIAssistantSourceDTO[] = [];
    for (const loc of matchingLocations.slice(0, 3)) {
      sources.push({
        type: 'location',
        label: `${loc.name} (${loc.verificationStatus})`,
        verifiedAt: loc.lastVerifiedAt,
      });
    }
    if (calculatedPrimary) {
      for (const s of calculatedPrimary.steps.slice(0, 3)) {
        sources.push({
          type: 'edge',
          label: `${s.fromName} → ${s.toName} (${s.verificationStatus})`,
          verifiedAt: s.lastVerifiedAt,
        });
      }
    }
    for (const fac of (params.liveFacilities || []).filter((f) => f.status !== 'operational').slice(0, 3)) {
      sources.push({
        type: 'facility',
        label: `${fac.name}: ${fac.status.toUpperCase()}`,
        verifiedAt: fac.lastSyncAt,
      });
    }

    const client = getGeminiClient();

    if (!client) {
      let reply = '';
      if (lang === 'bn') {
        if (routeResult && !routeResult.found) {
          reply = `সতর্কতা: আপনার নির্বাচিত শর্ত (${appliedConstraints.slice(0, 2).join(', ')}) অনুযায়ী এই গন্তব্যে কোনো যাচাইকৃত প্রবেশযোগ্য রুট পাওয়া যায়নি। প্রতিবন্ধকতার কারণ: ${routeResult.blockingFactors.join('; ')}।`;
        } else if (calculatedPrimary) {
          reply = `যাচাইকৃত ক্যাম্পাস গ্রাফ অনুযায়ী ${calculatedPrimary.steps[0]?.fromName || 'শুরু'} থেকে ${calculatedPrimary.steps[calculatedPrimary.steps.length - 1]?.toName || 'গন্তব্য'} পর্যন্ত আনুমানিক দূরত্ব ${calculatedPrimary.totalDistanceMeters} মিটার (~${calculatedPrimary.estimatedMinutes} মিনিট) এবং আস্থা স্কোর ${calculatedPrimary.confidenceScore}%। ধাপগুলো: ${calculatedPrimary.steps.map((s) => s.instruction).slice(0, 3).join(' → ')}।`;
        } else if (matchingLocations.length > 0) {
          reply = `ক্যাম্পাসের যাচাইকৃত তথ্য অনুযায়ী প্রাসঙ্গিক স্থান: ${matchingLocations
            .slice(0, 3)
            .map((l) => `${l.name} (${l.isAccessibleEntrance ? 'Step-free প্রবেশযোগ্য' : 'প্রবেশাধিকার যাচাই করুন'})`)
            .join(', ')}।`;
        } else if (lower.includes('block') || params.message.includes('বন্ধ')) {
          reply =
            blockedEdges.length > 0
              ? `বর্তমানে ${blockedEdges.length}টি অংশ বন্ধ রয়েছে: ${blockedEdges.map((e) => `${e.name} (${e.closureReason || 'নির্মাণ/বাধা'})`).join(', ')}।`
              : 'বর্তমানে কোনো পথ আনুষ্ঠানিকভাবে বন্ধ হিসেবে চিহ্নিত নেই।';
        } else {
          reply =
            'আমি AccessPath AI — আপনার ক্যাম্পাস প্রবেশযোগ্যতা সহায়ক। লাইব্রেরি, বিজ্ঞান ভবন, ওয়াশরুম, লিফট অবস্থা বা বন্ধ পথ সম্পর্কে বাংলা বা ইংরেজিতে প্রশ্ন করুন। আমি সরাসরি জরুরি সেবা কল করি না—জরুরি অবস্থায় ক্যাম্পাস নিরাপত্তা ডেস্কে যোগাযোগ করুন।';
        }
      } else {
        if (routeResult && !routeResult.found) {
          reply = `No verified accessible route could be confirmed for those constraints. Blocking factors: ${routeResult.blockingFactors.join('; ')}. AccessPath never guesses or routes users down unverified stairs.`;
        } else if (calculatedPrimary) {
          reply = `Computed verified route (${calculatedPrimary.totalDistanceMeters}m, ~${calculatedPrimary.estimatedMinutes} min, ${calculatedPrimary.confidenceScore}% freshness confidence): ${calculatedPrimary.steps.map((s) => s.instruction).slice(0, 3).join(' -> ')}.${blockedEdges.length > 0 ? ` Note: Avoiding blocked segment(s): ${blockedEdges.map((e) => e.name).join(', ')}.` : ''}`;
        } else if (lower.includes('block') || lower.includes('closed') || lower.includes('outage')) {
          const outages = (params.liveFacilities || []).filter((f) => f.status !== 'operational');
          reply = `Currently ${blockedEdges.length} path edge(s) are blocked (${blockedEdges.map((e) => `${e.name}: ${e.closureReason || 'closed'}`).join('; ') || 'none'}) and ${outages.length} facility alert(s) active (${outages.map((o) => `${o.name}: ${o.status}`).join('; ') || 'none'}).`;
        } else if (matchingLocations.length > 0) {
          reply = `Verified campus locations matching your query: ${matchingLocations
            .slice(0, 3)
            .map((l) => `${l.name} (${l.facilities.join(', ')})`)
            .join('; ')}. Open Smart Route Planner for turn-by-turn guidance.`;
        } else {
          reply = `AccessPath AI is grounded in ${params.locations.length} nodes, ${params.edges.length} path edges (${blockedEdges.length} blocked), and ${params.reports.filter((r) => r.status !== 'resolved').length} open barrier reports. Ask for step-free directions (English or বাংলা), restrooms, elevator outages, or construction closures.`;
        }
      }

      await logAIInteraction({
        campusId: params.campusId,
        userId: params.userId,
        feature: 'campus_assistant',
        provider: 'mock',
        model: 'mock-grounded-assistant',
        latencyMs: Date.now() - start,
        success: true,
        inputSummary: `len=${params.message.length}`,
        outputSummary: `locs=${matchingLocations.length};route=${Boolean(calculatedPrimary)}`,
      });

      return {
        reply,
        language: lang,
        suggestedLocationIds: matchingLocations.slice(0, 3).map((l) => l.id),
        suggestedRouteTarget: routeTarget,
        calculatedRoute: calculatedPrimary,
        routeFound: routeResult ? routeResult.found : undefined,
        appliedConstraints,
        blockingFactors: routeResult?.blockingFactors || [],
        sources,
        provider: 'mock',
      };
    }

    try {
      const groundContext = {
        buildings: params.buildings.map((b) => ({
          id: b.id,
          name: b.name,
          hasElevator: b.hasElevator,
          hasAccessibleEntrance: b.hasAccessibleEntrance,
          summary: b.accessibilitySummary,
        })),
        locations: params.locations.map((l) => ({
          id: l.id,
          name: l.name,
          nameBn: l.nameBn,
          type: l.type,
          floor: l.floor,
          isAccessibleEntrance: l.isAccessibleEntrance,
          hasElevator: l.hasElevator,
          hasAccessibleRestroom: l.hasAccessibleRestroom,
          facilities: l.facilities,
          lastVerifiedAt: l.lastVerifiedAt,
        })),
        liveFacilities: (params.liveFacilities || []).map((f) => ({
          name: f.name,
          type: f.facilityType,
          status: f.status,
          notes: f.notes,
        })),
        floorPlansAvailable: (params.floorPlans || []).map((fp) => ({
          buildingId: fp.buildingId,
          floor: fp.floorLabel,
        })),
        blockedEdges: blockedEdges.map((e) => ({
          name: e.name,
          reason: e.closureReason,
        })),
        computedRouteResult: routeResult
          ? {
              found: routeResult.found,
              blockingFactors: routeResult.blockingFactors,
              primaryRoute: calculatedPrimary
                ? {
                    distanceMeters: calculatedPrimary.totalDistanceMeters,
                    estimatedMinutes: calculatedPrimary.estimatedMinutes,
                    confidenceScore: calculatedPrimary.confidenceScore,
                    steps: calculatedPrimary.steps.map((s) => s.instruction),
                    warnings: calculatedPrimary.warnings,
                  }
                : null,
            }
          : null,
        activeReportsCount: params.reports.filter((r) => r.status !== 'resolved').length,
      };

      const response = await withTimeoutAndRetry(() =>
        client.models.generateContent({
          model: GEMINI_MODEL,
          contents: `Authorized Campus Records & Server-Computed Route:\n${JSON.stringify(groundContext)}\n\nUser Message: "${params.message.slice(0, 1000)}"`,
          config: {
            systemInstruction:
              'You are AccessPath AI — Campus Accessibility Companion. Reply in the same language as the user (Bengali or English). Strictly cite ONLY the provided Authorized Campus Records and Server-Computed Route. If computedRouteResult.found is false, explain the exact blockingFactors clearly and NEVER invent an alternative path. Never claim emergency services were contacted. Return JSON.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                reply: { type: Type.STRING },
                suggestedLocationIds: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['reply', 'suggestedLocationIds'],
            },
          },
        })
      );

      const parsed = JSON.parse((response.text ?? '{}').trim());
      const ids: string[] = Array.isArray(parsed.suggestedLocationIds)
        ? parsed.suggestedLocationIds
        : matchingLocations.slice(0, 3).map((l) => l.id);

      await logAIInteraction({
        campusId: params.campusId,
        userId: params.userId,
        feature: 'campus_assistant',
        provider: 'gemini',
        model: GEMINI_MODEL,
        latencyMs: Date.now() - start,
        success: true,
        inputSummary: `len=${params.message.length}`,
        outputSummary: `locs=${ids.length}`,
      });

      return {
        reply: parsed.reply || 'Please check the Interactive Campus Map for verified details.',
        language: lang,
        suggestedLocationIds: ids,
        suggestedRouteTarget:
          routeTarget || (ids.length > 0 ? { fromNodeId: 'loc_main_gate', toNodeId: ids[0] } : undefined),
        calculatedRoute: calculatedPrimary,
        routeFound: routeResult ? routeResult.found : undefined,
        appliedConstraints,
        blockingFactors: routeResult?.blockingFactors || [],
        sources,
        provider: 'gemini',
      };
    } catch {
      return {
        reply:
          lang === 'bn'
            ? 'এই মুহূর্তে AI সংযোগে বিলম্ব হচ্ছে। অনুগ্রহ করে স্মার্ট রুট প্ল্যানারে গিয়ে আপনার পছন্দের গন্তব্য নির্বাচন করুন।'
            : 'The AI service is temporarily unavailable. You can still use the Smart Route Planner and Interactive Map directly with verified campus data.',
        language: lang,
        suggestedLocationIds: matchingLocations.slice(0, 3).map((l) => l.id),
        suggestedRouteTarget: routeTarget,
        calculatedRoute: calculatedPrimary,
        routeFound: routeResult ? routeResult.found : undefined,
        appliedConstraints,
        blockingFactors: routeResult?.blockingFactors || [],
        sources,
        provider: 'mock',
      };
    }
  },

  async analyticsAssistant(params: {
    question: string;
    campusName: string;
    campusId: string;
    userId: string;
    reports: AccessibilityReportDTO[];
    edges: PathEdgeDTO[];
    buildings: BuildingDTO[];
    incidents: EquipmentIncidentDTO[];
    tasks: MaintenanceTaskDTO[];
  }): Promise<AIAnalyticsQAResponseDTO> {
    const start = Date.now();
    const openReports = params.reports.filter((r) => !['resolved', 'rejected', 'duplicate'].includes(r.status));
    const resolvedReports = params.reports.filter((r) => r.status === 'resolved');
    const blockedEdges = params.edges.filter((e) => e.status === 'blocked' || e.temporaryClosure);
    const staleSegments = params.edges.filter((e) => {
      const trust = assessEdgeTrust(e, params.reports);
      return trust.trustState === 'STALE' || trust.trustState === 'UNVERIFIED' || trust.trustState === 'DISPUTED';
    });

    const metricsSnapshot = {
      totalReports: params.reports.length,
      openReports: openReports.length,
      resolvedReports: resolvedReports.length,
      blockedEdges: blockedEdges.length,
      staleSegments: staleSegments.length,
    };

    const disclaimer =
      'Analytics Q&A strictly summarizes non-PII operational records for the authorized campus. Staffing and compliance actions require admin approval.';

    const catMap: Record<string, number> = {};
    for (const r of params.reports) {
      catMap[r.category] = (catMap[r.category] || 0) + 1;
    }
    const topCategories = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`);

    const client = getGeminiClient();
    if (!client) {
      const highlights = [
        `Open / unresolved reports: ${openReports.length} of ${params.reports.length} total`,
        `Blocked path segments: ${blockedEdges.map((e) => e.name).join(', ') || 'None'}`,
        `Top reported categories: ${topCategories.join(' | ') || 'None'}`,
        `Equipment SLA breaches logged: ${params.incidents.filter((i) => i.slaMet === false).length}`,
      ];
      const recommendedActions = [
        blockedEdges.length > 0
          ? `Review construction/closure timelines on ${blockedEdges[0].name}`
          : 'Maintain regular volunteer path re-verification cycles',
        staleSegments.length > 0
          ? `Assign volunteers to inspect ${staleSegments.length} stale or unverified edge(s)`
          : 'All campus segments are within freshness windows',
      ];
      const answer = `${params.campusName} Operations Summary: There are ${openReports.length} open barrier reports and ${resolvedReports.length} resolved reports. ${blockedEdges.length} pathway(s) are currently blocked and ${staleSegments.length} segment(s) require inspection renewal. Active maintenance tasks: ${params.tasks.filter((t) => t.status !== 'completed').length}.`;

      await logAIInteraction({
        campusId: params.campusId,
        userId: params.userId,
        feature: 'analytics_qa',
        provider: 'mock',
        model: 'mock-analytics-qa',
        latencyMs: Date.now() - start,
        success: true,
        inputSummary: `q=${params.question.slice(0, 60)}`,
        outputSummary: `open=${openReports.length}`,
      });

      return {
        answer,
        highlights,
        recommendedActions,
        metricsSnapshot,
        disclaimer,
        provider: 'mock',
      };
    }

    try {
      // Strictly non-PII operational context
      const context = {
        campusName: params.campusName,
        metricsSnapshot,
        topCategories,
        blockedEdgeNames: blockedEdges.map((e) => ({ name: e.name, reason: e.closureReason })),
        openReportSummaries: openReports.slice(0, 15).map((r) => ({
          category: r.category,
          priority: r.priority,
          status: r.status,
          locationLabel: r.locationLabel,
        })),
        incidentCount: params.incidents.length,
        slaBreaches: params.incidents.filter((i) => i.slaMet === false).length,
        openMaintenanceTasks: params.tasks.filter((t) => t.status !== 'completed').length,
      };

      const response = await withTimeoutAndRetry(() =>
        client.models.generateContent({
          model: GEMINI_MODEL,
          contents: `Non-PII Authorized Campus Operational Dataset:\n${JSON.stringify(context)}\n\nAdmin Question: "${params.question.slice(0, 600)}"`,
          config: {
            systemInstruction:
              'You are an institutional accessibility analytics advisor. Answer strictly using the provided non-PII metrics and summaries. Never invent metrics or reference personal user details. Return JSON.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                answer: { type: Type.STRING },
                highlights: { type: Type.ARRAY, items: { type: Type.STRING } },
                recommendedActions: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['answer', 'highlights', 'recommendedActions'],
            },
          },
        })
      );
      const parsed = JSON.parse((response.text ?? '{}').trim());
      await logAIInteraction({
        campusId: params.campusId,
        userId: params.userId,
        feature: 'analytics_qa',
        provider: 'gemini',
        model: GEMINI_MODEL,
        latencyMs: Date.now() - start,
        success: true,
        inputSummary: `q=${params.question.slice(0, 60)}`,
        outputSummary: 'ok',
      });
      return {
        answer: parsed.answer || 'Operational summary generated.',
        highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
        recommendedActions: Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions : [],
        metricsSnapshot,
        disclaimer,
        provider: 'gemini',
      };
    } catch {
      return {
        answer: `${params.campusName} snapshot: ${openReports.length} open reports, ${blockedEdges.length} blocked edges, and ${staleSegments.length} segments requiring re-verification.`,
        highlights: topCategories,
        recommendedActions: ['Prioritize blocked edges and critical reports in the triage queue.'],
        metricsSnapshot,
        disclaimer,
        provider: 'mock',
      };
    }
  },
};
