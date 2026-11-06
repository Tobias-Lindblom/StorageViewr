"use client";

import { useEffect, useRef } from "react";
import { useScrollRevealVisible } from "./scroll-reveal";
import styles from "./landing-page.module.css";

const HEALTH_PERCENT = 93;
const ANIMATION_DELAY_MS = 140;
const ANIMATION_DURATION_MS = 1_100;

export function AnimatedHealthMetric() {
  const isVisible = useScrollRevealVisible();
  const numberRef = useRef<HTMLSpanElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!isVisible) return;

    const number = numberRef.current;
    const progressBar = progressRef.current;
    if (!number || !progressBar) return;

    let animationFrame = 0;
    let animationTimer = 0;

    const renderProgress = (progress: number) => {
      number.textContent = String(Math.round(HEALTH_PERCENT * progress));
      progressBar.style.transform = `scaleX(${(HEALTH_PERCENT / 100) * progress})`;
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      renderProgress(1);
      return;
    }

    renderProgress(0);
    animationTimer = window.setTimeout(() => {
      const startedAt = performance.now();

      const animate = (now: number) => {
        const elapsed = Math.min(
          (now - startedAt) / ANIMATION_DURATION_MS,
          1,
        );
        const easedProgress = 1 - Math.pow(1 - elapsed, 3);
        renderProgress(easedProgress);

        if (elapsed < 1) {
          animationFrame = window.requestAnimationFrame(animate);
        }
      };

      animationFrame = window.requestAnimationFrame(animate);
    }, ANIMATION_DELAY_MS);

    return () => {
      window.clearTimeout(animationTimer);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [isVisible]);

  return (
    <>
      <div
        className={styles.healthScore}
        aria-label={`Exempel på lagerhälsa: ${HEALTH_PERCENT} procent`}
      >
        <strong aria-hidden="true">
          <span ref={numberRef} className={styles.healthScoreNumber}>
            {HEALTH_PERCENT}
          </span>
          <span className={styles.healthScoreUnit}>%</span>
        </strong>
        <span>Exempel på lagerhälsa</span>
      </div>
      <p className={styles.healthVerified}>
        37 av 40 positioner bedöms som tillförlitliga
      </p>
      <div
        className={styles.healthProgress}
        role="progressbar"
        aria-label="Andel tillförlitliga positioner i exemplet"
        aria-valuenow={HEALTH_PERCENT}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span ref={progressRef} aria-hidden="true" />
      </div>
    </>
  );
}
