import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bot,
  Compass,
  Mic,
  RotateCcw,
  Send,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore.ts';
import { api } from '../../services/api.ts';
import { Button, Input } from '../ui/Primitives.tsx';
import type { AIAssistantResponseDTO } from '../../../../shared/types.ts';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  response?: AIAssistantResponseDTO;
}

const WELCOME_MSG: Message = {
  id: 'welcome',
  role: 'assistant',
  text: 'Welcome to AccessPath AI — your Campus Accessibility Companion. Ask in English or বাংলা for verified step-free routes, restrooms, elevators, or current blockages.',
};

export const AIAssistantDrawer: React.FC = () => {
  const { aiAssistantOpen, setAiAssistantOpen, selectedCampusId } = useAppStore();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [providerMode, setProviderMode] = useState<{ activeProvider: string; model: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MSG]);

  useEffect(() => {
    if (!aiAssistantOpen) return;
    api
      .get<{ activeProvider: string; model: string }>('/ai/status')
      .then(setProviderMode)
      .catch(() => {});
  }, [aiAssistantOpen]);

  if (!aiAssistantOpen) return null;

  const speak = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = /[\u0980-\u09FF]/.test(text) ? 'bn-BD' : 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleVoiceInput = () => {
    setVoiceNote(null);
    const w = window as unknown as {
      SpeechRecognition?: new () => {
        lang: string;
        onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
        onerror: () => void;
        onend: () => void;
        start: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
        onerror: () => void;
        onend: () => void;
        start: () => void;
      };
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      setVoiceNote('Browser speech recognition is unavailable here; type or use a quick prompt.');
      return;
    }
    const rec = new SR();
    rec.lang = useAppStore.getState().language === 'bn' ? 'bn-BD' : 'en-US';
    setListening(true);
    rec.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript;
      if (transcript) setInput(transcript);
    };
    rec.onerror = () => {
      setListening(false);
      setVoiceNote('Voice capture paused or permission declined.');
    };
    rec.onend = () => setListening(false);
    rec.start();
  };

  const sendMessage = async (promptText?: string) => {
    const text = (promptText ?? input).trim();
    if (!text || loading) return;

    const userMsg: Message = { id: `u_${Date.now()}`, role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    if (!promptText) setInput('');
    setLoading(true);

    try {
      const res = await api.post<AIAssistantResponseDTO>('/ai/assistant', {
        campusId: selectedCampusId,
        message: text,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: 'assistant',
          text: res.reply,
          response: res,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          text: `Unable to reach AccessPath AI right now: ${(err as Error).message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/55"
      role="dialog"
      aria-modal="true"
      aria-label="AccessPath AI — Campus Accessibility Companion"
    >
      <div className="ap-surface w-full max-w-md bg-[var(--ap-surface)] h-full border-l border-[var(--ap-border)] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--ap-border)] bg-[#071827] text-[#F5FAFC]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#18C6AD]/15 border border-[#18C6AD]/40 flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5 text-[#18C6AD]" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold truncate">AccessPath AI</h2>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#132B3D] border border-[#224562] text-[#18C6AD]">
                  {providerMode?.activeProvider === 'gemini' ? 'Gemini Live' : 'Grounded Demo'}
                </span>
              </div>
              <p className="text-xs text-[#9AB0BE] truncate">Your Campus Accessibility Companion</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setMessages([WELCOME_MSG])}
              aria-label="Reset conversation"
              title="Reset conversation"
              className="p-2 rounded-lg text-[#9AB0BE] hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setAiAssistantOpen(false)}
              aria-label="Close AccessPath AI"
              className="p-2 rounded-lg text-[#9AB0BE] hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Prompts */}
        <div className="px-4 py-2.5 bg-[var(--ap-surface-2)] border-b border-[var(--ap-border)] flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => sendMessage('আমি লাইব্রেরিতে যেতে চাই, কিন্তু সিঁড়ি ব্যবহার করতে পারি না।')}
            className="text-xs px-2.5 py-1 rounded-md border border-[var(--ap-border)] bg-[var(--ap-surface)] hover:border-[#18C6AD] text-[var(--ap-text)] cursor-pointer"
          >
            বাংলা: লাইব্রেরি রুট
          </button>
          <button
            type="button"
            onClick={() => sendMessage('Give me a wheelchair route to Science Hall without stairs')}
            className="text-xs px-2.5 py-1 rounded-md border border-[var(--ap-border)] bg-[var(--ap-surface)] hover:border-[#18C6AD] text-[var(--ap-text)] cursor-pointer"
          >
            Wheelchair to Science
          </button>
          <button
            type="button"
            onClick={() => sendMessage('Which buildings have accessible restrooms and elevators?')}
            className="text-xs px-2.5 py-1 rounded-md border border-[var(--ap-border)] bg-[var(--ap-surface)] hover:border-[#18C6AD] text-[var(--ap-text)] cursor-pointer"
          >
            Restrooms & Lifts
          </button>
          <button
            type="button"
            onClick={() => sendMessage('Are any campus paths currently blocked or in outage?')}
            className="text-xs px-2.5 py-1 rounded-md border border-[var(--ap-border)] bg-[var(--ap-surface)] hover:border-[#18C6AD] text-[var(--ap-text)] cursor-pointer"
          >
            Closures & Outages
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[90%] rounded-xl px-4 py-3 text-sm leading-relaxed space-y-2.5 ${
                  m.role === 'user'
                    ? 'bg-[#18C6AD] text-[#04211E] font-medium'
                    : 'bg-[var(--ap-surface-2)] border border-[var(--ap-border)] text-[var(--ap-text)]'
                }`}
              >
                <p>{m.text}</p>

                {/* Calculated Route Inline Summary */}
                {m.response?.calculatedRoute && (
                  <div className="p-3 rounded-lg bg-[var(--ap-surface)] border border-[#18C6AD]/40 text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-[#18C6AD]">
                      <span>{m.response.calculatedRoute.label}</span>
                      <span className="font-mono tabular-nums">
                        {m.response.calculatedRoute.totalDistanceMeters}m · ~
                        {m.response.calculatedRoute.estimatedMinutes} min
                      </span>
                    </div>
                    <p className="text-[var(--ap-muted)]">
                      Confidence: {m.response.calculatedRoute.confidenceScore}% ·{' '}
                      {m.response.calculatedRoute.verificationSummary.replace(/_/g, ' ')}
                    </p>
                  </div>
                )}

                {/* Route Blocking Warnings */}
                {m.response && m.response.routeFound === false && m.response.blockingFactors && (
                  <div className="p-2.5 rounded-lg bg-[var(--ap-danger-bg)] border border-[var(--ap-danger-border)] text-xs text-[var(--ap-danger)] space-y-1">
                    <p className="font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      No verified step-free route found
                    </p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {m.response.blockingFactors.slice(0, 3).map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Sources & Timestamps */}
                {m.response?.sources && m.response.sources.length > 0 && (
                  <div className="text-[11px] text-[var(--ap-muted)] space-y-0.5">
                    <p className="font-semibold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#32A7D9]" />
                      Verified Data Sources:
                    </p>
                    {m.response.sources.slice(0, 3).map((s) => (
                      <p key={s.label} className="truncate">
                        • {s.label}
                        {s.verifiedAt ? ` (${new Date(s.verifiedAt).toLocaleDateString()})` : ''}
                      </p>
                    ))}
                  </div>
                )}

                {m.role === 'assistant' && (
                  <div className="pt-2 border-t border-[var(--ap-border)] flex items-center justify-between gap-2 text-xs text-[var(--ap-muted)]">
                    <button
                      type="button"
                      onClick={() => speak(m.text)}
                      className="inline-flex items-center gap-1 hover:text-[#18C6AD] cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Read aloud</span>
                    </button>
                    {m.response?.suggestedRouteTarget && (
                      <button
                        type="button"
                        onClick={() => {
                          setAiAssistantOpen(false);
                          navigate(
                            `/app/planner?from=${m.response!.suggestedRouteTarget!.fromNodeId}&to=${m.response!.suggestedRouteTarget!.toNodeId}`
                          );
                        }}
                        className="inline-flex items-center gap-1 font-semibold text-[#18C6AD] hover:underline cursor-pointer"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>Open in Route Planner</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="text-xs text-[var(--ap-muted)] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#18C6AD] animate-ping" />
              <span>Computing verified graph & campus records...</span>
            </div>
          )}
        </div>

        {voiceNote && (
          <div className="px-4 py-1.5 bg-[var(--ap-surface-2)] border-t border-[var(--ap-border)] text-[11px] text-[var(--ap-muted)]">
            {voiceNote}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="p-4 border-t border-[var(--ap-border)] bg-[var(--ap-surface)] flex items-center gap-2"
        >
          <button
            type="button"
            onClick={handleVoiceInput}
            aria-label={listening ? 'Listening for voice input' : 'Voice input'}
            className={`p-2.5 rounded-lg border border-[var(--ap-border)] cursor-pointer ${
              listening
                ? 'bg-[#18C6AD] text-[#04211E]'
                : 'bg-[var(--ap-surface-2)] text-[var(--ap-muted)] hover:text-[#18C6AD]'
            }`}
          >
            <Mic className="w-4 h-4" />
          </button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask in English or বাংলা..."
            aria-label="Ask AccessPath AI"
          />
          <Button type="submit" disabled={loading || !input.trim()} aria-label="Send message">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};
