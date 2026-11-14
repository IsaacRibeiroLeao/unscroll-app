import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { cssInterop } from 'nativewind';
import { Pressable } from 'react-native';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeInRight,
  FadeOutLeft,
  LinearTransition,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

// NativeWind does not style Reanimated views by default: map className -> style once, here.
cssInterop(Animated.View, { className: 'style' });

/** Delay between siblings in a staggered entrance. */
export const STAGGER_MS = 45;

/** Fades and springs its children up into place; `index` staggers siblings. */
export function Enter({
  index = 0,
  children,
  className,
  style,
  list = false,
}: {
  /** In a list: siblings glide to their new place and removed items slide out. */
  list?: boolean;
  index?: number;
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * STAGGER_MS)
        .duration(420)
        .easing(Easing.out(Easing.cubic))
        .withInitialValues({ opacity: 0, transform: [{ translateY: 14 }] })
        .reduceMotion(ReduceMotion.System)}
      exiting={list ? FadeOutLeft.duration(200).reduceMotion(ReduceMotion.System) : undefined}
      layout={
        list
          ? LinearTransition.duration(300)
              .easing(Easing.out(Easing.cubic))
              .reduceMotion(ReduceMotion.System)
          : undefined
      }
      className={className}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

/** One onboarding step: slides in from the right and out to the left. */
export function StepView({ children }: { children: ReactNode }) {
  return (
    <Animated.View
      entering={FadeInRight.springify().damping(18).reduceMotion(ReduceMotion.System)}
      exiting={FadeOutLeft.duration(160).reduceMotion(ReduceMotion.System)}
      className="gap-4"
    >
      {children}
    </Animated.View>
  );
}

/** Pressable that shrinks slightly under the finger and springs back. */
export function PressableScale({
  children,
  wrapperClassName,
  wrapperStyle,
  scaleTo = 0.96,
  onPressIn,
  onPressOut,
  ...rest
}: PressableProps & {
  children?: ReactNode;
  wrapperClassName?: string;
  wrapperStyle?: StyleProp<ViewStyle>;
  scaleTo?: number;
  className?: string;
}) {
  const scale = useSharedValue(1);
  const reduced = useReducedMotion();
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[animated, wrapperStyle]} className={wrapperClassName}>
      <Pressable
        {...rest}
        onPressIn={(e) => {
          if (!reduced)
            scale.set(withTiming(scaleTo, { duration: 110, easing: Easing.out(Easing.quad) }));
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          scale.set(withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }));
          onPressOut?.(e);
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

/** Gentle endless bobbing (mascot, hourglass). Static when reduced motion is on. */
export function Float({
  children,
  amplitude = 6,
  duration = 1800,
  delay = 0,
  style,
}: {
  children: ReactNode;
  amplitude?: number;
  duration?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const y = useSharedValue(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    const ease = Easing.inOut(Easing.sin);
    y.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-amplitude, { duration, easing: ease }),
          withTiming(0, { duration, easing: ease }),
        ),
        -1,
      ),
    );
  }, [y, amplitude, duration, delay, reduced]);
  const animated = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={[animated, style]}>{children}</Animated.View>;
}

/** Springs in when mounted/first shown (badges, icons). */
export function Pop({
  children,
  delay = 0,
  style,
}: {
  children: ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const scale = useSharedValue(0.6);
  const reduced = useReducedMotion();
  useEffect(() => {
    scale.value = reduced ? 1 : withDelay(delay, withSpring(1, { damping: 15, stiffness: 170 }));
  }, [scale, delay, reduced]);
  const animated = useAnimatedStyle(() => ({
    opacity: scale.value > 0.65 ? 1 : scale.value / 0.65,
    transform: [{ scale: scale.value }],
  }));
  return <Animated.View style={[animated, style]}>{children}</Animated.View>;
}

/** Bar whose fill grows from the left to `progress` (0..1) and re-animates on change. */
export function AnimatedFill({
  progress,
  className,
  delay = 150,
}: {
  progress: number;
  className: string;
  delay?: number;
}) {
  const p = useSharedValue(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    const target = Math.max(0, Math.min(1, progress));
    p.value = reduced
      ? target
      : withDelay(delay, withTiming(target, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [p, progress, delay, reduced]);
  const animated = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  return <Animated.View className={className} style={animated} />;
}

/** Tab icon that bounces when its tab becomes focused. */
export function TabBounce({ focused, children }: { focused: boolean; children: ReactNode }) {
  const scale = useSharedValue(1);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (focused && !reduced) {
      scale.value = withSequence(
        withTiming(0.8, { duration: 80 }),
        withSpring(1.15, { damping: 6, stiffness: 260 }),
        withSpring(1, { damping: 10 }),
      );
    }
  }, [focused, scale, reduced]);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={animated}>{children}</Animated.View>;
}
