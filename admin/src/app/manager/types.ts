export type ManagerSortKey = "idAsc" | "idDesc" | "popularityDesc";

export type ManagerArtistSummary = {
  id: number;
  name: string;
  nameKo: string;
  nameJa?: string | null;
  nameLatin?: string | null;
  catalog?: string | null;
  songCount: number;
  popularity?: number | null;
  thumbnailDefault?: string | null;
  thumbnailMedium?: string | null;
  thumbnailHigh?: string | null;
};

export const MANAGER_PAGE_SIZE = 1000;

export const managerSortOptions: Array<{ key: ManagerSortKey; label: string }> =
  [
    { key: "idAsc", label: "ID 오름차순" },
    { key: "idDesc", label: "ID 내림차순" },
    { key: "popularityDesc", label: "스포티파이 인기순" },
  ];
