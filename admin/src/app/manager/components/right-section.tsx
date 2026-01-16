"use client";

import { useManagerStore } from "../store";
import { SpotifySection } from "./spotify-section";
import { YoutubeSection } from "./youtube-section";

export function RightSection() {
  const rightSectionType = useManagerStore((state) => state.rightSectionType);

  if (rightSectionType === "youtube") {
    return <YoutubeSection />;
  }

  return <SpotifySection />;
}
