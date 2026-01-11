"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { ARTIST_CATALOG_OPTIONS, useArtistsStore } from "./store";

export function ArtistDetailSection() {
  const {
    selectedArtist,
    songs,
    songsLoading,
    spotifyArtist,
    nameKoMenuOpen,
    nameMenuOpen,
    slugMenuOpen,
    catalogMenuOpen,
    songMenuOpen,
    catalogSaving,
    deletingArtist,
    showTransferDialog,
    transferSong,
    transferArtistIdInput,
    transferSaving,
    transferError,
    showAddOwnershipDialog,
    addOwnershipSong,
    addOwnershipArtistIdInput,
    addOwnershipSaving,
    addOwnershipError,
    showNameKoDialog,
    nameKoInput,
    nameKoSaving,
    nameKoError,
    showNameDialog,
    nameInput,
    nameSaving,
    nameError,
    showSlugDialog,
    slugInput,
    slugSaving,
    slugError,
    showSongTitleDialog,
    editingSong,
    songTitleInput,
    songTitleKoInput,
    songTitleSaving,
    songTitleError,
    showMergeDialog,
    mergeTargetArtistIdInput,
    mergeSaving,
    mergeError,
    showKaraokeDialog,
    karaokeTjInput,
    karaokeKyInput,
    karaokeJoysoundInput,
    karaokeSaving,
    karaokeError,
    setNameKoMenuOpen,
    setNameMenuOpen,
    setSlugMenuOpen,
    setCatalogMenuOpen,
    setSongMenuOpen,
    setShowNameKoDialog,
    setNameKoInput,
    setNameKoError,
    setShowNameDialog,
    setNameInput,
    setNameError,
    setShowSlugDialog,
    setSlugInput,
    setSlugError,
    setShowSongTitleDialog,
    setSongTitleInput,
    setSongTitleKoInput,
    setSongTitleError,
    setShowKaraokeDialog,
    setKaraokeTjInput,
    setKaraokeKyInput,
    setKaraokeJoysoundInput,
    setKaraokeError,
    setShowTransferDialog,
    setTransferSong,
    setTransferArtistIdInput,
    setTransferError,
    setShowAddOwnershipDialog,
    setAddOwnershipSong,
    setAddOwnershipArtistIdInput,
    setAddOwnershipError,
    setShowMergeDialog,
    setMergeTargetArtistIdInput,
    setMergeError,
    saveNameKo,
    saveName,
    saveSlug,
    saveSongTitle,
    saveKaraoke,
    saveTransferOwnership,
    saveAddOwnership,
    handleDeleteArtist,
    handleMergeArtist,
    handleArtistCatalogChange,
  } = useArtistsStore();

  const nameKoMenuRef = useRef<HTMLDivElement | null>(null);
  const nameMenuRef = useRef<HTMLDivElement | null>(null);
  const slugMenuRef = useRef<HTMLDivElement | null>(null);
  const catalogMenuRef = useRef<HTMLDivElement | null>(null);
  const songMenuRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        nameKoMenuRef.current &&
        !nameKoMenuRef.current.contains(event.target as Node)
      ) {
        setNameKoMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setNameKoMenuOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        nameMenuRef.current &&
        !nameMenuRef.current.contains(event.target as Node)
      ) {
        setNameMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setNameMenuOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        slugMenuRef.current &&
        !slugMenuRef.current.contains(event.target as Node)
      ) {
        setSlugMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setSlugMenuOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        catalogMenuRef.current &&
        !catalogMenuRef.current.contains(event.target as Node)
      ) {
        setCatalogMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setCatalogMenuOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (songMenuOpen !== null) {
        const currentMenuRef = songMenuRefs.current.get(songMenuOpen);
        if (currentMenuRef && !currentMenuRef.contains(event.target as Node)) {
          setSongMenuOpen(null);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [songMenuOpen, setSongMenuOpen]);

  const handleNameKoSave = async () => {
    await saveNameKo();
  };

  const handleNameSave = async () => {
    await saveName();
  };

  const handleSlugSave = async () => {
    await saveSlug();
  };

  const handleSongTitleSave = async () => {
    await saveSongTitle();
  };

  const handleKaraokeSave = async () => {
    await saveKaraoke();
  };

  const handleTransferOwnership = async () => {
    await saveTransferOwnership();
  };

  const handleAddOwnership = async () => {
    await saveAddOwnership();
  };

  return (
    <>
      <div className="flex-1 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex flex-col">
        {selectedArtist ? (
          <>
            {/* Artist Info Header */}
            <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4">
              <div className="flex items-center gap-3">
                {selectedArtist.thumbnailHigh ||
                selectedArtist.thumbnailMedium ||
                selectedArtist.thumbnailDefault ? (
                  <Image
                    src={
                      selectedArtist.thumbnailHigh ||
                      selectedArtist.thumbnailMedium ||
                      selectedArtist.thumbnailDefault ||
                      ""
                    }
                    alt={selectedArtist.nameKo}
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                )}
                <div className="flex-1">
                  <div className="relative inline-block" ref={nameKoMenuRef}>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                      <button
                        type="button"
                        onClick={() => setNameKoMenuOpen((prev) => !prev)}
                        className="inline-flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        style={{ cursor: "pointer" }}
                      >
                        {selectedArtist.nameKo}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="h-5 w-5"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Artist ID: {selectedArtist.id}
                    </p>

                    {nameKoMenuOpen && (
                      <div className="absolute left-0 mt-2 w-48 rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900 z-20">
                        <button
                          type="button"
                          onClick={() => {
                            setNameKoMenuOpen(false);
                            setShowNameKoDialog(true);
                            setNameKoError(null);
                            setNameKoInput(selectedArtist.nameKo);
                          }}
                          className="block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                          style={{ cursor: "pointer" }}
                        >
                          편집
                        </button>
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(selectedArtist.nameKo)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setNameKoMenuOpen(false)}
                          className="block px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                          style={{ cursor: "pointer" }}
                        >
                          구글 검색
                        </a>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    <span className="relative inline-block" ref={nameMenuRef}>
                      <button
                        type="button"
                        onClick={() => setNameMenuOpen((prev) => !prev)}
                        className="inline-flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        style={{ cursor: "pointer" }}
                      >
                        {selectedArtist.name}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="h-4 w-4"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                      {nameMenuOpen && (
                        <div className="absolute left-0 mt-2 w-48 rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900 z-20">
                          <button
                            type="button"
                            onClick={() => {
                              setNameMenuOpen(false);
                              setShowNameDialog(true);
                              setNameError(null);
                              setNameInput(selectedArtist.name);
                            }}
                            className="block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            style={{ cursor: "pointer" }}
                          >
                            편집
                          </button>
                          <a
                            href={`https://www.google.com/search?q=${encodeURIComponent(selectedArtist.name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setNameMenuOpen(false)}
                            className="block px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            style={{ cursor: "pointer" }}
                          >
                            구글 검색
                          </a>
                        </div>
                      )}
                    </span>
                    {selectedArtist.slug ? (
                      <>
                        {" • "}
                        <span
                          className="relative inline-block"
                          ref={slugMenuRef}
                        >
                          <button
                            type="button"
                            onClick={() => setSlugMenuOpen((prev) => !prev)}
                            className="inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
                            style={{ cursor: "pointer" }}
                          >
                            @{selectedArtist.slug}
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="h-4 w-4"
                              aria-hidden="true"
                            >
                              <path
                                fillRule="evenodd"
                                d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                          {slugMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900 z-20">
                              <a
                                href={`/channel/${selectedArtist.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => setSlugMenuOpen(false)}
                                className="block px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                style={{ cursor: "pointer" }}
                              >
                                아티스트 페이지로 이동
                              </a>
                              <button
                                type="button"
                                onClick={() => {
                                  setSlugMenuOpen(false);
                                  setShowSlugDialog(true);
                                  setSlugError(null);
                                  setSlugInput(selectedArtist.slug ?? "");
                                }}
                                className="block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                style={{ cursor: "pointer" }}
                              >
                                별칭 수정
                              </button>
                            </div>
                          )}
                        </span>
                      </>
                    ) : (
                      <>
                        {" • "}
                        <button
                          type="button"
                          onClick={() => {
                            setShowSlugDialog(true);
                            setSlugError(null);
                            setSlugInput("");
                          }}
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
                          style={{ cursor: "pointer" }}
                        >
                          별칭 설정
                        </button>
                      </>
                    )}
                  </p>

                  {spotifyArtist && (
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      <div className="flex items-center gap-2">
                        <a
                          href={spotifyArtist.spotifyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-green-600 hover:underline dark:text-green-400"
                          style={{ cursor: "pointer" }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="h-3 w-3"
                          >
                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                          </svg>
                          {spotifyArtist.name}
                        </a>
                        {spotifyArtist.followers !== undefined && (
                          <span>
                            • 팔로워: {spotifyArtist.followers.toLocaleString()}
                          </span>
                        )}
                        {spotifyArtist.popularity !== undefined && (
                          <span>• 인기도: {spotifyArtist.popularity}</span>
                        )}
                      </div>
                      {spotifyArtist.genres &&
                        spotifyArtist.genres.length > 0 && (
                          <div className="mt-0.5 flex flex-wrap gap-1">
                            {spotifyArtist.genres.slice(0, 3).map((genre) => (
                              <span
                                key={genre}
                                className="inline-block rounded bg-green-100 px-1.5 py-0.5 text-[10px] text-green-700 dark:bg-green-900/30 dark:text-green-300"
                              >
                                {genre}
                              </span>
                            ))}
                          </div>
                        )}
                    </div>
                  )}
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    분류: {selectedArtist.homeCatalog ?? "미지정"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative" ref={catalogMenuRef}>
                    <button
                      type="button"
                      onClick={() => setCatalogMenuOpen((prev) => !prev)}
                      className="inline-flex items-center gap-1 rounded border border-purple-300 px-3 py-1 text-xs font-semibold text-purple-600 hover:bg-purple-50 dark:border-purple-500/40 dark:text-purple-200 dark:hover:bg-purple-900/30 disabled:cursor-not-allowed disabled:opacity-60"
                      style={{ cursor: "pointer" }}
                      disabled={catalogSaving}
                    >
                      {catalogSaving ? "설정 중..." : "가수분류설정"}
                      {selectedArtist.homeCatalog ? (
                        <span className="ml-1 text-[11px] font-normal text-purple-500 dark:text-purple-200">
                          ({selectedArtist.homeCatalog})
                        </span>
                      ) : null}
                    </button>
                    {catalogMenuOpen && (
                      <div className="absolute right-0 mt-2 w-32 rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900 z-20">
                        {ARTIST_CATALOG_OPTIONS.map((option) => {
                          const isActive = option.value
                            ? selectedArtist.homeCatalog === option.value
                            : !selectedArtist.homeCatalog;
                          return (
                            <button
                              key={option.label}
                              type="button"
                              onClick={() =>
                                handleArtistCatalogChange(option.value)
                              }
                              disabled={catalogSaving}
                              className={`block w-full px-3 py-2 text-left text-sm ${
                                isActive
                                  ? "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-200"
                                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                              }`}
                              style={{ cursor: "pointer" }}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMergeDialog(true);
                      setMergeTargetArtistIdInput("");
                      setMergeError(null);
                    }}
                    className="inline-flex items-center gap-1 rounded border border-blue-300 px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:border-blue-500/40 dark:text-blue-300 dark:hover:bg-blue-900/20"
                    style={{ cursor: "pointer" }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    아티스트 병합하기
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteArtist}
                    className="inline-flex items-center gap-1 rounded border border-red-300 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-900/20"
                    style={{ cursor: "pointer" }}
                    disabled={deletingArtist}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <path d="M3 6h18" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    {deletingArtist ? "삭제 중..." : "아티스트 삭제"}
                  </button>
                  <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    {selectedArtist.songCount}곡
                  </div>
                </div>
              </div>
            </div>

            {/* Song List */}
            <div className="flex-1 overflow-y-auto p-6">
              {songsLoading && (
                <div className="text-center text-sm text-zinc-500 dark:text-zinc-400">
                  로딩 중...
                </div>
              )}

              {songs && songs.length === 0 && (
                <div className="text-center text-sm text-zinc-500 dark:text-zinc-400">
                  곡이 없습니다
                </div>
              )}

              <div className="space-y-2">
                {songs.map((song) => (
                  <div
                    key={song.id}
                    className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-zinc-900 dark:text-zinc-50">
                          {song.title}
                        </div>
                        {song.titleKo && song.titleKo !== song.title && (
                          <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {song.titleKo}
                          </div>
                        )}
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                          곡 ID: {song.id}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          소유 아티스트:&nbsp;
                          {song.owners && song.owners.length > 0 ? (
                            song.owners
                              .map(
                                (owner) =>
                                  `${owner.nameKo || owner.name} (ID ${
                                    owner.id
                                  })`,
                              )
                              .join(", ")
                          ) : (
                            <span className="text-zinc-400">
                              연결된 아티스트 없음
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          분류: {song.catalog ?? "미지정"}
                        </div>

                        {song.karaokeSongs && song.karaokeSongs.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {song.karaokeSongs.map((kn) => (
                              <span
                                key={`${kn.provider}-${kn.karaokeNo}`}
                                className="text-xs px-2 py-1 rounded bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                              >
                                {kn.provider} {kn.karaokeNo}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setSongMenuOpen(
                              songMenuOpen === song.id ? null : song.id,
                            )
                          }
                          className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          style={{ cursor: "pointer" }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="h-5 w-5 text-zinc-500 dark:text-zinc-400"
                            aria-hidden="true"
                          >
                            <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
                          </svg>
                        </button>
                        {songMenuOpen === song.id && (
                          <div
                            ref={(el) => {
                              if (el) {
                                songMenuRefs.current.set(song.id, el);
                              } else {
                                songMenuRefs.current.delete(song.id);
                              }
                            }}
                            className="absolute right-0 mt-2 w-48 rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900 z-20"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setSongTitleInput(song.title);
                                setSongTitleKoInput(song.titleKo ?? "");
                                setSongTitleError(null);
                                setShowSongTitleDialog(true);
                                setSongMenuOpen(null);
                              }}
                              className="block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                              style={{ cursor: "pointer" }}
                            >
                              제목 편집
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const tj = song.karaokeSongs.find(
                                  (k) => k.provider === "TJ",
                                );
                                const ky = song.karaokeSongs.find(
                                  (k) => k.provider === "KY",
                                );
                                const joysound = song.karaokeSongs.find(
                                  (k) => k.provider === "JOYSOUND",
                                );
                                setKaraokeTjInput(tj?.karaokeNo ?? "");
                                setKaraokeKyInput(ky?.karaokeNo ?? "");
                                setKaraokeJoysoundInput(
                                  joysound?.karaokeNo ?? "",
                                );
                                setKaraokeError(null);
                                setShowKaraokeDialog(true);
                                setSongMenuOpen(null);
                              }}
                              className="block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                              style={{ cursor: "pointer" }}
                            >
                              노래방번호 편집
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAddOwnershipSong(song);
                                setAddOwnershipArtistIdInput("");
                                setAddOwnershipError(null);
                                setShowAddOwnershipDialog(true);
                                setSongMenuOpen(null);
                              }}
                              className="block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                              style={{ cursor: "pointer" }}
                            >
                              곡 소유권 추가하기
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setTransferSong(song);
                                setTransferArtistIdInput("");
                                setTransferError(null);
                                setShowTransferDialog(true);
                                setSongMenuOpen(null);
                              }}
                              className="block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                              style={{ cursor: "pointer" }}
                            >
                              곡 소유권 이전하기
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-zinc-500 dark:text-zinc-400">
              <svg
                className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-700 mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                role="img"
                aria-label="No artist selected"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                />
              </svg>
              <p className="text-sm">왼쪽에서 아티스트를 선택하세요</p>
            </div>
          </div>
        )}
      </div>

      {showTransferDialog && transferSong && selectedArtist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900 dark:text-zinc-50">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              곡 소유권 이전
            </h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              선택한 곡을 다른 아티스트 ID로 매핑합니다.
            </p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800">
                <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {transferSong.title}
                </p>
                {transferSong.titleKo && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {transferSong.titleKo}
                  </p>
                )}
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  현재 아티스트: {selectedArtist.name} (ID {selectedArtist.id})
                </p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  이전할 아티스트 ID
                </label>
                <input
                  type="number"
                  value={transferArtistIdInput}
                  onChange={(e) => setTransferArtistIdInput(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                  placeholder="예: 1234"
                  style={{ cursor: "text" }}
                />
                {transferError && (
                  <p className="mt-2 text-xs text-red-500">{transferError}</p>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowTransferDialog(false);
                  setTransferSong(null);
                  setTransferArtistIdInput("");
                  setTransferError(null);
                }}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                style={{ cursor: "pointer" }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleTransferOwnership}
                disabled={transferSaving}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:disabled:bg-indigo-900/40"
                style={{ cursor: "pointer" }}
              >
                {transferSaving ? "이전 중..." : "이전하기"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddOwnershipDialog && addOwnershipSong && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900 dark:text-zinc-50">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              곡 소유권 추가
            </h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              다른 아티스트를 이 곡에 추가로 매핑합니다.
            </p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800">
                <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {addOwnershipSong.title}
                </p>
                {addOwnershipSong.titleKo && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {addOwnershipSong.titleKo}
                  </p>
                )}
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  곡 ID: {addOwnershipSong.id}
                </p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  추가할 아티스트 ID
                </label>
                <input
                  type="number"
                  value={addOwnershipArtistIdInput}
                  onChange={(e) => setAddOwnershipArtistIdInput(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                  placeholder="예: 1234"
                  style={{ cursor: "text" }}
                />
                {addOwnershipError && (
                  <p className="mt-2 text-xs text-red-500">
                    {addOwnershipError}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddOwnershipDialog(false);
                  setAddOwnershipSong(null);
                  setAddOwnershipArtistIdInput("");
                  setAddOwnershipError(null);
                }}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                style={{ cursor: "pointer" }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleAddOwnership}
                disabled={addOwnershipSaving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 dark:bg-blue-500 dark:hover:bg-blue-400 dark:disabled:bg-blue-900/40"
                style={{ cursor: "pointer" }}
              >
                {addOwnershipSaving ? "추가 중..." : "추가하기"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showNameKoDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900 dark:text-zinc-50">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              한국어 이름 수정
            </h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              새로운 한국어 이름을 입력하세요.
            </p>
            <div className="mt-4">
              <label
                htmlFor="nameko-input"
                className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                한국어 이름
              </label>
              <input
                id="nameko-input"
                type="text"
                value={nameKoInput}
                onChange={(e) => {
                  setNameKoInput(e.target.value);
                  if (nameKoError) setNameKoError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleNameKoSave();
                  }
                }}
                placeholder="상대성이론"
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                style={{ cursor: "text" }}
              />
              {nameKoError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  {nameKoError}
                </p>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowNameKoDialog(false);
                  setNameKoError(null);
                }}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                style={{ cursor: "pointer" }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleNameKoSave}
                disabled={nameKoSaving}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:disabled:bg-zinc-700"
                style={{ cursor: "pointer" }}
              >
                {nameKoSaving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showNameDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900 dark:text-zinc-50">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              이름 수정
            </h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              새로운 이름을 입력하세요.
            </p>
            <div className="mt-4">
              <label
                htmlFor="name-input"
                className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                이름
              </label>
              <input
                id="name-input"
                type="text"
                value={nameInput}
                onChange={(e) => {
                  setNameInput(e.target.value);
                  if (nameError) setNameError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleNameSave();
                  }
                }}
                placeholder="相対性理論"
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                style={{ cursor: "text" }}
              />
              {nameError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  {nameError}
                </p>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowNameDialog(false);
                  setNameError(null);
                }}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                style={{ cursor: "pointer" }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleNameSave}
                disabled={nameSaving}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:disabled:bg-zinc-700"
                style={{ cursor: "pointer" }}
              >
                {nameSaving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSlugDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900 dark:text-zinc-50">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              별칭 수정
            </h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              새로운 별칭을 입력하면 바로 적용됩니다.
            </p>
            <div className="mt-4">
              <label
                htmlFor="slug-input"
                className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                새 별칭
              </label>
              <input
                id="slug-input"
                type="text"
                value={slugInput}
                onChange={(e) => {
                  setSlugInput(e.target.value);
                  if (slugError) setSlugError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSlugSave();
                  }
                }}
                placeholder="yuika"
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                style={{ cursor: "text" }}
              />
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                '@' 없이 입력하세요. 예) yuika
              </p>
              {slugError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  {slugError}
                </p>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowSlugDialog(false);
                  setSlugError(null);
                }}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                style={{ cursor: "pointer" }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSlugSave}
                disabled={slugSaving}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:disabled:bg-zinc-700"
                style={{ cursor: "pointer" }}
              >
                {slugSaving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSongTitleDialog && editingSong && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900 dark:text-zinc-50">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              제목 편집
            </h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              곡 제목을 수정하세요.
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="song-title-input"
                  className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  제목
                </label>
                <input
                  id="song-title-input"
                  type="text"
                  value={songTitleInput}
                  onChange={(e) => {
                    setSongTitleInput(e.target.value);
                    if (songTitleError) setSongTitleError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSongTitleSave();
                    }
                  }}
                  placeholder="夜に駆ける"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                  style={{ cursor: "text" }}
                />
              </div>
              <div>
                <label
                  htmlFor="song-titleko-input"
                  className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  한글 제목 (선택)
                </label>
                <input
                  id="song-titleko-input"
                  type="text"
                  value={songTitleKoInput}
                  onChange={(e) => {
                    setSongTitleKoInput(e.target.value);
                    if (songTitleError) setSongTitleError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSongTitleSave();
                    }
                  }}
                  placeholder="밤을 달리다"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                  style={{ cursor: "text" }}
                />
              </div>
              {songTitleError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {songTitleError}
                </p>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowSongTitleDialog(false);
                  setSongTitleError(null);
                }}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                style={{ cursor: "pointer" }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSongTitleSave}
                disabled={songTitleSaving}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:disabled:bg-zinc-700"
                style={{ cursor: "pointer" }}
              >
                {songTitleSaving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showMergeDialog && selectedArtist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900 dark:text-zinc-50">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              아티스트 병합
            </h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              현재 아티스트의 모든 곡을 대상 아티스트로 이전하고, 현재
              아티스트를 삭제합니다.
            </p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800">
                <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {selectedArtist.nameKo}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  현재 아티스트 ID: {selectedArtist.id} (삭제될 아티스트)
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  곡 수: {selectedArtist.songCount}
                </p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  대상 아티스트 ID (곡을 받을 아티스트)
                </label>
                <input
                  type="number"
                  value={mergeTargetArtistIdInput}
                  onChange={(e) => setMergeTargetArtistIdInput(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                  placeholder="예: 24"
                  style={{ cursor: "text" }}
                />
                {mergeError && (
                  <p className="mt-2 text-xs text-red-500">{mergeError}</p>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowMergeDialog(false);
                  setMergeTargetArtistIdInput("");
                  setMergeError(null);
                }}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                style={{ cursor: "pointer" }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleMergeArtist}
                disabled={mergeSaving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 dark:bg-blue-500 dark:hover:bg-blue-400 dark:disabled:bg-blue-900/40"
                style={{ cursor: "pointer" }}
              >
                {mergeSaving ? "병합 중..." : "확인"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showKaraokeDialog && editingSong && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900 dark:text-zinc-50">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              노래방번호 편집
            </h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              노래방 번호를 수정하세요. 빈 값으로 두면 삭제됩니다.
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="karaoke-tj-input"
                  className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  TJ
                </label>
                <input
                  id="karaoke-tj-input"
                  type="text"
                  value={karaokeTjInput}
                  onChange={(e) => {
                    setKaraokeTjInput(e.target.value);
                    if (karaokeError) setKaraokeError(null);
                  }}
                  placeholder=""
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                  style={{ cursor: "text" }}
                />
              </div>
              <div>
                <label
                  htmlFor="karaoke-ky-input"
                  className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  KY
                </label>
                <input
                  id="karaoke-ky-input"
                  type="text"
                  value={karaokeKyInput}
                  onChange={(e) => {
                    setKaraokeKyInput(e.target.value);
                    if (karaokeError) setKaraokeError(null);
                  }}
                  placeholder=""
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                  style={{ cursor: "text" }}
                />
              </div>
              <div>
                <label
                  htmlFor="karaoke-joysound-input"
                  className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  JOYSOUND
                </label>
                <input
                  id="karaoke-joysound-input"
                  type="text"
                  value={karaokeJoysoundInput}
                  onChange={(e) => {
                    setKaraokeJoysoundInput(e.target.value);
                    if (karaokeError) setKaraokeError(null);
                  }}
                  placeholder=""
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                  style={{ cursor: "text" }}
                />
              </div>
              {karaokeError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {karaokeError}
                </p>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowKaraokeDialog(false);
                  setKaraokeError(null);
                }}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                style={{ cursor: "pointer" }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleKaraokeSave}
                disabled={karaokeSaving}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:disabled:bg-zinc-700"
                style={{ cursor: "pointer" }}
              >
                {karaokeSaving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
