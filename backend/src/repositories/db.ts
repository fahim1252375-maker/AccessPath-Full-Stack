import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { env } from '../config/env.ts';
import { logger } from '../utils/logger.ts';
import { MongooseModels } from '../models/mongooseModels.ts';

export type CollectionName =
  | 'institutions'
  | 'users'
  | 'userSessions'
  | 'campusTransferRequests'
  | 'campuses'
  | 'buildings'
  | 'locations'
  | 'pathEdges'
  | 'accessibilityProfiles'
  | 'accessibilityReports'
  | 'reportEvidence'
  | 'verifications'
  | 'maintenanceTasks'
  | 'routeHistory'
  | 'favoriteLocations'
  | 'notifications'
  | 'announcements'
  | 'campusIntegrations'
  | 'auditLogs'
  | 'aiInteractions'
  | 'emergencyRoutes'
  | 'floorPlans'
  | 'liveFacilities'
  | 'facilitySubscriptions'
  | 'classScheduleItems'
  | 'equipmentIncidents'
  | 'graphVersions';

const modelMap: Record<CollectionName, mongoose.Model<any>> = {
  institutions: MongooseModels.Institution,
  users: MongooseModels.User,
  userSessions: MongooseModels.UserSession,
  campusTransferRequests: MongooseModels.CampusTransferRequest,
  campuses: MongooseModels.Campus,
  buildings: MongooseModels.Building,
  locations: MongooseModels.Location,
  pathEdges: MongooseModels.PathEdge,
  accessibilityProfiles: MongooseModels.AccessibilityProfile,
  accessibilityReports: MongooseModels.AccessibilityReport,
  reportEvidence: MongooseModels.ReportEvidence,
  verifications: MongooseModels.Verification,
  maintenanceTasks: MongooseModels.MaintenanceTask,
  routeHistory: MongooseModels.RouteHistory,
  favoriteLocations: MongooseModels.FavoriteLocation,
  notifications: MongooseModels.Notification,
  announcements: MongooseModels.Announcement,
  campusIntegrations: MongooseModels.CampusIntegration,
  auditLogs: MongooseModels.AuditLog,
  aiInteractions: MongooseModels.AIInteraction,
  emergencyRoutes: MongooseModels.EmergencyRoute,
  floorPlans: MongooseModels.FloorPlan,
  liveFacilities: MongooseModels.LiveFacilityStatus,
  facilitySubscriptions: MongooseModels.FacilitySubscription,
  classScheduleItems: MongooseModels.ClassScheduleItem,
  equipmentIncidents: MongooseModels.EquipmentIncident,
  graphVersions: MongooseModels.GraphVersion,
};

const ALL_COLLECTIONS = Object.keys(modelMap) as CollectionName[];

type StoreData = Record<CollectionName, any[]>;

function emptyStore(): StoreData {
  return {
    institutions: [],
    users: [],
    userSessions: [],
    campusTransferRequests: [],
    campuses: [],
    buildings: [],
    locations: [],
    pathEdges: [],
    accessibilityProfiles: [],
    accessibilityReports: [],
    reportEvidence: [],
    verifications: [],
    maintenanceTasks: [],
    routeHistory: [],
    favoriteLocations: [],
    notifications: [],
    announcements: [],
    campusIntegrations: [],
    auditLogs: [],
    aiInteractions: [],
    emergencyRoutes: [],
    floorPlans: [],
    liveFacilities: [],
    facilitySubscriptions: [],
    classScheduleItems: [],
    equipmentIncidents: [],
    graphVersions: [],
  };
}

class AccessPathDatabase {
  private mode: 'mongoose' | 'local' = 'local';
  private store: StoreData = emptyStore();
  private persistPath: string;
  private initialized = false;
  private persistEnabled = true;
  private lastBackupAt: string | null = null;
  private lastIntegrityCheckAt: string | null = null;

  constructor() {
    this.persistPath = path.resolve(process.cwd(), 'data', 'accesspath-db.json');
  }

