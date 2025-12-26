--
-- PostgreSQL database dump - Supabase SQL Editor Compatible
--

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
    name_norm text NOT NULL,
    tj_song_request_url text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    name_ko text NOT NULL,
    blog_id text,
    alias text NOT NULL,
    youtube_channel_id text
);


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
    title_norm text NOT NULL,
    youtube_video_id text,
    youtube_fetched_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    artist_id integer NOT NULL
);


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
    updated_at timestamp(3) without time zone NOT NULL
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
-- Name: karaoke_song id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.karaoke_song ALTER COLUMN id SET DEFAULT nextval('public.karaoke_song_id_seq'::regclass);


--
-- Name: song id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.song ALTER COLUMN id SET DEFAULT nextval('public.song_id_seq'::regclass);


--
-- Name: youtube_channel id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.youtube_channel ALTER COLUMN id SET DEFAULT nextval('public.youtube_channel_id_seq'::regclass);


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES
('fdb5c248-5879-40af-9ecd-3f3939f34926', 'f67738bd978d3d64b9bf2811e3111f8ab89ce825dde9d89b91287280589ef3e4', '2025-12-25 12:36:32.727023+00', '20251225073905_init', NULL, NULL, '2025-12-25 12:36:32.70045+00', 1),
('4d08997f-0a8e-402d-91d6-2ef92e50a1c5', '6160f6531fda4cfacd2cd4e649c857ef18b87544533872668e65a9976b53a017', '2025-12-25 12:36:32.737339+00', '20251225082105_add_name_ko', NULL, NULL, '2025-12-25 12:36:32.728671+00', 1),
('0a7c96e6-6cc4-4216-869e-508da7fdb5a4', 'cbf8fa5de1139af7138a1f97a73c7f61aee0977dae6a36bb3032d344c4449c7e', '2025-12-25 12:36:32.746959+00', '20251225083303_add_blog_id', NULL, NULL, '2025-12-25 12:36:32.739018+00', 1),
('ad8ccca2-fbc4-4f7f-9413-097538f6040a', '718bc1274ae4b6e83452a502ab529e91c23b66a69938f46692489d2b36281622', '2025-12-25 12:36:32.762979+00', '20251225085758_add_alias', NULL, NULL, '2025-12-25 12:36:32.74963+00', 1),
('fb60c276-7353-4723-8608-b18c9255c0f2', 'e66140e328077d4a6256acf161a1ae03e20adc0e15b860c9ba57fdc5d053b236', '2025-12-25 12:36:32.772173+00', '20251225090216_add_unique_song', NULL, NULL, '2025-12-25 12:36:32.765438+00', 1),
('0dbab85f-c13a-405a-b103-e0b17b53788a', '23ff75613a6a66bb14297a59f2e9addc683c5230cb74d4989dd60cd690bfe2bf', '2025-12-25 12:36:32.782211+00', '20251225095340_add_youtube_channel_fields', NULL, NULL, '2025-12-25 12:36:32.773943+00', 1),
('ec0fa9d4-c9f3-480c-a7c3-e8d78bcaea0d', '4ad8da40a5b70c258ca29baeb8dd20c3f007fb5486aa8640bb38b0fd5553b593', '2025-12-25 12:36:32.793963+00', '20251225101129_add_youtube_info', NULL, NULL, '2025-12-25 12:36:32.78446+00', 1),
('cdee157c-1811-4643-902b-d6afd4775992', '8dfcf917089a182b177d7768b2894a7e4d153a92cb80b835eece463e604b3d51', '2025-12-25 12:36:32.801398+00', '20251225101416_add_youtube_last_field', NULL, NULL, '2025-12-25 12:36:32.795813+00', 1),
('6f3fb5ba-76cb-4b76-bfdc-314334221102', 'cea80cf113102acb701eb1b6f392bf091d2132c66c2eea0f45383bd06bf69409', '2025-12-25 12:36:32.809911+00', '20251225101613_add_youtube_description', NULL, NULL, '2025-12-25 12:36:32.803318+00', 1),
('156c005d-c9a5-4338-810c-0b6ab225c072', '2e19bde48676743940be9d626dcd247c9bbc8c66d3d77352c80a2762e9f9523e', '2025-12-25 12:36:32.824807+00', '20251225102747_add_youtube_table', NULL, NULL, '2025-12-25 12:36:32.812201+00', 1),
('7154f450-93fe-4330-9143-a7c2e5158db3', '26377acc0c79fe8f79ffb1d9e1c8e9facc2826a978f29d154e88739ce3655b54', '2025-12-25 12:36:32.830724+00', '20251225104020_allow_duplicate_channel_ids', NULL, NULL, '2025-12-25 12:36:32.827189+00', 1),
('b2a9a121-6ed4-4c87-820d-e71ccb1d904c', 'b1f227f87b1d01888e8da41571cd252963e708da6fc1b2ad4aa6ddc94062c4a5', '2025-12-25 12:36:32.838274+00', '20251225104552', NULL, NULL, '2025-12-25 12:36:32.831864+00', 1),
('ca2c64d1-7b46-41fe-aa04-73eba6fbd4dd', 'ac637aeb5800176b28e53ce33ce6c10ad72f4699e6e9297f862734d43aea262b', '2025-12-25 12:36:32.850255+00', '20251225105134_add_subscriber_index', NULL, NULL, '2025-12-25 12:36:32.84028+00', 1);


