import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Heart, History, RefreshCw, Trash2 } from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAppStore } from '../../store/useAppStore.ts';
import { AccessibilityQuickControls } from '../../components/accessibility/AccessibilityControls.tsx';
import {
  Button,
  Card,
  EmptyState,
  FormField,
  HelpButton,
  Input,
  Select,
  SkeletonRows,
} from '../../components/ui/Primitives.tsx';
import type { AnnouncementDTO, LocationNodeDTO, NotificationDTO } from '../../../../shared/types.ts';

export const SavedAndHistoryPage: React.FC = () => {
  const { user } = useAppStore();
  const queryClient = useQueryClient();

  const { data: favorites, isLoading: loadingFavs } = useQuery({
    queryKey: ['favorites'],
    queryFn: () =>
      api.get<Array<{ id: string; locationNodeId: string; label?: string; location: LocationNodeDTO | null }>>(
        '/routes/favorites'
      ),
    enabled: Boolean(user),
  });

  const { data: history, isLoading: loadingHist } = useQuery({
    queryKey: ['route-history'],
    queryFn: () => api.get<any[]>('/routes/history'),
    enabled: Boolean(user),
  });

  if (!user) {
    return (
      <EmptyState
        title="Sign in to view Saved Locations & Route History"
        description="Your favorite places and past verified routes are stored securely on your account."
        action={<Link to="/auth/signin"><Button>Sign In</Button></Link>}
      />
    );
  }

  const removeFav = async (locationNodeId: string) => {
    await api.delete(`/routes/favorites/${locationNodeId}`);
    queryClient.invalidateQueries({ queryKey: ['favorites'] });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[var(--ap-text)]">Saved Locations &amp; Route History</h1>
        <HelpButton featureId="F049" label="Saved Places Guide" />
      </div>

      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-[#18C6AD]" />
            <h2 className="text-base font-bold text-[var(--ap-text)]">Favorite Places</h2>
          </div>
          <span className="text-xs text-[var(--ap-muted)] tabular-nums">{favorites?.length || 0} saved</span>
        </div>
        {loadingFavs ? (
          <SkeletonRows rows={2} />
        ) : !favorites || favorites.length === 0 ? (
          <p className="text-xs text-[var(--ap-muted)]">No favorite locations saved yet. Save places from Campus Explorer.</p>
        ) : (
          <div className="divide-y divide-[var(--ap-border)]">
            {favorites.map((fav) => (
              <div key={fav.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <Link
                    to={`/app/places/${fav.locationNodeId}`}
                    className="text-sm font-bold text-[#18C6AD] hover:underline"
                  >
                    {fav.location?.name || fav.label || fav.locationNodeId}
                  </Link>
                  <p className="text-xs text-[var(--ap-muted)]">{fav.location?.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link to={`/app/planner?to=${fav.locationNodeId}`}>
                    <Button size="sm" variant="outline">Route</Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeFav(fav.locationNodeId)}
                    aria-label="Remove favorite"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-[var(--ap-danger)]" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#32A7D9]" />
            <h2 className="text-base font-bold text-[var(--ap-text)]">Recent &amp; Saved Routes</h2>
          </div>
          <HelpButton featureId="F070" label="History Guide" />
        </div>
        {loadingHist ? (
          <SkeletonRows rows={3} />
        ) : !history || history.length === 0 ? (
          <p className="text-xs text-[var(--ap-muted)]">No routes calculated yet. Open Smart Route Planner to calculate a path.</p>
        ) : (
          <div className="divide-y divide-[var(--ap-border)]">
            {history.map((h) => (
              <div key={h.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <p className="font-bold text-[var(--ap-text)] text-sm">
                    {h.fromName} &rarr; {h.toName} {h.isSaved ? '· Saved' : ''}
                  </p>
                  <p className="text-[var(--ap-muted)] tabular-nums">
                    Est. {h.distanceMeters}m · ~{h.estimatedMinutes} min · {new Date(h.createdAt).toLocaleString()}
                  </p>
                </div>
                <Link to={`/app/planner?from=${h.fromNodeId}&to=${h.toNodeId}`}>
                  <Button size="sm" variant="outline">Re-open Route</Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export const NotificationsPage: React.FC = () => {
  const { user, selectedCampusId, announce } = useAppStore();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['my-notifications'],
    queryFn: () => api.get<NotificationDTO[]>('/admin/notifications'),
    enabled: Boolean(user),
  });

  const { data: announcements } = useQuery({
    queryKey: ['campus-announcements', selectedCampusId],
    queryFn: () => api.get<AnnouncementDTO[]>(`/admin/announcements?campusId=${selectedCampusId}`),
  });

  const markRead = async (id: string) => {
    await api.patch(`/admin/notifications/${id}/read`);
    announce('Notification marked as read.');
    queryClient.invalidateQueries({ queryKey: ['my-notifications'] });
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[var(--ap-text)]">Notifications &amp; Campus Alerts</h1>
        <HelpButton featureId="F141" label="Alerts Guide" />
      </div>

      {announcements && announcements.length > 0 && (
        <Card className="space-y-3">
          <h2 className="text-sm font-bold text-[var(--ap-text)]">Campus Announcements</h2>
          {announcements.map((a) => (
            <div
              key={a.id}
              className="p-3 rounded-lg bg-[var(--ap-warn-bg)] border border-[var(--ap-warn-border)] text-xs"
            >
              <p className="font-bold text-[var(--ap-warn)]">{a.title}</p>
              <p className="text-[var(--ap-text)] mt-0.5">{a.message}</p>
            </div>
          ))}
        </Card>
      )}

      {!user ? (
        <EmptyState
          title="Sign in for personal notifications"
          description="Receive report status updates, verification results, and route closure alerts."
          action={<Link to="/auth/signin"><Button>Sign In</Button></Link>}
        />
      ) : isLoading ? (
        <SkeletonRows rows={3} />
      ) : !notifications || notifications.length === 0 ? (
        <EmptyState title="No notifications yet" description="You are all caught up." />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                n.read ? 'opacity-75' : 'border-[#18C6AD]/40'
              }`}
            >
              <div className="space-y-1">
                <p className="text-sm font-bold text-[var(--ap-text)]">
                  {n.title}{' '}
                  {!n.read && <span className="text-[#18C6AD] text-xs font-semibold">· Unread</span>}
                </p>
                <p className="text-xs text-[var(--ap-muted)]">{n.message}</p>
                <p className="text-xs text-[var(--ap-muted)] tabular-nums">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
              {!n.read && (
                <Button size="sm" variant="outline" onClick={() => markRead(n.id)}>
                  Mark Read
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export const PersonalSettingsPage: React.FC = () => {
  const {
    user,
    setAuth,
    offlineDrafts,
    removeOfflineDraft,
    cachedCampusGraph,
    selectedCampusId,
  } = useAppStore();
  const queryClient = useQueryClient();
  const [name, setName] = useState(user?.name || '');
  const [consentAnalytics, setConsentAnalytics] = useState(user?.consentAnalytics ?? true);
  const [consentLocation, setConsentLocation] = useState(user?.consentLocation ?? false);
  const [saved, setSaved] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [transferCampusId, setTransferCampusId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferMsg, setTransferMsg] = useState('');
  const [transferErr, setTransferErr] = useState('');

  const { data: campuses } = useQuery({
    queryKey: ['settings-campuses'],
    queryFn: () => api.get<Array<{ id: string; name: string; graphVersion?: number }>>('/campuses'),
  });

  const { data: myTransfers } = useQuery({
    queryKey: ['my-transfer-requests'],
    queryFn: () => api.get<any[]>('/auth/transfer-requests'),
    enabled: Boolean(user),
  });

  const liveCampus = (campuses || []).find((c) => c.id === selectedCampusId);
  const cachedVersion = cachedCampusGraph?.graphVersion || 1;
  const liveVersion = liveCampus?.graphVersion || 1;
  const graphCacheStale = Boolean(
    cachedCampusGraph && liveCampus && liveVersion > cachedVersion
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const res = await api.patch<{ user: any }>('/auth/profile', {
      name,
      consentAnalytics,
      consentLocation,
    });
    setAuth(res.user);
    setSaved(true);
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferErr('');
    setTransferMsg('');
    try {
      await api.post('/auth/transfer-request', {
        toCampusId: transferCampusId,
        reason: transferReason,
      });
      setTransferReason('');
      setTransferMsg('Campus transfer request submitted for administrator approval.');
      queryClient.invalidateQueries({ queryKey: ['my-transfer-requests'] });
    } catch (err) {
      setTransferErr((err as Error).message);
    }
  };

  const syncOfflineDrafts = async () => {
    if (!user || offlineDrafts.length === 0) return;
    let synced = 0;
    for (const d of offlineDrafts) {
      await api.post('/reports', {
        campusId: d.campusId,
        clientRequestId: d.clientRequestId || d.id,
        title: d.title,
        description: d.description,
        category: d.category,
        priority: d.priority,
        locationLabel: d.locationLabel,
        language: d.language,
      });
      removeOfflineDraft(d.id);
      synced++;
    }
    setSyncMsg(`Synchronized ${synced} offline report draft(s) with idempotent deduplication.`);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[var(--ap-text)]">Personal Settings, Privacy &amp; Offline Sync</h1>
        <HelpButton featureId="F027" label="Privacy Guide" />
      </div>

      <Card className="space-y-4">
        <h2 className="text-base font-bold text-[var(--ap-text)]">Display, Theme &amp; Interface Accessibility</h2>
        <AccessibilityQuickControls />
      </Card>

      {user && (
        <Card className="space-y-4">
          <h2 className="text-base font-bold text-[var(--ap-text)]">Account &amp; Privacy Controls</h2>
          {saved && (
            <p className="text-xs text-[var(--ap-ok)] font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Settings updated.</span>
            </p>
          )}
          <form onSubmit={handleSave} className="space-y-4">
            <FormField label="Display Name" htmlFor="set-name">
              <Input id="set-name" value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>
            <div className="p-3 rounded-lg bg-[var(--ap-surface-2)] border border-[var(--ap-border)] text-xs text-[var(--ap-muted)]">
              Assigned Campus: <strong className="text-[var(--ap-text)]">{user.campusId}</strong> (Tenant membership can only change via authorized administrator review below.)
            </div>
            <label className="flex items-center gap-2 text-xs text-[var(--ap-text)] cursor-pointer">
              <input
                type="checkbox"
                checked={consentAnalytics}
                onChange={(e) => setConsentAnalytics(e.target.checked)}
                className="accent-[#18C6AD]"
              />
              <span>Include anonymized route stats in campus accessibility analytics</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-[var(--ap-text)] cursor-pointer">
              <input
                type="checkbox"
                checked={consentLocation}
                onChange={(e) => setConsentLocation(e.target.checked)}
                className="accent-[#18C6AD]"
              />
              <span>Remember permission for active-session GPS location lookup</span>
            </label>
            <Button type="submit">Save Profile Settings</Button>
          </form>
        </Card>
      )}

      {user && (
        <Card className="space-y-4">
          <h2 className="text-base font-bold text-[var(--ap-text)]">Request Campus Transfer</h2>
          <p className="text-xs text-[var(--ap-muted)]">
            Moving between institutions requires Campus Administrator approval and revokes existing session tokens on completion.
          </p>
          {transferMsg && <p className="text-xs font-semibold text-[var(--ap-ok)]">{transferMsg}</p>}
          {transferErr && <p className="text-xs font-semibold text-[var(--ap-danger)]">{transferErr}</p>}
          <form onSubmit={handleTransferSubmit} className="space-y-3">
            <FormField label="Target Campus" htmlFor="transfer-campus" required>
              <Select
                id="transfer-campus"
                value={transferCampusId}
                onChange={(e) => setTransferCampusId(e.target.value)}
                required
              >
                <option value="">Select destination campus...</option>
                {(campuses || [])
                  .filter((c) => c.id !== user.campusId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.id})
                    </option>
                  ))}
              </Select>
            </FormField>
            <FormField label="Transfer Reason" htmlFor="transfer-reason" required>
              <Input
                id="transfer-reason"
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                placeholder="e.g., Semester exchange or academic department transfer"
                minLength={5}
                required
              />
            </FormField>
            <Button type="submit" size="sm" variant="outline" disabled={!transferCampusId}>
              Submit Transfer Request
            </Button>
          </form>
          {myTransfers && myTransfers.length > 0 && (
            <div className="pt-3 border-t border-[var(--ap-border)] space-y-2 text-xs">
              <p className="font-bold text-[var(--ap-text)]">My Transfer Requests</p>
              {myTransfers.map((tr) => (
                <div
                  key={tr.id}
                  className="flex items-center justify-between p-2 rounded bg-[var(--ap-surface-2)] border border-[var(--ap-border)] text-[var(--ap-text)]"
                >
                  <span>{tr.fromCampusId} &rarr; {tr.toCampusId} · {tr.reason}</span>
                  <span className="font-semibold capitalize text-[#18C6AD]">{tr.status}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Card className="space-y-3">
        <h2 className="text-base font-bold text-[var(--ap-text)]">Offline Cache &amp; Draft Queue</h2>
        <p className="text-xs text-[var(--ap-muted)]">
          Cached Campus Graph:{' '}
          {cachedCampusGraph
            ? `${cachedCampusGraph.locations.length} nodes (v${cachedVersion}) cached at ${new Date(cachedCampusGraph.cachedAt).toLocaleString()}`
            : 'Not cached yet — open Interactive Map once to cache.'}
        </p>
        {graphCacheStale && (
          <p className="text-xs font-semibold text-[var(--ap-warn)] bg-[var(--ap-warn-bg)] p-2.5 rounded border border-[var(--ap-warn-border)]">
            Stale offline graph detected: Cached v{cachedVersion}, live campus is v{liveVersion}. Open Interactive Map while online to refresh.
          </p>
        )}
        <p className="text-xs text-[var(--ap-muted)]">
          Pending Offline Report Drafts: <strong className="tabular-nums text-[var(--ap-text)]">{offlineDrafts.length}</strong>
        </p>
        {syncMsg && <p className="text-xs text-[var(--ap-ok)] font-semibold">{syncMsg}</p>}
        {offlineDrafts.length > 0 && user && (
          <Button size="sm" variant="secondary" onClick={syncOfflineDrafts}>
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Offline Drafts Now</span>
          </Button>
        )}
      </Card>
    </div>
  );
};
