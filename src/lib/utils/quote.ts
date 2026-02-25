/**
 * Calculate the minutes and seconds until a specified time is reached.
 *
 * @param expiresAt - stringified date when the quote will expire
 */
export function calculateExpiresIn(expiresAt: string): string {
    const expires = new Date(expiresAt);
    const now = new Date();
    const diffMs = expires.getTime() - now.getTime();

    if (diffMs <= 0) return 'Expired';

    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);

    if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
}
