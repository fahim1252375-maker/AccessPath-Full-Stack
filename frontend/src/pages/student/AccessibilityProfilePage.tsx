import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAppStore } from '../../store/useAppStore.ts';
import { Button, Card, FormField, HelpButton, Textarea } from '../../components/ui/Primitives.tsx';
import type { AccessibilityPreferences } from '../../../../shared/types.ts';

const PREFERENCE_OPTIONS: Array<{
  key: keyof Omit<AccessibilityPreferences, 'customNotes'>;
  title: string;
  desc: string;
}> = [
  { key: 'wheelchairMode', title: 'Wheelchair Navigation Mode', desc: 'Excludes stairs, unpaved paths, steep slopes (>8.5%), and paths narrower than 1.2m.' },
  { key: 'stepFreeMode', title: 'Step-Free Navigation Mode', desc: 'Requires verified step-free transitions and excludes unverified ramps or lifts.' },
  { key: 'limitedMobilityMode', title: 'Limited Mobility Mode', desc: 'Avoids stairs and reduces fatigue by favoring gentle gradients and resting plazas.' },
  { key: 'rampRequired', title: 'Ramp-Required Preference', desc: 'Requires verified accessible ramps wherever elevation changes occur.' },
  { key: 'elevatorRequired', title: 'Elevator-Required Preference', desc: 'Requires operational elevators for all multi-floor indoor transitions.' },
  { key: 'stairsAvoidance', title: 'Stairs Avoidance', desc: 'Strictly filters out staircases from recommended routes.' },
  { key: 'smoothSurfacePreference', title: 'Smooth Surface Preference', desc: 'Avoids cobblestone and rough unpaved trails; prioritizes smooth concrete/asphalt.' },
  { key: 'widePathPreference', title: 'Wide Path Preference (>= 1.5m)', desc: 'Filters out narrow corridors under 1.5 meters wide.' },
  { key: 'lowGradientPreference', title: 'Low-Gradient Route Preference (<= 5%)', desc: 'Prioritizes minimal incline slopes of 5% or less.' },
  { key: 'wellLitPreference', title: 'Well-Lit Route Preference', desc: 'Strongly favors well-lit pathways for evening safety and low-vision comfort.' },
  { key: 'visualAssistanceMode', title: 'Visual Assistance & Tactile Guidance', desc: 'Highlights tactile paving, voice floor announcers, and spoken turn-by-turn directions.' },
];

export const AccessibilityProfilePage: React.FC = () => {
  const { accessibilityProfile, setAccessibilityProfile, user, announce } = useAppStore();
  const [form, setForm] = useState<AccessibilityPreferences>(accessibilityProfile);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg('');
    try {
      if (user) {
        await api.put('/auth/accessibility-profile', form);
      }
      setAccessibilityProfile(form);
      setSavedMsg('Accessibility preferences saved. Smart Route Planner and AccessPath AI will apply these constraints automatically.');
      announce('Accessibility preferences saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ap-text)]">Accessibility Profile</h1>
          <p className="text-sm text-[var(--ap-muted)] mt-1">
            Configure your mobility and sensory routing preferences. AccessPath never asks for or stores medical diagnoses.
          </p>
        </div>
        <HelpButton featureId="F025" />
      </div>

      {savedMsg && (
        <div className="p-3.5 rounded-lg bg-[var(--ap-surface-2)] border border-[#18C6AD] text-sm text-[#18C6AD] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{savedMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          {PREFERENCE_OPTIONS.map((opt) => {
            const active = Boolean(form[opt.key]);
            return (
              <label
                key={opt.key}
                className={`ap-surface flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                  active
                    ? 'border-[#18C6AD] bg-[#18C6AD]/10'
                    : 'border-[var(--ap-border)] bg-[var(--ap-surface)] hover:border-[#32A7D9]/60'
                }`}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, [opt.key]: e.target.checked }))
                  }
                  className="mt-1 w-4 h-4 accent-[#18C6AD]"
                />
                <div>
                  <p className="text-sm font-bold text-[var(--ap-text)]">{opt.title}</p>
                  <p className="text-xs text-[var(--ap-muted)] mt-0.5 leading-relaxed">{opt.desc}</p>
                </div>
              </label>
            );
          })}
        </div>

        <Card className="space-y-4">
          <FormField
            label="Custom Accessibility Notes (Functional only)"
            htmlFor="custom-notes"
            hint="Optional functional preferences (e.g., 'Prefer covered walkways during rain'). Do not include personal medical details."
          >
            <Textarea
              id="custom-notes"
              rows={3}
              value={form.customNotes}
              onChange={(e) => setForm((prev) => ({ ...prev, customNotes: e.target.value }))}
            />
          </FormField>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Accessibility Preferences'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setForm({
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
                })
              }
            >
              Reset to Default Step-Free
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
};
