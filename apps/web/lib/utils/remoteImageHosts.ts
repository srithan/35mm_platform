/** Hosts that block or challenge Next.js image optimization fetches (e.g. Cloudflare). */
const UNOPTIMIZED_REMOTE_IMAGE_HOSTS = new Set(["cdn.theplaylist.net"]);
const UNOPTIMIZED_REMOTE_IMAGE_HOST_SUFFIXES = [".r2.dev"];

export function shouldLoadRemoteImageUnoptimized(src: string): boolean {
  try {
    const hostname = new URL(src).hostname;
    if (UNOPTIMIZED_REMOTE_IMAGE_HOSTS.has(hostname)) {
      return true;
    }

    return UNOPTIMIZED_REMOTE_IMAGE_HOST_SUFFIXES.some(function (suffix) {
      return hostname.endsWith(suffix);
    });
  } catch {
    return false;
  }
}
