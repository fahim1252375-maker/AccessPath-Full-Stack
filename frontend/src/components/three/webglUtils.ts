import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore.ts';

export interface WebGLCapability {
  supported: boolean;
  isSoftware: boolean;
}

let cachedCapability: WebGLCapability | null = null;

export function detectWebGLCapability(): WebGLCapability {
  if (cachedCapability) return cachedCapability;
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    cachedCapability = { supported: false, isSoftware: false };
    return cachedCapability;
  }
  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: false }) as WebGL2RenderingContext | null) ||
      (canvas.getContext('webgl', { failIfMajorPerformanceCaveat: false }) as WebGLRenderingContext | null);
    if (!gl) {
      cachedCapability = { supported: false, isSoftware: false };
      return cachedCapability;
    }

    let isSoftware = false;
    try {
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '') : '';
      if (/SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(renderer)) {
        isSoftware = true;
      }
    } catch {
      // Ignore debug info errors
    }

    // Immediately release probe context so we do not leak WebGL contexts
    try {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    } catch {
      // Ignore lose_context absence
    }

    cachedCapability = { supported: true, isSoftware };
    return cachedCapability;
  } catch {
    cachedCapability = { supported: false, isSoftware: false };
    return cachedCapability;
  }
}

export function useInViewport(ref: React.RefObject<HTMLElement | null>, rootMargin = '120px'): boolean {
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]) {
          setInView(entries[0].isIntersecting);
        }
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rootMargin]);

  return inView;
}

interface ErrorBoundaryProps {
  fallback: React.ReactNode;
  onError?: () => void;
  children?: React.ReactNode;
}

class SceneErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  { hasError: boolean }
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(): void {
    this.props.onError?.();
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export const WebGLSceneWrapper: React.FC<{
  fallback: React.ReactNode;
  loadingFallback?: React.ReactNode;
  forceFallback?: boolean;
  children: React.ReactNode;
}> = ({ fallback, loadingFallback, forceFallback = false, children }) => {
  const lowBandwidth = useAppStore((s) => s.lowBandwidth);
  const [contextLost, setContextLost] = useState(false);
  const cap = detectWebGLCapability();

  if (forceFallback || lowBandwidth || !cap.supported || contextLost) {
    return React.createElement(React.Fragment, null, fallback);
  }

  return React.createElement(
    SceneErrorBoundary,
    { fallback, onError: () => setContextLost(true) },
    React.createElement(React.Suspense, { fallback: loadingFallback ?? fallback }, children)
  );
};
