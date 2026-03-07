"use client";

import { useCallback } from "react";
import { useWebHaptics } from "web-haptics/react";

type HapticTone = "nav" | "utility" | "success" | "danger";

const TONE_TO_PRESET: Record<HapticTone, string> = {
  nav: "nudge",
  utility: "nudge",
  success: "success",
  danger: "error",
};

export function useHapticFeedback() {
  const { trigger, isSupported } = useWebHaptics({
    debug: process.env.NODE_ENV !== "production",
  });

  const vibrate = useCallback(
    (tone: HapticTone) => {
      void trigger(TONE_TO_PRESET[tone]);
    },
    [trigger]
  );

  return { vibrate, isSupported };
}
