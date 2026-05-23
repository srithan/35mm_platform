/**
 * Authentication state.
 * Set to false to show the landing page; true to show the feed.
 * Replace with real auth (e.g. session, JWT) when ready.
 */
export const isAuthenticated = process.env.NEXT_PUBLIC_IS_AUTHENTICATED === "true";
