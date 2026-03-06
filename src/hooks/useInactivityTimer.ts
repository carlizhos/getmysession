import { useEffect, useRef, useCallback } from 'react';

interface UseInactivityTimerOptions {
    /** Segundos de inactividad antes de mostrar el warning (default: 30) */
    inactivitySeconds?: number;
    /** Segundos del countdown antes de cerrar sesión (default: 30) */
    countdownSeconds?: number;
    onWarning: () => void;   // Llamado cuando se alcanza el timeout de inactividad
    onTimeout: () => void;   // Llamado cuando el countdown llega a 0
}

const ACTIVITY_EVENTS: (keyof DocumentEventMap)[] = [
    'mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click',
];

/**
 * Hook HIPAA-compliant para detectar inactividad del usuario.
 * Llama onWarning() tras `inactivitySeconds` sin actividad.
 * Si el usuario no responde, llama onTimeout() tras `countdownSeconds` adicionales.
 */
const useInactivityTimer = ({
    inactivitySeconds = 30,
    countdownSeconds = 30,
    onWarning,
    onTimeout,
}: UseInactivityTimerOptions) => {
    const inactivityRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const countdownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isWarningRef = useRef(false);

    const clearAll = useCallback(() => {
        if (inactivityRef.current) clearTimeout(inactivityRef.current);
        if (countdownRef.current) clearTimeout(countdownRef.current);
    }, []);

    const startCountdown = useCallback(() => {
        isWarningRef.current = true;
        onWarning();
        countdownRef.current = setTimeout(() => {
            isWarningRef.current = false;
            onTimeout();
        }, countdownSeconds * 1000);
    }, [countdownSeconds, onWarning, onTimeout]);

    const resetTimer = useCallback(() => {
        // Si el countdown ya arrancó, no resetear por actividad del usuario
        if (isWarningRef.current) return;
        clearAll();
        inactivityRef.current = setTimeout(startCountdown, inactivitySeconds * 1000);
    }, [clearAll, startCountdown, inactivitySeconds]);

    /** Llamar desde el modal cuando el usuario decide continuar */
    const extendSession = useCallback(() => {
        isWarningRef.current = false;
        clearAll();
        inactivityRef.current = setTimeout(startCountdown, inactivitySeconds * 1000);
    }, [clearAll, startCountdown, inactivitySeconds]);

    useEffect(() => {
        // Arrancar el timer inicial
        resetTimer();

        // Escuchar actividad del usuario
        ACTIVITY_EVENTS.forEach(evt => document.addEventListener(evt, resetTimer, { passive: true }));

        return () => {
            clearAll();
            ACTIVITY_EVENTS.forEach(evt => document.removeEventListener(evt, resetTimer));
        };
    }, [resetTimer, clearAll]);

    return { extendSession };
};

export default useInactivityTimer;
