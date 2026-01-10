--
-- PostgreSQL database dump
--

\restrict FbI5Tb4FGiFgMfzORKe5yQJlc6glMWBAdUAza6fx8hCgHzNuYRW1lUkFaDLlIw4

-- Dumped from database version 16.11 (Homebrew)
-- Dumped by pg_dump version 16.11 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: ArtistRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ArtistRole" AS ENUM (
    'MAIN',
    'FEATURING',
    'PRODUCER'
);


--
-- Name: ChannelType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ChannelType" AS ENUM (
    'MAIN',
    'TOPIC'
);


--
-- Name: Provider; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Provider" AS ENUM (
    'TJ',
    'KY',
    'JOYSOUND'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: artist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.artist (
    id integer NOT NULL,
    name text NOT NULL,
    tj_song_request_url text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    name_ko text NOT NULL,
    slug text,
    thumbnail_default text,
    thumbnail_high text,
    thumbnail_medium text,
    home_catalog text,
    spotify_id text,
    name_ja_kana text,
    name_ja_kanji text,
    name_latin text
);


--
-- Name: artist_alias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.artist_alias (
    id integer NOT NULL,
    artist_id integer NOT NULL,
    alias text NOT NULL,
    locale text NOT NULL,
    kind text NOT NULL,
    source text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: artist_alias_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.artist_alias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: artist_alias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.artist_alias_id_seq OWNED BY public.artist_alias.id;


--
-- Name: artist_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.artist_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: artist_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.artist_id_seq OWNED BY public.artist.id;


--
-- Name: artist_song; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.artist_song (
    id integer NOT NULL,
    artist_id integer NOT NULL,
    song_id integer NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    role public."ArtistRole"
);


--
-- Name: artist_song_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.artist_song_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: artist_song_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.artist_song_id_seq OWNED BY public.artist_song.id;


--
-- Name: artist_tj_song; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.artist_tj_song (
    id integer NOT NULL,
    artist_id integer NOT NULL,
    tj_song_id text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: artist_tj_song_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.artist_tj_song_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: artist_tj_song_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.artist_tj_song_id_seq OWNED BY public.artist_tj_song.id;


--
-- Name: karaoke_song; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.karaoke_song (
    id integer NOT NULL,
    song_id integer NOT NULL,
    provider public."Provider" NOT NULL,
    karaoke_no text NOT NULL,
    provider_song_url text,
    last_seen_at timestamp(3) without time zone,
    ingested_at timestamp(3) without time zone,
    ingested_from text
);


--
-- Name: karaoke_song_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.karaoke_song_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: karaoke_song_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.karaoke_song_id_seq OWNED BY public.karaoke_song.id;


--
-- Name: song; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.song (
    id integer NOT NULL,
    title text NOT NULL,
    title_ko text,
    youtube_video_id text,
    youtube_fetched_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    thumbnail_default text,
    thumbnail_high text,
    thumbnail_medium text,
    catalog text,
    title_ja_kana text,
    title_ja_kanji text,
    title_latin text
);


--
-- Name: song_alias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.song_alias (
    id integer NOT NULL,
    song_id integer NOT NULL,
    alias text NOT NULL,
    locale text NOT NULL,
    kind text NOT NULL,
    source text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: song_alias_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.song_alias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: song_alias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.song_alias_id_seq OWNED BY public.song_alias.id;


--
-- Name: song_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.song_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: song_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.song_id_seq OWNED BY public.song.id;


--
-- Name: song_spotify_track; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.song_spotify_track (
    id integer NOT NULL,
    song_id integer NOT NULL,
    spotify_track_id integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: song_spotify_track_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.song_spotify_track_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: song_spotify_track_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.song_spotify_track_id_seq OWNED BY public.song_spotify_track.id;


--
-- Name: spotify_artist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.spotify_artist (
    id integer NOT NULL,
    spotify_id text NOT NULL,
    spotify_url text,
    name text NOT NULL,
    popularity integer,
    followers integer,
    genres text[] DEFAULT ARRAY[]::text[],
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    thumbnails text[] DEFAULT ARRAY[]::text[]
);


--
-- Name: spotify_artist_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.spotify_artist_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: spotify_artist_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.spotify_artist_id_seq OWNED BY public.spotify_artist.id;


--
-- Name: spotify_artist_track; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.spotify_artist_track (
    id integer NOT NULL,
    spotify_artist_id integer NOT NULL,
    spotify_track_id integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: spotify_artist_track_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.spotify_artist_track_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: spotify_artist_track_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.spotify_artist_track_id_seq OWNED BY public.spotify_artist_track.id;


--
-- Name: spotify_track; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.spotify_track (
    id integer NOT NULL,
    spotify_id text NOT NULL,
    spotify_url text,
    name text NOT NULL,
    popularity integer,
    preview_url text,
    isrc text,
    duration_ms integer,
    release_date text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    thumbnails text[] DEFAULT ARRAY[]::text[],
    disabled boolean DEFAULT false NOT NULL,
    musicbrainz_title text,
    musicbrainz_artist_credit_id text,
    musicbrainz_artist_id text,
    musicbrainz_recording_id text
);


--
-- Name: spotify_track_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.spotify_track_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: spotify_track_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.spotify_track_id_seq OWNED BY public.spotify_track.id;


--
-- Name: tj_song; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tj_song (
    id text NOT NULL,
    title text NOT NULL,
    artist text,
    artist_list text[],
    lyricist text,
    lyricist_list text[],
    composer text,
    composer_list text[],
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    feature_list text[],
    producer_list text[],
    saved boolean DEFAULT false NOT NULL,
    thumbnail_img text,
    publishdate text,
    is_mr boolean DEFAULT false NOT NULL,
    is_mv boolean DEFAULT false NOT NULL,
    is_over_60 boolean DEFAULT false NOT NULL,
    youtube_link text
);


--
-- Name: youtube_channel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.youtube_channel (
    id integer NOT NULL,
    artist_id integer NOT NULL,
    channel_id text NOT NULL,
    title text,
    description text,
    custom_url text,
    published_at timestamp(3) without time zone,
    country text,
    default_language text,
    thumbnail_default text,
    thumbnail_medium text,
    thumbnail_high text,
    subscriber_count integer,
    video_count integer,
    view_count bigint,
    hidden_subscriber_count boolean,
    uploads_playlist_id text,
    fetched_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    type public."ChannelType" DEFAULT 'MAIN'::public."ChannelType" NOT NULL
);


--
-- Name: youtube_channel_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.youtube_channel_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: youtube_channel_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.youtube_channel_id_seq OWNED BY public.youtube_channel.id;


--
-- Name: artist id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artist ALTER COLUMN id SET DEFAULT nextval('public.artist_id_seq'::regclass);


--
-- Name: artist_alias id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artist_alias ALTER COLUMN id SET DEFAULT nextval('public.artist_alias_id_seq'::regclass);


--
-- Name: artist_song id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artist_song ALTER COLUMN id SET DEFAULT nextval('public.artist_song_id_seq'::regclass);


--
-- Name: artist_tj_song id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artist_tj_song ALTER COLUMN id SET DEFAULT nextval('public.artist_tj_song_id_seq'::regclass);


--
-- Name: karaoke_song id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.karaoke_song ALTER COLUMN id SET DEFAULT nextval('public.karaoke_song_id_seq'::regclass);


--
-- Name: song id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.song ALTER COLUMN id SET DEFAULT nextval('public.song_id_seq'::regclass);


--
-- Name: song_alias id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.song_alias ALTER COLUMN id SET DEFAULT nextval('public.song_alias_id_seq'::regclass);


--
-- Name: song_spotify_track id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.song_spotify_track ALTER COLUMN id SET DEFAULT nextval('public.song_spotify_track_id_seq'::regclass);


--
-- Name: spotify_artist id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spotify_artist ALTER COLUMN id SET DEFAULT nextval('public.spotify_artist_id_seq'::regclass);


--
-- Name: spotify_artist_track id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spotify_artist_track ALTER COLUMN id SET DEFAULT nextval('public.spotify_artist_track_id_seq'::regclass);


--
-- Name: spotify_track id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spotify_track ALTER COLUMN id SET DEFAULT nextval('public.spotify_track_id_seq'::regclass);


--
-- Name: youtube_channel id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.youtube_channel ALTER COLUMN id SET DEFAULT nextval('public.youtube_channel_id_seq'::regclass);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: artist_alias artist_alias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artist_alias
    ADD CONSTRAINT artist_alias_pkey PRIMARY KEY (id);


--
-- Name: artist artist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artist
    ADD CONSTRAINT artist_pkey PRIMARY KEY (id);


--
-- Name: artist_song artist_song_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artist_song
    ADD CONSTRAINT artist_song_pkey PRIMARY KEY (id);


--
-- Name: artist_tj_song artist_tj_song_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artist_tj_song
    ADD CONSTRAINT artist_tj_song_pkey PRIMARY KEY (id);


--
-- Name: karaoke_song karaoke_song_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.karaoke_song
    ADD CONSTRAINT karaoke_song_pkey PRIMARY KEY (id);


--
-- Name: song_alias song_alias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.song_alias
    ADD CONSTRAINT song_alias_pkey PRIMARY KEY (id);


--
-- Name: song song_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.song
    ADD CONSTRAINT song_pkey PRIMARY KEY (id);


--
-- Name: song_spotify_track song_spotify_track_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.song_spotify_track
    ADD CONSTRAINT song_spotify_track_pkey PRIMARY KEY (id);


--
-- Name: spotify_artist spotify_artist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spotify_artist
    ADD CONSTRAINT spotify_artist_pkey PRIMARY KEY (id);


--
-- Name: spotify_artist_track spotify_artist_track_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spotify_artist_track
    ADD CONSTRAINT spotify_artist_track_pkey PRIMARY KEY (id);


--
-- Name: spotify_track spotify_track_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spotify_track
    ADD CONSTRAINT spotify_track_pkey PRIMARY KEY (id);


--
-- Name: tj_song tj_song_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tj_song
    ADD CONSTRAINT tj_song_pkey PRIMARY KEY (id);


--
-- Name: youtube_channel youtube_channel_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.youtube_channel
    ADD CONSTRAINT youtube_channel_pkey PRIMARY KEY (id);


--
-- Name: artist_alias_alias_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX artist_alias_alias_idx ON public.artist_alias USING btree (alias);


--
-- Name: artist_alias_artist_id_alias_locale_kind_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX artist_alias_artist_id_alias_locale_kind_key ON public.artist_alias USING btree (artist_id, alias, locale, kind);


--
-- Name: artist_alias_artist_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX artist_alias_artist_id_idx ON public.artist_alias USING btree (artist_id);


--
-- Name: artist_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX artist_slug_key ON public.artist USING btree (slug);


--
-- Name: artist_song_artist_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX artist_song_artist_id_idx ON public.artist_song USING btree (artist_id);


--
-- Name: artist_song_artist_id_song_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX artist_song_artist_id_song_id_key ON public.artist_song USING btree (artist_id, song_id);


--
-- Name: artist_song_song_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX artist_song_song_id_idx ON public.artist_song USING btree (song_id);


--
-- Name: artist_spotify_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX artist_spotify_id_key ON public.artist USING btree (spotify_id);


--
-- Name: artist_tj_song_artist_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX artist_tj_song_artist_id_idx ON public.artist_tj_song USING btree (artist_id);


--
-- Name: artist_tj_song_artist_id_tj_song_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX artist_tj_song_artist_id_tj_song_id_key ON public.artist_tj_song USING btree (artist_id, tj_song_id);


--
-- Name: artist_tj_song_tj_song_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX artist_tj_song_tj_song_id_idx ON public.artist_tj_song USING btree (tj_song_id);


--
-- Name: karaoke_song_provider_karaoke_no_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX karaoke_song_provider_karaoke_no_key ON public.karaoke_song USING btree (provider, karaoke_no);


--
-- Name: song_alias_alias_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX song_alias_alias_idx ON public.song_alias USING btree (alias);


--
-- Name: song_alias_song_id_alias_locale_kind_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX song_alias_song_id_alias_locale_kind_key ON public.song_alias USING btree (song_id, alias, locale, kind);


--
-- Name: song_alias_song_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX song_alias_song_id_idx ON public.song_alias USING btree (song_id);


--
-- Name: song_spotify_track_song_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX song_spotify_track_song_id_key ON public.song_spotify_track USING btree (song_id);


--
-- Name: song_spotify_track_spotify_track_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX song_spotify_track_spotify_track_id_idx ON public.song_spotify_track USING btree (spotify_track_id);


--
-- Name: spotify_artist_spotify_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX spotify_artist_spotify_id_key ON public.spotify_artist USING btree (spotify_id);


--
-- Name: spotify_artist_track_spotify_artist_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX spotify_artist_track_spotify_artist_id_idx ON public.spotify_artist_track USING btree (spotify_artist_id);


--
-- Name: spotify_artist_track_spotify_artist_id_spotify_track_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX spotify_artist_track_spotify_artist_id_spotify_track_id_key ON public.spotify_artist_track USING btree (spotify_artist_id, spotify_track_id);


--
-- Name: spotify_artist_track_spotify_track_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX spotify_artist_track_spotify_track_id_idx ON public.spotify_artist_track USING btree (spotify_track_id);


--
-- Name: spotify_track_spotify_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX spotify_track_spotify_id_key ON public.spotify_track USING btree (spotify_id);


--
-- Name: youtube_channel_artist_id_type_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX youtube_channel_artist_id_type_key ON public.youtube_channel USING btree (artist_id, type);


--
-- Name: youtube_channel_subscriber_count_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX youtube_channel_subscriber_count_idx ON public.youtube_channel USING btree (subscriber_count DESC);


--
-- Name: artist_alias artist_alias_artist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artist_alias
    ADD CONSTRAINT artist_alias_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES public.artist(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: artist_song artist_song_artist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artist_song
    ADD CONSTRAINT artist_song_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES public.artist(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: artist_song artist_song_song_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artist_song
    ADD CONSTRAINT artist_song_song_id_fkey FOREIGN KEY (song_id) REFERENCES public.song(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: artist artist_spotify_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artist
    ADD CONSTRAINT artist_spotify_id_fkey FOREIGN KEY (spotify_id) REFERENCES public.spotify_artist(spotify_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: artist_tj_song artist_tj_song_artist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artist_tj_song
    ADD CONSTRAINT artist_tj_song_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES public.artist(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: artist_tj_song artist_tj_song_tj_song_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artist_tj_song
    ADD CONSTRAINT artist_tj_song_tj_song_id_fkey FOREIGN KEY (tj_song_id) REFERENCES public.tj_song(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: karaoke_song karaoke_song_song_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.karaoke_song
    ADD CONSTRAINT karaoke_song_song_id_fkey FOREIGN KEY (song_id) REFERENCES public.song(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: song_alias song_alias_song_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.song_alias
    ADD CONSTRAINT song_alias_song_id_fkey FOREIGN KEY (song_id) REFERENCES public.song(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: song_spotify_track song_spotify_track_song_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.song_spotify_track
    ADD CONSTRAINT song_spotify_track_song_id_fkey FOREIGN KEY (song_id) REFERENCES public.song(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: song_spotify_track song_spotify_track_spotify_track_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.song_spotify_track
    ADD CONSTRAINT song_spotify_track_spotify_track_id_fkey FOREIGN KEY (spotify_track_id) REFERENCES public.spotify_track(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: spotify_artist_track spotify_artist_track_spotify_artist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spotify_artist_track
    ADD CONSTRAINT spotify_artist_track_spotify_artist_id_fkey FOREIGN KEY (spotify_artist_id) REFERENCES public.spotify_artist(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: spotify_artist_track spotify_artist_track_spotify_track_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spotify_artist_track
    ADD CONSTRAINT spotify_artist_track_spotify_track_id_fkey FOREIGN KEY (spotify_track_id) REFERENCES public.spotify_track(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: youtube_channel youtube_channel_artist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.youtube_channel
    ADD CONSTRAINT youtube_channel_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES public.artist(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict FbI5Tb4FGiFgMfzORKe5yQJlc6glMWBAdUAza6fx8hCgHzNuYRW1lUkFaDLlIw4

