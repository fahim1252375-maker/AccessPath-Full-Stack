import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  HelpCircle,
  Info,
  X,
  XCircle,
} from 'lucide-react';
import { getFeatureById } from '../../data/featureCatalog.ts';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';
  const variants = {
    primary:
      'bg-[#18C6AD] text-[#04211E] hover:bg-[#14B29B] shadow-sm shadow-[#18C6AD]/15',
    secondary:
      'bg-[#32A7D9] text-[#041E2B] hover:bg-[#2795C4] shadow-sm shadow-[#32A7D9]/15',
    outline:
      'border border-[var(--ap-border)] bg-[var(--ap-surface)] text-[var(--ap-text)] hover:border-[#18C6AD]/60 hover:bg-[var(--ap-surface-2)]',
    ghost:
      'text-[var(--ap-text)] hover:bg-[var(--ap-surface-2)]',
    danger:
      'bg-[#DC2626] text-white hover:bg-[#B91C1C]',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs min-h-[36px]',
    md: 'px-4 py-2 text-sm min-h-[40px]',
    lg: 'px-6 py-3 text-base min-h-[44px]',
  };
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
};

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg' | 'none';
}

export const Card: React.FC<CardProps> = ({
  padding = 'md',
  className = '',
  children,
  ...props
}) => {
  const pads = {
    none: '',
    sm: 'p-4',
    md: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-8',
  };
  return (
    <div
      className={`ap-surface bg-[var(--ap-surface)] border border-[var(--ap-border)] rounded-xl ${pads[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

export const FormField: React.FC<FieldProps> = ({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
}) => (
  <div className="space-y-1.5">
    <label htmlFor={htmlFor} className="block text-sm font-semibold text-[var(--ap-text)]">
      {label}
      {required && <span className="text-[#EF4444] ml-1" aria-hidden="true">*</span>}
    </label>
    {children}
    {hint && !error && <p className="text-xs text-[var(--ap-muted)]">{hint}</p>}
    {error && (
      <p className="text-xs font-medium text-[#EF4444] dark:text-[#FCA5A5]" role="alert">
        {error}
      </p>
    )}
  </div>
);

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className = '', ...props }, ref) => (
  <input
    ref={ref}
    className={`w-full min-h-[42px] px-3.5 py-2 text-sm bg-[var(--ap-surface-2)] border border-[var(--ap-border)] rounded-lg text-[var(--ap-text)] placeholder:text-[var(--ap-muted)] focus:border-[#18C6AD] focus:outline-none ${className}`}
    {...props}
  />
));
Input.displayName = 'Input';

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className = '', children, ...props }, ref) => (
  <select
    ref={ref}
    className={`w-full min-h-[42px] px-3.5 py-2 text-sm bg-[var(--ap-surface-2)] border border-[var(--ap-border)] rounded-lg text-[var(--ap-text)] focus:border-[#18C6AD] focus:outline-none ${className}`}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = 'Select';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className = '', ...props }, ref) => (
  <textarea
    ref={ref}
    className={`w-full px-3.5 py-2.5 text-sm bg-[var(--ap-surface-2)] border border-[var(--ap-border)] rounded-lg text-[var(--ap-text)] placeholder:text-[var(--ap-muted)] focus:border-[#18C6AD] focus:outline-none ${className}`}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export const StatusLabel: React.FC<{
  status: string;
  size?: 'sm' | 'md';
}> = ({ status, size = 'sm' }) => {
  const normalized = status.toLowerCase();
  let tone = 'text-[var(--ap-muted)]';
  let Icon = Info;

  if (
    [
      'verified',
      'verified_current',
      'open',
      'resolved',
      'completed',
      'connected',
      'all_verified',
      'active',
      'operational',
      'healthy',
      'approved',
    ].includes(normalized)
  ) {
    tone = 'text-[#0B6B5F] dark:text-[#18C6AD]';
    Icon = CheckCircle2;
  } else if (
    [
      'caution',
      'pending_review',
      'under_verification',
      'in_progress',
      'assigned',
      'simulated',
      'demo_simulated',
      'ai_classified',
      'contains_caution',
      'verification_expiring',
      'stale',
      'contains_stale',
      'degraded',
      'pending',
    ].includes(normalized)
  ) {
    tone = 'text-[#92400E] dark:text-[#FBBF24]';
    Icon = Clock;
  } else if (
    [
      'blocked',
      'critical',
      'rejected',
      'disputed',
      'error',
      'unverified',
      'unverified_included',
      'outage',
      'closed',
      'unconfigured',
      'not_configured',
    ].includes(normalized)
  ) {
    tone = 'text-[#991B1B] dark:text-[#FCA5A5]';
    Icon = ['blocked', 'rejected', 'outage', 'closed'].includes(normalized)
      ? XCircle
      : AlertTriangle;
  }

  const formatted = status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold whitespace-nowrap ${
        size === 'sm' ? 'text-xs' : 'text-sm'
      } ${tone}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{formatted}</span>
    </span>
  );
};

