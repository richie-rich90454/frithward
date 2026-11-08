export const SURFACE_ROLES = ["button", "input", "dialog", "table"] as const;

export type SurfaceRole = (typeof SURFACE_ROLES)[number];