--
-- Data for Name: artist; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.artist (id, name, name_norm, tj_song_request_url, created_at, updated_at, name_ko, blog_id, alias, youtube_channel_id) VALUES
(1, '結束バンド', '結束バンド', NULL, '2025-12-25 12:40:27.281', '2025-12-25 12:40:27.281', '結束バンド', NULL, '-', NULL);


--
-- Data for Name: karaoke_song; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.karaoke_song (id, song_id, provider, karaoke_no, provider_song_url, last_seen_at, ingested_at, ingested_from) VALUES
(1, 1, 'TJ', '68697', NULL, '2025-12-25 12:40:27.324', '2025-12-25 12:40:27.324', 'TJ_JPN_CRAWL'),
(2, 2, 'TJ', '68748', NULL, '2025-12-25 12:40:27.372', '2025-12-25 12:40:27.372', 'TJ_JPN_CRAWL'),
(3, 3, 'TJ', '68706', NULL, '2025-12-25 12:40:27.396', '2025-12-25 12:40:27.396', 'TJ_JPN_CRAWL'),
(4, 4, 'TJ', '68723', NULL, '2025-12-25 12:40:27.416', '2025-12-25 12:40:27.416', 'TJ_JPN_CRAWL'),
(5, 5, 'TJ', '68763', NULL, '2025-12-25 12:40:27.435', '2025-12-25 12:40:27.435', 'TJ_JPN_CRAWL');


--
-- Data for Name: song; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.song (id, title, title_ko, title_norm, youtube_video_id, youtube_fetched_at, created_at, updated_at, artist_id) VALUES
(1, 'ギターと孤独と蒼い惑星(アニメ''ぼっち・ざ・ろっく!'' 挿入歌)', NULL, 'ギターと孤独と蒼い惑星(アニメ''ぼっち・ざ・ろっく!'' 挿入歌)', NULL, NULL, '2025-12-25 12:40:27.318', '2025-12-25 12:40:27.318', 1),
(2, '星座になれたら(''ぼっち・ざ・ろっく！'' OST)', NULL, '星座になれたら(''ぼっち・ざ・ろっく！'' OST)', NULL, NULL, '2025-12-25 12:40:27.364', '2025-12-25 12:40:27.364', 1),
(3, '青春コンプレックス(アニメ ''ぼっち・ざ・ろっく！'' OP)', NULL, '青春コンプレックス(アニメ ''ぼっち・ざ・ろっく！'' OP)', NULL, NULL, '2025-12-25 12:40:27.392', '2025-12-25 12:40:27.392', 1),
(4, '転がる岩,君に朝が降る(アニメ ''ぼっち・ざ・ろっく！'' ED)', NULL, '転がる岩,君に朝が降る(アニメ ''ぼっち・ざ・ろっく！'' ED)', NULL, NULL, '2025-12-25 12:40:27.412', '2025-12-25 12:40:27.412', 1),
(5, '忘れてやらない(''ぼっち・ざ・ろっく！'' OST)', NULL, '忘れてやらない(''ぼっち・ざ・ろっく！'' OST)', NULL, NULL, '2025-12-25 12:40:27.43', '2025-12-25 12:40:27.43', 1);


--
-- Name: artist_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.artist_id_seq', 1, true);


--
-- Name: karaoke_song_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.karaoke_song_id_seq', 5, true);


--
-- Name: song_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.song_id_seq', 5, true);


--
-- Name: youtube_channel_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.youtube_channel_id_seq', 1, false);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: artist artist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artist
    ADD CONSTRAINT artist_pkey PRIMARY KEY (id);


--
-- Name: karaoke_song karaoke_song_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.karaoke_song
    ADD CONSTRAINT karaoke_song_pkey PRIMARY KEY (id);


--
-- Name: song song_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.song
    ADD CONSTRAINT song_pkey PRIMARY KEY (id);


--
-- Name: youtube_channel youtube_channel_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.youtube_channel
    ADD CONSTRAINT youtube_channel_pkey PRIMARY KEY (id);


--
-- Name: artist_alias_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX artist_alias_key ON public.artist USING btree (alias);


--
-- Name: karaoke_song_provider_karaoke_no_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX karaoke_song_provider_karaoke_no_key ON public.karaoke_song USING btree (provider, karaoke_no);


--
-- Name: song_artist_id_title_norm_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX song_artist_id_title_norm_key ON public.song USING btree (artist_id, title_norm);


--
-- Name: youtube_channel_artist_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX youtube_channel_artist_id_key ON public.youtube_channel USING btree (artist_id);


--
-- Name: youtube_channel_subscriber_count_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX youtube_channel_subscriber_count_idx ON public.youtube_channel USING btree (subscriber_count DESC);


--
-- Name: karaoke_song karaoke_song_song_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.karaoke_song
    ADD CONSTRAINT karaoke_song_song_id_fkey FOREIGN KEY (song_id) REFERENCES public.song(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: song song_artist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.song
    ADD CONSTRAINT song_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES public.artist(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: youtube_channel youtube_channel_artist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.youtube_channel
    ADD CONSTRAINT youtube_channel_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES public.artist(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--
