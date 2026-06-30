export type SearchConsoleRow = {
  date: string;
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type SearchConsoleDataset = {
  version: 1;
  siteUrl: string;
  syncedAt: string;
  startDate: string;
  endDate: string;
  rows: SearchConsoleRow[];
};

export type SearchConsoleFetchOptions = {
  siteUrl: string;
  accessToken?: string;
  startDate: string;
  endDate: string;
};
