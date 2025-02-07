--
-- PostgreSQL database dump
--

-- Dumped from database version 14.15 (Homebrew)
-- Dumped by pg_dump version 14.15 (Homebrew)

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO postgres;

--
-- Name: characters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.characters (
    id integer NOT NULL,
    name character varying NOT NULL,
    description text,
    traits json NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.characters OWNER TO postgres;

--
-- Name: characters_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.characters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.characters_id_seq OWNER TO postgres;

--
-- Name: characters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.characters_id_seq OWNED BY public.characters.id;


--
-- Name: feedback; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.feedback (
    id integer NOT NULL,
    session_id integer NOT NULL,
    content character varying NOT NULL,
    metrics json NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.feedback OWNER TO postgres;

--
-- Name: feedback_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.feedback_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.feedback_id_seq OWNER TO postgres;

--
-- Name: feedback_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.feedback_id_seq OWNED BY public.feedback.id;


--
-- Name: performances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.performances (
    id integer NOT NULL,
    session_id integer NOT NULL,
    character_id integer NOT NULL,
    scene_id integer NOT NULL,
    metrics json NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.performances OWNER TO postgres;

--
-- Name: performances_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.performances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.performances_id_seq OWNER TO postgres;

--
-- Name: performances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.performances_id_seq OWNED BY public.performances.id;


--
-- Name: recording_analyses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recording_analyses (
    id integer NOT NULL,
    recording_id integer,
    transcription text,
    accuracy_score double precision,
    timing_score double precision,
    pronunciation_score double precision,
    emotion_score double precision,
    overall_score double precision,
    suggestions json,
    created_at timestamp with time zone
);


ALTER TABLE public.recording_analyses OWNER TO postgres;

--
-- Name: recording_analyses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.recording_analyses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.recording_analyses_id_seq OWNER TO postgres;

--
-- Name: recording_analyses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.recording_analyses_id_seq OWNED BY public.recording_analyses.id;


--
-- Name: recordings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recordings (
    id integer NOT NULL,
    session_id integer,
    audio_path character varying,
    created_at timestamp with time zone
);


ALTER TABLE public.recordings OWNER TO postgres;

--
-- Name: recordings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.recordings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.recordings_id_seq OWNER TO postgres;

--
-- Name: recordings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.recordings_id_seq OWNED BY public.recordings.id;


--
-- Name: scenes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.scenes (
    id integer NOT NULL,
    script_id integer NOT NULL,
    session_id integer NOT NULL,
    name character varying NOT NULL,
    content text NOT NULL,
    scene_metadata json NOT NULL,
    "order" integer NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.scenes OWNER TO postgres;

--
-- Name: scenes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.scenes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.scenes_id_seq OWNER TO postgres;

--
-- Name: scenes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.scenes_id_seq OWNED BY public.scenes.id;


--
-- Name: script_characters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.script_characters (
    script_id integer NOT NULL,
    character_id integer NOT NULL
);


ALTER TABLE public.script_characters OWNER TO postgres;

--
-- Name: scripts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.scripts (
    id integer NOT NULL,
    user_id integer NOT NULL,
    title character varying NOT NULL,
    content text NOT NULL,
    script_metadata json NOT NULL,
    analysis json NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.scripts OWNER TO postgres;

--
-- Name: scripts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.scripts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.scripts_id_seq OWNER TO postgres;

--
-- Name: scripts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.scripts_id_seq OWNED BY public.scripts.id;


--
-- Name: session_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.session_users (
    session_id integer NOT NULL,
    user_id integer NOT NULL
);


ALTER TABLE public.session_users OWNER TO postgres;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    id integer NOT NULL,
    script_id integer NOT NULL,
    title character varying NOT NULL,
    content text,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO postgres;

--
-- Name: sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.sessions_id_seq OWNER TO postgres;

--
-- Name: sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sessions_id_seq OWNED BY public.sessions.id;


--
-- Name: tts_cache; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tts_cache (
    id integer NOT NULL,
    text_hash character varying NOT NULL,
    voice_id character varying NOT NULL,
    audio_path character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_accessed timestamp with time zone NOT NULL
);


ALTER TABLE public.tts_cache OWNER TO postgres;

--
-- Name: tts_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tts_cache_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.tts_cache_id_seq OWNER TO postgres;

--
-- Name: tts_cache_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tts_cache_id_seq OWNED BY public.tts_cache.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying NOT NULL,
    email character varying NOT NULL,
    hashed_password character varying NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp with time zone NOT NULL,
    last_active timestamp with time zone NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: characters id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.characters ALTER COLUMN id SET DEFAULT nextval('public.characters_id_seq'::regclass);


--
-- Name: feedback id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback ALTER COLUMN id SET DEFAULT nextval('public.feedback_id_seq'::regclass);


--
-- Name: performances id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.performances ALTER COLUMN id SET DEFAULT nextval('public.performances_id_seq'::regclass);


--
-- Name: recording_analyses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recording_analyses ALTER COLUMN id SET DEFAULT nextval('public.recording_analyses_id_seq'::regclass);


--
-- Name: recordings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recordings ALTER COLUMN id SET DEFAULT nextval('public.recordings_id_seq'::regclass);


--
-- Name: scenes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scenes ALTER COLUMN id SET DEFAULT nextval('public.scenes_id_seq'::regclass);


--
-- Name: scripts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scripts ALTER COLUMN id SET DEFAULT nextval('public.scripts_id_seq'::regclass);


--
-- Name: sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions ALTER COLUMN id SET DEFAULT nextval('public.sessions_id_seq'::regclass);


--
-- Name: tts_cache id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tts_cache ALTER COLUMN id SET DEFAULT nextval('public.tts_cache_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.alembic_version (version_num) FROM stdin;
0c1fc557e255
\.


--
-- Data for Name: characters; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.characters (id, name, description, traits, created_at) FROM stdin;
\.


--
-- Data for Name: feedback; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.feedback (id, session_id, content, metrics, created_at) FROM stdin;
\.


--
-- Data for Name: performances; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.performances (id, session_id, character_id, scene_id, metrics, created_at) FROM stdin;
\.


--
-- Data for Name: recording_analyses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.recording_analyses (id, recording_id, transcription, accuracy_score, timing_score, pronunciation_score, emotion_score, overall_score, suggestions, created_at) FROM stdin;
\.


--
-- Data for Name: recordings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.recordings (id, session_id, audio_path, created_at) FROM stdin;
\.


--
-- Data for Name: scenes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.scenes (id, script_id, session_id, name, content, scene_metadata, "order", created_at) FROM stdin;
\.


--
-- Data for Name: script_characters; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.script_characters (script_id, character_id) FROM stdin;
\.


--
-- Data for Name: scripts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.scripts (id, user_id, title, content, script_metadata, analysis, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: session_users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.session_users (session_id, user_id) FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (id, script_id, title, content, settings, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: tts_cache; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tts_cache (id, text_hash, voice_id, audio_path, created_at, last_accessed) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, email, hashed_password, is_active, created_at, last_active) FROM stdin;
\.


--
-- Name: characters_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.characters_id_seq', 1, false);


--
-- Name: feedback_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.feedback_id_seq', 1, false);


--
-- Name: performances_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.performances_id_seq', 1, false);


--
-- Name: recording_analyses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.recording_analyses_id_seq', 1, false);


--
-- Name: recordings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.recordings_id_seq', 1, false);


--
-- Name: scenes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.scenes_id_seq', 1, false);


--
-- Name: scripts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.scripts_id_seq', 1, false);


--
-- Name: sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sessions_id_seq', 1, false);


--
-- Name: tts_cache_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tts_cache_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 1, false);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: characters pk_characters; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.characters
    ADD CONSTRAINT pk_characters PRIMARY KEY (id);


--
-- Name: feedback pk_feedback; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT pk_feedback PRIMARY KEY (id);


--
-- Name: performances pk_performances; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.performances
    ADD CONSTRAINT pk_performances PRIMARY KEY (id);


--
-- Name: recording_analyses pk_recording_analyses; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recording_analyses
    ADD CONSTRAINT pk_recording_analyses PRIMARY KEY (id);


--
-- Name: recordings pk_recordings; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recordings
    ADD CONSTRAINT pk_recordings PRIMARY KEY (id);


--
-- Name: scenes pk_scenes; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scenes
    ADD CONSTRAINT pk_scenes PRIMARY KEY (id);


--
-- Name: script_characters pk_script_characters; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.script_characters
    ADD CONSTRAINT pk_script_characters PRIMARY KEY (script_id, character_id);


--
-- Name: scripts pk_scripts; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scripts
    ADD CONSTRAINT pk_scripts PRIMARY KEY (id);


--
-- Name: session_users pk_session_users; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session_users
    ADD CONSTRAINT pk_session_users PRIMARY KEY (session_id, user_id);


--
-- Name: sessions pk_sessions; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT pk_sessions PRIMARY KEY (id);


--
-- Name: tts_cache pk_tts_cache; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tts_cache
    ADD CONSTRAINT pk_tts_cache PRIMARY KEY (id);


--
-- Name: users pk_users; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT pk_users PRIMARY KEY (id);


--
-- Name: tts_cache uq_tts_cache_text_hash; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tts_cache
    ADD CONSTRAINT uq_tts_cache_text_hash UNIQUE (text_hash);


--
-- Name: users uq_users_email; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT uq_users_email UNIQUE (email);


--
-- Name: users uq_users_username; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT uq_users_username UNIQUE (username);


--
-- Name: ix_recording_analyses_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_recording_analyses_id ON public.recording_analyses USING btree (id);


--
-- Name: ix_recordings_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_recordings_id ON public.recordings USING btree (id);


--
-- Name: feedback fk_feedback_session_id_sessions; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT fk_feedback_session_id_sessions FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: performances fk_performances_character_id_characters; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.performances
    ADD CONSTRAINT fk_performances_character_id_characters FOREIGN KEY (character_id) REFERENCES public.characters(id) ON DELETE CASCADE;


--
-- Name: performances fk_performances_scene_id_scenes; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.performances
    ADD CONSTRAINT fk_performances_scene_id_scenes FOREIGN KEY (scene_id) REFERENCES public.scenes(id) ON DELETE CASCADE;


--
-- Name: performances fk_performances_session_id_sessions; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.performances
    ADD CONSTRAINT fk_performances_session_id_sessions FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: recording_analyses fk_recording_analyses_recording_id_recordings; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recording_analyses
    ADD CONSTRAINT fk_recording_analyses_recording_id_recordings FOREIGN KEY (recording_id) REFERENCES public.recordings(id);


--
-- Name: recordings fk_recordings_session_id_sessions; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recordings
    ADD CONSTRAINT fk_recordings_session_id_sessions FOREIGN KEY (session_id) REFERENCES public.sessions(id);


--
-- Name: scenes fk_scenes_script_id_scripts; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scenes
    ADD CONSTRAINT fk_scenes_script_id_scripts FOREIGN KEY (script_id) REFERENCES public.scripts(id) ON DELETE CASCADE;


--
-- Name: scenes fk_scenes_session_id_sessions; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scenes
    ADD CONSTRAINT fk_scenes_session_id_sessions FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: script_characters fk_script_characters_character_id_characters; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.script_characters
    ADD CONSTRAINT fk_script_characters_character_id_characters FOREIGN KEY (character_id) REFERENCES public.characters(id) ON DELETE CASCADE;


--
-- Name: script_characters fk_script_characters_script_id_scripts; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.script_characters
    ADD CONSTRAINT fk_script_characters_script_id_scripts FOREIGN KEY (script_id) REFERENCES public.scripts(id) ON DELETE CASCADE;


--
-- Name: scripts fk_scripts_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scripts
    ADD CONSTRAINT fk_scripts_user_id_users FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: session_users fk_session_users_session_id_sessions; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session_users
    ADD CONSTRAINT fk_session_users_session_id_sessions FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: session_users fk_session_users_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session_users
    ADD CONSTRAINT fk_session_users_user_id_users FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: sessions fk_sessions_script_id_scripts; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT fk_sessions_script_id_scripts FOREIGN KEY (script_id) REFERENCES public.scripts(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

