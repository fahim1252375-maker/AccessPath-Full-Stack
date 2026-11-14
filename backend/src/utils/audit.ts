import { db } from '../repositories/db.ts';
import type { UserRole } from '../../../shared/types.ts';
import { newId } from './ids.ts';

export async function recordAudit(params: {
  campusId?: string;
  actorId: string;
  actorEmail: string;
  actorRole: UserRole;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
}): Promise<void> {
  await db.insert('auditLogs', {
    id: newId('audit'),
    ...params,
    createdAt: new Date().toISOString(),
  });
}

export async function createInAppNotification(params: {
  userId: string;
  campusId: string;
  type: 'report_status' | 'verification' | 'route_alert' | 'closure' | 'maintenance' | 'announcement';
  title: string;
  message: string;
  link?: string;
}): Promise<void> {
  await db.insert('notifications', {
    id: newId('notif'),
    ...params,
    read: false,
    createdAt: new Date().toISOString(),
  });
}
