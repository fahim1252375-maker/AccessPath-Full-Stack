import React from 'react';
import { motion } from 'motion/react';
import { useAppStore } from '../../store/useAppStore.ts';

function useMotionDisabled(): boolean {
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const lowBandwidth = useAppStore((s) => s.lowBandwidth);
  const osReduced =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return reducedMotion || lowBandwidth || osReduced;
}

export const MotionReveal: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
}> = ({ children, className = '', delay = 0 }) => {
  const disabled = useMotionDisabled();
  if (disabled) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const MotionInteractiveCard: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  const disabled = useMotionDisabled();
  if (disabled) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
