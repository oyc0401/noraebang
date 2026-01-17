"use client";

import {
  createContext,
  useContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import type { ManagerArtistInfo } from "../types";

type ArtistDetailContextValue = {
  detail: ManagerArtistInfo | null;
  setDetail: Dispatch<SetStateAction<ManagerArtistInfo | null>>;
};

const ArtistDetailContext = createContext<ArtistDetailContextValue | null>(
  null,
);

export function ArtistDetailProvider({
  detail,
  setDetail,
  children,
}: {
  detail: ManagerArtistInfo | null;
  setDetail: Dispatch<SetStateAction<ManagerArtistInfo | null>>;
  children: ReactNode;
}) {
  return (
    <ArtistDetailContext.Provider value={{ detail, setDetail }}>
      {children}
    </ArtistDetailContext.Provider>
  );
}

export function useArtistDetailContext() {
  const context = useContext(ArtistDetailContext);
  if (!context) {
    throw new Error(
      "useArtistDetailContext는 ArtistDetailProvider 내에서만 사용할 수 있습니다.",
    );
  }
  return context;
}
