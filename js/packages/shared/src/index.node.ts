// Node-safe entry point — excludes React/Vite-only exports (useGameSync).
// Used by the CJS build (tsconfig.json) consumed by the NestJS API at runtime.
export type {
  PortalAppCategory,
  PortalAppMetadata,
  PortalAppTile
} from "./portal-metadata";
export { ADJECTIVES, NOUNS, generateJoinCode, generateGuestHandle } from "./wordlists";
