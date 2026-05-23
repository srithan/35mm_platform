/** Hosts that block or challenge Next.js image optimization fetches (e.g. Cloudflare). */
const UNOPTIMIZED_REMOTE_IMAGE_HOSTS = new Set(["cdn.theplaylist.net"]);

export function shouldLoadRemoteImageUnoptimized(src: string): boolean {
  try {
    return UNOPTIMIZED_REMOTE_IMAGE_HOSTS.has(new URL(src).hostname);
  } catch {
    return false;
  }
}
