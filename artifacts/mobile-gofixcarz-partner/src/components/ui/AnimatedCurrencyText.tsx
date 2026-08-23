import React, { useEffect, useRef, useState } from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { formatCurrency } from '@/src/utils/helpers';

interface AnimatedCurrencyTextProps extends TextProps {
  value: number;
  duration?: number;
  formatter?: (val: number) => string;
  style?: TextStyle | TextStyle[];
}

export const AnimatedCurrencyText: React.FC<AnimatedCurrencyTextProps> = ({
  value,
  duration = 900,
  formatter = formatCurrency,
  style,
  ...rest
}) => {
  const targetVal = typeof value === 'number' && !isNaN(value) ? Math.max(0, value) : 0;
  const [displayValue, setDisplayValue] = useState<number>(0);
  const startValueRef = useRef<number>(0);
  const startTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (targetVal === startValueRef.current) {
      return;
    }

    if (targetVal === 0) {
      setDisplayValue(0);
      startValueRef.current = 0;
      return;
    }

    const startVal = startValueRef.current;
    const diff = targetVal - startVal;
    let lastRenderedVal = startVal;
    let lastUpdateTimestamp = 0;

    // Ease-out cubic for natural deceleration as it reaches final value
    const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);

      const currentVal = Math.round(startVal + diff * easedProgress);

      // Throttle updates to ~40ms (25fps for state) and only when rounded value changes
      if (
        progress >= 1 ||
        (currentVal !== lastRenderedVal && timestamp - lastUpdateTimestamp >= 40)
      ) {
        lastRenderedVal = currentVal;
        lastUpdateTimestamp = timestamp;
        setDisplayValue(currentVal);
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(targetVal);
        startValueRef.current = targetVal;
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [targetVal, duration]);

  return (
    <Text style={style} {...rest}>
      {formatter(displayValue)}
    </Text>
  );
};

export const AnimatedNumberText: React.FC<AnimatedCurrencyTextProps> = (props) => (
  <AnimatedCurrencyText formatter={(val: number) => String(Math.round(val))} {...props} />
);

export default AnimatedCurrencyText;
