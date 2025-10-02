export async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export function formatTimeAgo(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return then.toLocaleDateString();
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function validateHandle(handle: string): { valid: boolean; error?: string } {
  if (handle.length < 3) {
    return { valid: false, error: 'Handle must be at least 3 characters' };
  }
  if (handle.length > 30) {
    return { valid: false, error: 'Handle must be at most 30 characters' };
  }
  if (!/^[a-z0-9_]+$/.test(handle)) {
    return { valid: false, error: 'Handle can only contain lowercase letters, numbers, and underscores' };
  }
  return { valid: true };
}

export function getImageUrl(bucket: string, path: string): string {
  return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

export class RateLimiter {
  private attempts: Map<string, { count: number; resetAt: number }> = new Map();

  check(key: string, maxAttempts: number, windowMs: number): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record || now > record.resetAt) {
      this.attempts.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }

    if (record.count >= maxAttempts) {
      return false;
    }

    record.count++;
    return true;
  }

  getRemainingTime(key: string): number {
    const record = this.attempts.get(key);
    if (!record) return 0;
    return Math.max(0, record.resetAt - Date.now());
  }
}