  public getMode(): 'mongoose' | 'local' {
    return this.mode;
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public getMetadata() {
    return {
      mode: this.mode,
      initialized: this.initialized,
      persistPath: this.mode === 'local' ? this.persistPath : 'mongodb',
      lastBackupAt: this.lastBackupAt,
      lastIntegrityCheckAt: this.lastIntegrityCheckAt,
    };
  }

  public async connect(options?: { memoryOnly?: boolean; dbPath?: string }): Promise<void> {
    if (options?.memoryOnly) {
      this.mode = 'local';
      this.persistEnabled = false;
      this.store = emptyStore();
      this.initialized = true;
      return;
    }

    if (options?.dbPath) {
      this.persistPath = options.dbPath;
    }

    if (env.IS_PROD && !env.MONGODB_URI) {
      throw new Error(
        'Production startup blocked: MONGODB_URI must be configured when NODE_ENV=production. Silent local JSON fallback is disabled.'
      );
    }

    if (env.MONGODB_URI && !options?.memoryOnly) {
      try {
        await mongoose.connect(env.MONGODB_URI, {
          serverSelectionTimeoutMS: 5000,
        });
        this.mode = 'mongoose';
        this.initialized = true;
        logger.info('Connected to MongoDB via Mongoose');
        return;
      } catch (err) {
        if (env.IS_PROD) {
          logger.error('MongoDB connection failed in production', {
            error: (err as Error).message,
          });
          throw new Error(
            `Production startup blocked: MongoDB connection failed (${(err as Error).message}).`
          );
        }
        logger.warn('MongoDB connection failed in development, falling back to local persistent JSON store', {
          error: (err as Error).message,
        });
      }
    }

    this.mode = 'local';
    this.persistEnabled = true;
    const dir = path.dirname(this.persistPath);
    fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(this.persistPath)) {
      try {
        const raw = fs.readFileSync(this.persistPath, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<StoreData>;
        this.store = { ...emptyStore(), ...parsed };
      } catch {
        this.store = emptyStore();
      }
    } else {
      this.store = emptyStore();
      this.flush();
    }
    this.initialized = true;
    logger.info('Initialized local persistent document store', { path: this.persistPath });
  }

  public resetMemory(): void {
    this.store = emptyStore();
    if (this.persistEnabled) {
      this.flush();
    }
  }

  private flush(): void {
    if (!this.persistEnabled || this.mode !== 'local') return;
    const dir = path.dirname(this.persistPath);
    fs.mkdirSync(dir, { recursive: true });
    const tmp = `${this.persistPath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.store, null, 2), 'utf-8');
    fs.renameSync(tmp, this.persistPath);
  }

  private matchesFilter(doc: Record<string, any>, filter: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(filter)) {
      if (value === undefined) continue;
      if (key === '$or' && Array.isArray(value)) {
        const anyMatch = value.some((sub) => this.matchesFilter(doc, sub));
        if (!anyMatch) return false;
        continue;
      }
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if ('$in' in value && Array.isArray(value.$in)) {
          if (!value.$in.includes(doc[key])) return false;
          continue;
        }
        if ('$ne' in value) {
          if (doc[key] === value.$ne) return false;
          continue;
        }
      }
      if (doc[key] !== value) return false;
    }
    return true;
  }

  public async find<T = any>(
    collection: CollectionName,
    filter: Record<string, any> = {},
    options?: { sort?: Record<string, 1 | -1>; limit?: number; skip?: number }
  ): Promise<T[]> {
    if (!this.initialized) await this.connect();
    if (this.mode === 'mongoose') {
      const q = modelMap[collection].find(filter).lean();
      if (options?.sort) q.sort(options.sort);
      if (options?.skip) q.skip(options.skip);
      if (options?.limit) q.limit(options.limit);
      return (await q.exec()) as T[];
    }
    let items = this.store[collection].filter((d) => this.matchesFilter(d, filter));
    if (options?.sort) {
      const entries = Object.entries(options.sort);
      items = [...items].sort((a, b) => {
        for (const [k, dir] of entries) {
          if (a[k] < b[k]) return -1 * dir;
          if (a[k] > b[k]) return 1 * dir;
        }
        return 0;
      });
    } else {
      items = [...items];
    }
    if (options?.skip) items = items.slice(options.skip);
    if (options?.limit) items = items.slice(0, options.limit);
    return items.map((i) => structuredClone(i));
  }

  public async findOne<T = any>(
    collection: CollectionName,
    filter: Record<string, any>
  ): Promise<T | null> {
    if (!this.initialized) await this.connect();
    if (this.mode === 'mongoose') {
      const doc = await modelMap[collection].findOne(filter).lean().exec();
      return (doc as T) || null;
    }
    const found = this.store[collection].find((d) => this.matchesFilter(d, filter));
    return found ? structuredClone(found) : null;
  }

  public async count(collection: CollectionName, filter: Record<string, any> = {}): Promise<number> {
    if (!this.initialized) await this.connect();
    if (this.mode === 'mongoose') {
      return modelMap[collection].countDocuments(filter).exec();
    }
    return this.store[collection].filter((d) => this.matchesFilter(d, filter)).length;
  }

  public async insert<T extends Record<string, any>>(
    collection: CollectionName,
    doc: T
  ): Promise<T> {
    if (!this.initialized) await this.connect();
    const now = new Date().toISOString();
    const record = {
      ...doc,
      createdAt: doc.createdAt || now,
      updatedAt: doc.updatedAt || now,
    };
    if (this.mode === 'mongoose') {
      const created = await modelMap[collection].create(record);
      return created.toObject() as T;
    }
    this.store[collection].push(structuredClone(record));
    this.flush();
    return structuredClone(record);
  }

  public async insertMany<T extends Record<string, any>>(
    collection: CollectionName,
    docs: T[]
  ): Promise<T[]> {
    if (!this.initialized) await this.connect();
    if (docs.length === 0) return [];
    const now = new Date().toISOString();
    const records = docs.map((d) => ({
      ...d,
      createdAt: d.createdAt || now,
      updatedAt: d.updatedAt || now,
    }));
    if (this.mode === 'mongoose') {
      await modelMap[collection].insertMany(records);
      return records;
    }
    for (const rec of records) {
      this.store[collection].push(structuredClone(rec));
    }
    this.flush();
    return records;
  }

  public async updateOne<T = any>(
    collection: CollectionName,
    filter: Record<string, any>,
    patch: Record<string, any>
  ): Promise<T | null> {
    if (!this.initialized) await this.connect();
    const updatedPatch = {
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    if (this.mode === 'mongoose') {
      const updated = await modelMap[collection]
        .findOneAndUpdate(filter, { $set: updatedPatch }, { new: true })
        .lean()
        .exec();
      return (updated as T) || null;
    }
    const idx = this.store[collection].findIndex((d) => this.matchesFilter(d, filter));
    if (idx === -1) return null;
    this.store[collection][idx] = {
      ...this.store[collection][idx],
      ...structuredClone(updatedPatch),
    };
    this.flush();
    return structuredClone(this.store[collection][idx]);
  }

  public async updateMany(
    collection: CollectionName,
    filter: Record<string, any>,
    patch: Record<string, any>
  ): Promise<number> {
    if (!this.initialized) await this.connect();
    const updatedPatch = {
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    if (this.mode === 'mongoose') {
      const res = await modelMap[collection].updateMany(filter, { $set: updatedPatch }).exec();
      return res.modifiedCount || 0;
    }
    let count = 0;
    this.store[collection] = this.store[collection].map((doc) => {
      if (this.matchesFilter(doc, filter)) {
        count += 1;
        return { ...doc, ...structuredClone(updatedPatch) };
      }
      return doc;
    });
    if (count > 0) this.flush();
    return count;
  }

  public async deleteOne(
    collection: CollectionName,
    filter: Record<string, any>
  ): Promise<boolean> {
    if (!this.initialized) await this.connect();
    if (this.mode === 'mongoose') {
      const res = await modelMap[collection].deleteOne(filter).exec();
      return (res.deletedCount || 0) > 0;
    }
    const idx = this.store[collection].findIndex((d) => this.matchesFilter(d, filter));
    if (idx === -1) return false;
    this.store[collection].splice(idx, 1);
    this.flush();
    return true;
  }

  public async deleteMany(
    collection: CollectionName,
    filter: Record<string, any>
  ): Promise<number> {
    if (!this.initialized) await this.connect();
    if (this.mode === 'mongoose') {
      const res = await modelMap[collection].deleteMany(filter).exec();
      return res.deletedCount || 0;
    }
    const before = this.store[collection].length;
    this.store[collection] = this.store[collection].filter((d) => !this.matchesFilter(d, filter));
    const removed = before - this.store[collection].length;
    if (removed > 0) this.flush();
    return removed;
  }

  public async exportBackup(): Promise<{
    exportedAt: string;
    schemaVersion: number;
    mode: string;
    collections: Partial<StoreData>;
  }> {
    if (!this.initialized) await this.connect();
    const collections: Partial<StoreData> = {};
    for (const col of ALL_COLLECTIONS) {
      // Never export active session secrets or user password hashes inside general audit snapshots unless needed for full restore
      collections[col] = await this.find(col, {});
    }
    this.lastBackupAt = new Date().toISOString();
    return {
      exportedAt: this.lastBackupAt,
      schemaVersion: 2,
      mode: this.mode,
      collections,
    };
  }

  public async restoreBackup(payload: {
    schemaVersion: number;
    collections: Partial<StoreData>;
  }): Promise<{ restoredCollections: number; restoredDocuments: number }> {
    if (!this.initialized) await this.connect();
    let restoredCollections = 0;
    let restoredDocuments = 0;
    for (const col of ALL_COLLECTIONS) {
      const docs = payload.collections[col];
      if (!Array.isArray(docs)) continue;
      restoredCollections += 1;
      await this.deleteMany(col, {});
      if (docs.length > 0) {
        await this.insertMany(col, docs);
        restoredDocuments += docs.length;
      }
    }
    return { restoredCollections, restoredDocuments };
  }

  public async runIntegrityCheck(): Promise<{
    ok: boolean;
    checkedAt: string;
    mode: string;
    issues: string[];
    counts: Record<string, number>;
  }> {
    if (!this.initialized) await this.connect();
    const issues: string[] = [];
    const counts: Record<string, number> = {};
    for (const col of ALL_COLLECTIONS) {
      counts[col] = await this.count(col);
    }

    const campuses = await this.find<any>('campuses');
    const campusIds = new Set(campuses.map((c) => c.id));
    const locations = await this.find<any>('locations');
    const nodeIds = new Set(locations.map((n) => n.id));
    const edges = await this.find<any>('pathEdges');

    for (const edge of edges) {
      if (!campusIds.has(edge.campusId)) {
        issues.push(`Orphan edge ${edge.id} references missing campus ${edge.campusId}`);
      }
      if (!nodeIds.has(edge.fromNodeId) || !nodeIds.has(edge.toNodeId)) {
        issues.push(`Edge ${edge.id} references missing node(s): ${edge.fromNodeId} -> ${edge.toNodeId}`);
      }
    }

    const users = await this.find<any>('users');
    for (const user of users) {
      if (!campusIds.has(user.campusId)) {
        issues.push(`User ${user.id} assigned to unknown campus ${user.campusId}`);
      }
    }

    this.lastIntegrityCheckAt = new Date().toISOString();
    return {
      ok: issues.length === 0,
      checkedAt: this.lastIntegrityCheckAt,
      mode: this.mode,
      issues,
      counts,
    };
  }
}

export const db = new AccessPathDatabase();
