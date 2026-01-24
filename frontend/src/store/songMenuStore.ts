import { create } from "zustand";
import type {
  SpotifyTrackInfoDto,
  YoutubeVideoInfoDto,
} from "@/api/model/models";

interface SongMenuData {
  id: number;
  title: string;
  originalTitle: string;
  artistName: string;
  artistId?: number;
  artistTjName?: string;
  tjNumber?: string;
  bestProposeHit?: number;
  spotify?: SpotifyTrackInfoDto;
  youtube?: YoutubeVideoInfoDto;
}

interface SongMenuState {
  isOpen: boolean;
  song?: SongMenuData;
  openMenu: (song: SongMenuData) => void;
  closeMenu: () => void;
}

export const useSongMenuStore = create<SongMenuState>((set) => ({
  isOpen: false,
  song: undefined,
  openMenu: (song) => set({ isOpen: true, song }),
  closeMenu: () => set({ isOpen: false, song: undefined }),
}));
