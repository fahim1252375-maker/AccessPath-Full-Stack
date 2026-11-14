import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Share2 } from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAppStore } from '../../store/useAppStore.ts';
import { Button } from '../ui/Primitives.tsx';
import type { AccessibilityPreferences, RouteShareLinkDTO } from '../../../../shared/types.ts';

interface ShareRouteButtonProps {
  campusId: string;
  fromNodeId: string;
  toNodeId: string;
  preferences: AccessibilityPreferences;
  algorithm: 'dijkstra' | 'astar';
}

const isAbort = (error: unknown): boolean => error instanceof DOMException && error.name === 'AbortError';

/**
 * Creates a signed, expiring, read-only link to the current route and shares it with the
 * native share sheet when available, falling back to the clipboard and a visible text field.
 */
export const ShareRouteButton: React.FC<ShareRouteButtonProps> = ({
  campusId,
  fromNodeId,
  toNodeId,
  preferences,
  algorithm,
}) => {
  const { t } = useTranslation();
  const language = useAppStore((state) => state.language);
  const announce = useAppStore((state) => state.announce);
  const tr = useCallback(
    (key: string, options?: Record<string, unknown>) => t(key, { ...options, lng: language }),
    [t, language]
  );

  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState('');
  const [message, setMessage] = useState('');

  const handleShare = async () => {
    setBusy(true);
    setMessage('');
    try {
      const link = await api.post<RouteShareLinkDTO>('/routes/share', {
        campusId,
        fromNodeId,
        toNodeId,
        preferences,
        algorithm,
      });
      const absoluteUrl = `${window.location.origin}${link.path}`;
      const expires = new Date(link.expiresAt).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      setUrl(absoluteUrl);

      let text = tr('navAssist.share.created');
      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({ title: 'AccessPath', url: absoluteUrl });
        } catch (error) {
          if (!isAbort(error)) throw error;
        }
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(absoluteUrl);
        text = tr('navAssist.share.copied', { date: expires });
      }
      setMessage(text);
      announce(text);
    } catch {
      const text = tr('navAssist.share.failed');
      setMessage(text);
      announce(text);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button size="sm" variant="outline" onClick={handleShare} disabled={busy}>
        <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
        <span>{busy ? tr('navAssist.share.creating') : tr('navAssist.share.button')}</span>
      </Button>
      {url && (
        <input
          readOnly
          value={url}
          aria-label={tr('navAssist.share.button')}
          onFocus={(event) => event.currentTarget.select()}
          className="w-full px-3 py-2 text-xs border border-[var(--ap-border)] rounded-lg bg-[var(--ap-surface-2)] text-[var(--ap-text)]"
        />
      )}
      <p role="status" aria-live="polite" className="text-xs text-[#18C6AD] font-medium min-h-[1rem]">
        {message}
      </p>
      {url && <p className="text-[11px] text-[var(--ap-muted)]">{tr('navAssist.share.note')}</p>}
    </div>
  );
};
