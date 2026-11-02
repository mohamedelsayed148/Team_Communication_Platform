type SessionExpiredListener = () => void;

let sessionExpiredListener: SessionExpiredListener | null = null;

export function setSessionExpiredListener(
  listener: SessionExpiredListener | null,
): void {
  sessionExpiredListener = listener;
}

export function notifySessionExpired(): void {
  sessionExpiredListener?.();
}
