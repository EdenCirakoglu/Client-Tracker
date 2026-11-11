'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { destinationAfterLogin } from '../lib/return-destination';
import { BrandMark } from './ui/brand-mark';
import styles from './login-intro.module.css';

interface LoginIntroProps {
  disabled: boolean;
}

const preferenceKey = 'clientops:login-intro:v1';

export function LoginIntro({ disabled }: LoginIntroProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const shouldPlay = useRef<boolean | null>(null);
  const [active, setActive] = useState(false);

  const finish = useCallback(() => {
    shouldPlay.current = false;
    setActive(false);
    if (!dialog.current?.open) return;
    dialog.current.close();
    document.getElementById('sign-in-heading')?.focus({ preventScroll: true });
  }, []);

  useLayoutEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (disabled) {
      finish();
      return;
    }

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (shouldPlay.current === null) {
      // This is a cosmetic, per-tab preference, never an authentication credential.
      // Record links go straight to sign-in; the existing validated destination is untouched.
      try {
        shouldPlay.current =
          !motion.matches &&
          destinationAfterLogin(window.location.search) === '/dashboard' &&
          window.sessionStorage.getItem(preferenceKey) !== 'seen';
        if (shouldPlay.current) window.sessionStorage.setItem(preferenceKey, 'seen');
      } catch {
        shouldPlay.current = false;
      }
    }
    if (!shouldPlay.current) return;

    setActive(true);
    element.showModal();
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    // Independent of animation events, image loading, API requests and GPU support.
    const timer = window.setTimeout(finish, 2200);
    const onMotionChange = () => {
      if (motion.matches) finish();
    };
    motion.addEventListener('change', onMotionChange);

    const onClose = () => {
      if (element.open) return;
      document.documentElement.style.overflow = previousOverflow;
      window.clearTimeout(timer);
    };
    element.addEventListener('close', onClose);
    return () => {
      window.clearTimeout(timer);
      motion.removeEventListener('change', onMotionChange);
      element.removeEventListener('close', onClose);
      element.close();
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [disabled, finish]);

  useLayoutEffect(() => {
    if (active) dialog.current?.focus();
  }, [active]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="intro-name"
      aria-modal="true"
      className={styles.intro}
      onKeyDown={(event) => {
        if (event.key === 'Tab') {
          event.preventDefault();
          event.currentTarget.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        finish();
      }}
    >
      {active ? (
        <div className={styles.content}>
          <div className={styles.glass} aria-hidden="true">
            <div className={styles.mark}>
              <BrandMark size={144} />
            </div>
          </div>
          <p id="intro-name" className={styles.name}>
            ClientOps Tracker
          </p>
        </div>
      ) : null}
    </dialog>
  );
}
