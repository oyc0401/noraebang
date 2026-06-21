export interface TjSongData {
  karaokeNo: string;
  title: string;
  artist: string;
  lyricist: string;
  composer: string;
  thumbnailImg?: string;
  publishdate: string;
}

export interface TjSongInfo {
  songNumber: string;
  isMR: boolean;
  isMV: boolean;
  isOver60: boolean;
  title: string;
  artist: string;
  lyricist?: string;
  composer?: string;
  youtubeLink?: string;
}
