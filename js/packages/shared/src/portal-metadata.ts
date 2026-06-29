export type PortalAppCategory =
  | "Accounting"
  | "Scoreboard"
  | "Scoreboards"
  | "Shopping"
  | "Site Seeing";

export type PortalAppTile = {
  title: string;
  description: string;
  icon?: string;
  image?: string;
};

export type PortalAppMetadata = {
  id: string;
  packageName: string;
  folder: string;
  displayName: string;
  category: PortalAppCategory;
  route: string;
  tile: PortalAppTile;
};