export const Breadcrumbs: React.FC<{
  items: Array<{ label: string; to?: string }>;
}> = ({ items }) => (
  <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[var(--ap-muted)] overflow-x-auto">
    {items.map((item, idx) => (
      <React.Fragment key={item.label}>
        {idx > 0 && <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-60" aria-hidden="true" />}
        {item.to && idx < items.length - 1 ? (
          <Link to={item.to} className="hover:text-[#18C6AD] whitespace-nowrap">
            {item.label}
          </Link>
        ) : (
          <span className="font-semibold text-[var(--ap-text)] whitespace-nowrap">{item.label}</span>
        )}
      </React.Fragment>
    ))}
  </nav>
);

export const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ open, onClose, title, children }) => {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const getFocusable = () =>
      Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) || []).filter(
        (element) => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true'
      );

    // Move focus into the dialog as soon as it opens.
    (getFocusable()[0] || dialogRef.current)?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusable = getFocusable();
      if (focusable.length === 0) {
        e.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !dialogRef.current?.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !dialogRef.current?.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      previouslyFocusedRef.current?.focus();
      previouslyFocusedRef.current = null;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="ap-surface w-full max-w-lg bg-[var(--ap-surface)] border border-[var(--ap-border)] rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--ap-border)]">
          <h2 id="modal-title" className="text-lg font-bold text-[var(--ap-text)]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 rounded-lg text-[var(--ap-muted)] hover:bg-[var(--ap-surface-2)] hover:text-[var(--ap-text)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export const SkeletonRows: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <div className="space-y-3" aria-busy="true" aria-label="Loading content">
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className="h-12 w-full rounded-lg bg-[var(--ap-border)]/50 animate-pulse"
      />
    ))}
  </div>
);

export const EmptyState: React.FC<{
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ title, description, action }) => (
  <div className="ap-surface border border-[var(--ap-border)] bg-[var(--ap-surface)] rounded-xl p-8 text-center space-y-3">
    <h3 className="text-base font-bold text-[var(--ap-text)]">{title}</h3>
    <p className="text-sm text-[var(--ap-muted)] max-w-md mx-auto">{description}</p>
    {action && <div className="pt-2">{action}</div>}
  </div>
);

export const ErrorState: React.FC<{
  title?: string;
  message: string;
  onRetry?: () => void;
}> = ({ title = 'Unable to load data', message, onRetry }) => (
  <div
    className="ap-surface border border-[var(--ap-danger-border)] bg-[var(--ap-danger-bg)] rounded-xl p-6 space-y-3"
    role="alert"
  >
    <div className="flex items-center gap-2 text-[var(--ap-danger)] font-semibold text-sm">
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span>{title}</span>
    </div>
    <p className="text-sm text-[var(--ap-danger)]">{message}</p>
    {onRetry && (
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try Again
      </Button>
    )}
  </div>
);

export const Pagination: React.FC<{
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}> = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-4 border-t border-[var(--ap-border)]">
      <span className="text-xs text-[var(--ap-muted)] tabular-nums">
        Page {page} of {totalPages}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export const HelpButton: React.FC<{
  featureId: string;
  label?: string;
}> = ({ featureId, label = 'Feature Guide' }) => {
  const [open, setOpen] = useState(false);
  const feature = getFeatureById(featureId);

  if (!feature) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[var(--ap-border)] bg-[var(--ap-surface)] text-[var(--ap-muted)] hover:text-[#18C6AD] hover:border-[#18C6AD]/60 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
        aria-label={`Open help documentation for ${feature.name}`}
      >
        <HelpCircle className="w-3.5 h-3.5 text-[#32A7D9]" aria-hidden="true" />
        <span>{label}</span>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={`${feature.id} · ${feature.name}`}>
        <div className="space-y-4 text-xs leading-relaxed">
          <div className="p-3 rounded-lg bg-[var(--ap-surface-2)] border border-[var(--ap-border)] space-y-1">
            <p className="font-semibold text-[#18C6AD]">Module {feature.module}: {feature.moduleName}</p>
            <p className="text-[var(--ap-text)]">{feature.detailedExplanation}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="font-semibold text-[var(--ap-muted)]">Target User</p>
              <p className="text-[var(--ap-text)] mt-0.5">{feature.targetUser}</p>
            </div>
            <div>
              <p className="font-semibold text-[var(--ap-muted)]">Permissions</p>
              <p className="text-[var(--ap-text)] mt-0.5">{feature.permissions}</p>
            </div>
          </div>
          <div>
            <p className="font-semibold text-[var(--ap-muted)]">Step-by-Step Workflow</p>
            <ol className="list-decimal pl-4 space-y-1 text-[var(--ap-text)] mt-1">
              {feature.workflowSteps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-[var(--ap-border)]">
            <StatusLabel status={feature.actualStatus === 'Implemented and tested' ? 'verified' : 'simulated'} />
            <Link
              to={`/features/${feature.id}`}
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1 font-semibold text-[#18C6AD] hover:underline"
            >
              <span>Full Feature Specification</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </Modal>
    </>
  );
};
