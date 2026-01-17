"use client";

import { useManagerStore } from "../store";
import { SpotifySection } from "./spotify-section";
import { TjSection } from "./tj-section";
import { YoutubeSection } from "./youtube-section";

export function RightSection() {
  const rightSectionType = useManagerStore((state) => state.rightSectionType);

  if (rightSectionType === "youtube") {
    return <YoutubeSection />;
  }

  if (rightSectionType === "tj") {
    return <TjSection />;
  }

  return <SpotifySection />;
}
