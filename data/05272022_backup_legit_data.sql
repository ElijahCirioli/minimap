--
-- PostgreSQL database dump
--

-- Dumped from database version 14.2 (Ubuntu 14.2-1.pgdg20.04+1+b1)
-- Dumped by pg_dump version 14.2

-- Started on 2022-05-27 17:38:16

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
-- TOC entry 833 (class 1247 OID 3372777)
-- Name: markerType; Type: TYPE; Schema: public; Owner: inihbbnrihxubh
--

CREATE TYPE public."markerType" AS ENUM (
    'VendingMachine',
    'DrinkingFountain',
    'PostalDropBox',
    'Restroom',
    'InterestPoint',
    'BikeRack'
);


ALTER TYPE public."markerType" OWNER TO inihbbnrihxubh;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 209 (class 1259 OID 3372789)
-- Name: BikeRack; Type: TABLE; Schema: public; Owner: inihbbnrihxubh
--

CREATE TABLE public."BikeRack" (
    "markerID" integer NOT NULL,
    "isCovered" boolean
);


ALTER TABLE public."BikeRack" OWNER TO inihbbnrihxubh;

--
-- TOC entry 210 (class 1259 OID 3372792)
-- Name: DrinkingFountain; Type: TABLE; Schema: public; Owner: inihbbnrihxubh
--

CREATE TABLE public."DrinkingFountain" (
    "markerID" integer NOT NULL,
    "hasBottleFiller" boolean
);


ALTER TABLE public."DrinkingFountain" OWNER TO inihbbnrihxubh;

--
-- TOC entry 211 (class 1259 OID 3372795)
-- Name: InterestPoint; Type: TABLE; Schema: public; Owner: inihbbnrihxubh
--

CREATE TABLE public."InterestPoint" (
    "markerID" integer NOT NULL,
    name character varying(50) NOT NULL,
    description character varying(256)
);


ALTER TABLE public."InterestPoint" OWNER TO inihbbnrihxubh;

--
-- TOC entry 212 (class 1259 OID 3372798)
-- Name: Marker; Type: TABLE; Schema: public; Owner: inihbbnrihxubh
--

CREATE TABLE public."Marker" (
    "markerID" integer NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    date timestamp without time zone DEFAULT LOCALTIMESTAMP NOT NULL,
    type public."markerType" NOT NULL
);


ALTER TABLE public."Marker" OWNER TO inihbbnrihxubh;

--
-- TOC entry 213 (class 1259 OID 3372802)
-- Name: Marker_markerID_seq; Type: SEQUENCE; Schema: public; Owner: inihbbnrihxubh
--

ALTER TABLE public."Marker" ALTER COLUMN "markerID" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public."Marker_markerID_seq"
    START WITH 3
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 214 (class 1259 OID 3372803)
-- Name: PostalDropBox; Type: TABLE; Schema: public; Owner: inihbbnrihxubh
--

CREATE TABLE public."PostalDropBox" (
    "markerID" integer NOT NULL,
    "collectionTime" character varying(50)
);


ALTER TABLE public."PostalDropBox" OWNER TO inihbbnrihxubh;

--
-- TOC entry 215 (class 1259 OID 3372806)
-- Name: Report; Type: TABLE; Schema: public; Owner: inihbbnrihxubh
--

CREATE TABLE public."Report" (
    "userID" integer NOT NULL,
    "markerID" integer NOT NULL,
    date timestamp without time zone DEFAULT LOCALTIMESTAMP NOT NULL
);


ALTER TABLE public."Report" OWNER TO inihbbnrihxubh;

--
-- TOC entry 216 (class 1259 OID 3372810)
-- Name: Restroom; Type: TABLE; Schema: public; Owner: inihbbnrihxubh
--

CREATE TABLE public."Restroom" (
    "markerID" integer NOT NULL,
    "isFree" boolean,
    "hasChangingRoom" boolean,
    "isSingleUser" boolean,
    "hasSanitaryProducts" boolean,
    "isGenderInclusive" boolean
);


ALTER TABLE public."Restroom" OWNER TO inihbbnrihxubh;

--
-- TOC entry 217 (class 1259 OID 3372813)
-- Name: Review; Type: TABLE; Schema: public; Owner: inihbbnrihxubh
--

CREATE TABLE public."Review" (
    "userID" integer NOT NULL,
    "markerID" integer NOT NULL,
    rating integer NOT NULL,
    description character varying(256)
);


ALTER TABLE public."Review" OWNER TO inihbbnrihxubh;

--
-- TOC entry 218 (class 1259 OID 3372816)
-- Name: User; Type: TABLE; Schema: public; Owner: inihbbnrihxubh
--

CREATE TABLE public."User" (
    "userID" integer NOT NULL,
    username character varying(50)
);


ALTER TABLE public."User" OWNER TO inihbbnrihxubh;

--
-- TOC entry 219 (class 1259 OID 3372819)
-- Name: User_userID_seq; Type: SEQUENCE; Schema: public; Owner: inihbbnrihxubh
--

ALTER TABLE public."User" ALTER COLUMN "userID" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public."User_userID_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 220 (class 1259 OID 3372820)
-- Name: VendingMachine; Type: TABLE; Schema: public; Owner: inihbbnrihxubh
--

CREATE TABLE public."VendingMachine" (
    "markerID" integer NOT NULL,
    "hasDrinks" boolean,
    "hasCandy" boolean,
    "hasFood" boolean,
    "acceptsCard" boolean,
    "acceptsCash" boolean
);


ALTER TABLE public."VendingMachine" OWNER TO inihbbnrihxubh;

--
-- TOC entry 4353 (class 0 OID 3372789)
-- Dependencies: 209
-- Data for Name: BikeRack; Type: TABLE DATA; Schema: public; Owner: inihbbnrihxubh
--

COPY public."BikeRack" ("markerID", "isCovered") FROM stdin;
178	f
179	t
180	t
183	f
189	t
190	f
191	t
193	t
212	f
216	t
219	t
221	t
224	f
225	f
226	t
227	t
233	t
234	t
235	t
239	f
240	t
245	t
251	t
258	t
259	t
260	t
262	t
264	t
265	f
266	t
268	t
269	t
\.


--
-- TOC entry 4354 (class 0 OID 3372792)
-- Dependencies: 210
-- Data for Name: DrinkingFountain; Type: TABLE DATA; Schema: public; Owner: inihbbnrihxubh
--

COPY public."DrinkingFountain" ("markerID", "hasBottleFiller") FROM stdin;
177	t
187	t
195	t
197	t
200	t
203	f
208	t
211	t
214	t
230	t
232	f
236	t
242	t
246	f
248	\N
250	t
252	\N
254	t
\.


--
-- TOC entry 4355 (class 0 OID 3372795)
-- Dependencies: 211
-- Data for Name: InterestPoint; Type: TABLE DATA; Schema: public; Owner: inihbbnrihxubh
--

COPY public."InterestPoint" ("markerID", name, description) FROM stdin;
182	Fountain	Not for drinking, unless you're very adventurous.
184	Bell tower 	Rings on the hour
192	Statue of a guy with a book	Slovak author and humanitarian Martin Kukucin
194	SEC Plaza	You could walk past, but there's probably something cool going on here.
199	Woman graduate statue	Alice Biddle was the first woman to graduate from OSU in 1870
205	Lego Scale Model	This is like $1000 worth of lego 
206	Flags	There's a lot of them.
213	MU lanes and games	Bowling and some other stuff 
220	Weird statue	It's called "untitled" what did you expect 
223	Apollo 14 moon tree	This tree was grown from a seed that flew in lunar orbit during the Apollo 14 moon landing mission in 1971.
231	Big loopy thing	It probably symbolizes something 
238	Engineering Servers	Quantum? Nope. But plenty of conventional computers.
241	What's the longest your straw could be?	Find the answer at goo.gl/bukplg
253	Fosbury Flop Statue	1968 'lympics
255	Starship Robot Memorial	RIP you never could deliver that sandwich. 0 trains were prosecuted following the release of the tragic video
257	BIG FOOTBALL	I don't think that's regulation size...
261	OSU Gateway Sign	White text serif font wide kerning, on a black background.
267	Big metal flower thing	It opens but don't get your hopes up
\.


--
-- TOC entry 4356 (class 0 OID 3372798)
-- Dependencies: 212
-- Data for Name: Marker; Type: TABLE DATA; Schema: public; Owner: inihbbnrihxubh
--

COPY public."Marker" ("markerID", latitude, longitude, date, type) FROM stdin;
176	44.56419958621115	-123.27219084971549	2022-05-27 21:30:23.53923	Restroom
177	44.56420365632838	-123.27218735322069	2022-05-27 21:31:07.182384	DrinkingFountain
178	44.56433996392926	-123.27522304182298	2022-05-27 21:32:55.744687	BikeRack
179	44.56429807965989	-123.27445461293956	2022-05-27 21:34:21.243279	BikeRack
180	44.564353516044655	-123.27592451870687	2022-05-27 21:37:08.35402	BikeRack
181	44.56461185946192	-123.27598441109906	2022-05-27 21:37:55.988318	PostalDropBox
182	44.5647268318093	-123.27610291308314	2022-05-27 21:39:18.54023	InterestPoint
183	44.56552394082917	-123.27525774812219	2022-05-27 21:40:48.337812	BikeRack
184	44.5656577061651	-123.27520410394189	2022-05-27 21:41:14.214957	InterestPoint
185	44.56521550477104	-123.2756238263239	2022-05-27 21:41:29.46572	VendingMachine
186	44.56511587397312	-123.27559761982651	2022-05-27 21:42:32.891176	VendingMachine
187	44.5650948993602	-123.2760768215266	2022-05-27 21:43:00.737191	DrinkingFountain
188	44.56511524502351	-123.27605289187615	2022-05-27 21:43:26.840684	Restroom
189	44.56527670502488	-123.27669026196766	2022-05-27 21:43:35.980193	BikeRack
190	44.56627010186913	-123.27599919492083	2022-05-27 21:44:00.16262	BikeRack
191	44.56506534279756	-123.27720206536159	2022-05-27 21:45:46.918777	BikeRack
192	44.5651400914775	-123.27668504409954	2022-05-27 21:46:10.075261	InterestPoint
193	44.56515323169015	-123.27767765058631	2022-05-27 21:50:27.95012	BikeRack
194	44.56493038791282	-123.2778841718313	2022-05-27 21:50:37.426574	InterestPoint
195	44.56563967192272	-123.27733527364181	2022-05-27 21:52:56.279218	DrinkingFountain
196	44.564815001816484	-123.27714747137068	2022-05-27 21:52:58.929593	Restroom
197	44.56481575439201	-123.27718280614805	2022-05-27 21:53:16.154781	DrinkingFountain
198	44.5656255449507	-123.27733818206667	2022-05-27 21:53:16.302645	Restroom
199	44.565404417786	-123.27779041463214	2022-05-27 21:55:06.927156	InterestPoint
200	44.564873521286636	-123.27819138968374	2022-05-27 21:56:57.333328	DrinkingFountain
201	44.565029432893176	-123.27827023282974	2022-05-27 21:57:06.985984	Restroom
202	44.564836494280684	-123.2781880470183	2022-05-27 21:57:17.942227	Restroom
203	44.56495473774108	-123.2780909452409	2022-05-27 21:58:00.649175	DrinkingFountain
204	44.564999890944684	-123.27846031747856	2022-05-27 21:58:34.413317	VendingMachine
205	44.56495373463737	-123.27876886043221	2022-05-27 21:59:57.28855	InterestPoint
206	44.56492580242647	-123.27888222420817	2022-05-27 22:01:22.686979	InterestPoint
207	44.56496398843442	-123.27856490535196	2022-05-27 22:01:39.436233	Restroom
208	44.564901781045016	-123.27917885266591	2022-05-27 22:02:24.179951	DrinkingFountain
209	44.56494348495676	-123.27924243238186	2022-05-27 22:03:11.529743	Restroom
210	44.56482728230245	-123.27921059215544	2022-05-27 22:03:31.343721	VendingMachine
211	44.56496279572542	-123.27935456621897	2022-05-27 22:05:44.199869	DrinkingFountain
212	44.56491899561008	-123.27949070880592	2022-05-27 22:06:37.730464	BikeRack
213	44.56488711974016	-123.27948952890216	2022-05-27 22:07:03.452606	InterestPoint
214	44.56490882233258	-123.28178785934102	2022-05-27 22:10:02.445545	DrinkingFountain
215	44.564981989930374	-123.28182610968085	2022-05-27 22:10:19.958836	Restroom
216	44.56510233278663	-123.28233409311323	2022-05-27 22:13:59.403396	BikeRack
217	44.565878685497744	-123.28180117024301	2022-05-27 22:14:01.440512	Restroom
218	44.565837637354996	-123.2818545061073	2022-05-27 22:14:19.293771	VendingMachine
219	44.56575131422534	-123.2824350900994	2022-05-27 22:14:22.853169	BikeRack
220	44.5666651395916	-123.28454588302716	2022-05-27 22:19:46.282603	InterestPoint
221	44.56645661867332	-123.28487156020785	2022-05-27 22:20:25.962757	BikeRack
222	44.566455139953085	-123.28482818302535	2022-05-27 22:20:45.729816	PostalDropBox
223	44.56428665495932	-123.28490226934345	2022-05-27 22:24:29.77437	InterestPoint
224	44.56567597106472	-123.28492975845293	2022-05-27 22:24:40.853009	BikeRack
225	44.56681546314523	-123.28349029700476	2022-05-27 22:31:01.408372	BikeRack
226	44.5666741735638	-123.28284916656654	2022-05-27 22:32:04.553699	BikeRack
227	44.56775096088327	-123.27960522373198	2022-05-27 22:49:08.483556	BikeRack
228	44.56785030984882	-123.27959682350829	2022-05-27 22:49:54.609199	VendingMachine
229	44.5678764148761	-123.2796213084606	2022-05-27 22:50:10.934799	Restroom
230	44.56789122402594	-123.27960052134074	2022-05-27 22:50:26.004235	DrinkingFountain
231	44.56795523549016	-123.27932648915815	2022-05-27 22:51:17.941872	InterestPoint
232	44.5665147	-123.2792778	2022-05-27 22:51:40.384947	DrinkingFountain
233	44.56724050485375	-123.27929211136882	2022-05-27 22:52:26.475513	BikeRack
234	44.566587645140444	-123.27966123075788	2022-05-27 22:52:31.220048	BikeRack
235	44.56708111146319	-123.27934368868857	2022-05-27 22:53:16.753836	BikeRack
236	44.56718633692116	-123.27882223370874	2022-05-27 22:53:47.069047	DrinkingFountain
237	44.567230354025696	-123.27881550688755	2022-05-27 22:54:06.131394	Restroom
238	44.567100372113615	-123.27841418306924	2022-05-27 22:57:20.216215	InterestPoint
239	44.56799299056113	-123.27780297204247	2022-05-27 22:59:16.722732	BikeRack
240	44.567332376075825	-123.27702740274376	2022-05-27 22:59:27.759255	BikeRack
241	44.567807937995504	-123.2775849016845	2022-05-27 23:02:10.636967	InterestPoint
242	44.567802604986525	-123.27763964901791	2022-05-27 23:02:58.738404	DrinkingFountain
243	44.56807332224659	-123.27725818230992	2022-05-27 23:03:52.762511	Restroom
244	44.5680856204328	-123.27646327600297	2022-05-27 23:07:35.79519	Restroom
245	44.5674881	-123.2762427	2022-05-27 23:11:31.310424	BikeRack
246	44.56734454496285	-123.27546893465839	2022-05-27 23:12:54.50296	DrinkingFountain
247	44.5672095078672	-123.27555368190194	2022-05-27 23:14:39.921428	Restroom
248	44.56709128522408	-123.27555355282664	2022-05-27 23:15:41.588707	DrinkingFountain
249	44.565191497269204	-123.27567919894989	2022-05-27 23:22:20.413954	Restroom
250	44.565262760220016	-123.27564412925933	2022-05-27 23:23:05.727282	DrinkingFountain
251	44.56316315825383	-123.27583160583299	2022-05-27 23:27:27.443424	BikeRack
252	44.56289354719916	-123.27867305602831	2022-05-27 23:36:32.713922	DrinkingFountain
253	44.56294282064299	-123.27923758388623	2022-05-27 23:36:50.095342	InterestPoint
254	44.56346710735008	-123.27874546919304	2022-05-27 23:37:29.642069	DrinkingFountain
255	44.561965549163354	-123.27962080788349	2022-05-27 23:40:55.374689	InterestPoint
256	44.56082493983892	-123.27982653705921	2022-05-27 23:43:44.855356	PostalDropBox
257	44.56052403854648	-123.27990081857781	2022-05-27 23:43:48.52343	InterestPoint
258	44.560776366679114	-123.27921574595725	2022-05-27 23:44:42.213743	BikeRack
259	44.56097380337041	-123.28002626309973	2022-05-27 23:44:50.086308	BikeRack
260	44.560896517430606	-123.2805386216655	2022-05-27 23:45:30.464171	BikeRack
261	44.55827490313995	-123.27935287474625	2022-05-27 23:51:49.606753	InterestPoint
262	44.559768817029415	-123.2762526003956	2022-05-27 23:56:14.857617	BikeRack
263	44.56001096644499	-123.27630061454187	2022-05-27 23:57:29.465963	VendingMachine
264	44.560169904896235	-123.27646102204983	2022-05-27 23:59:56.334341	BikeRack
265	44.561023579924345	-123.27709782805924	2022-05-28 00:02:01.381953	BikeRack
266	44.5627774600399	-123.27303851291131	2022-05-28 00:09:43.420358	BikeRack
267	44.56310015365521	-123.27296965690692	2022-05-28 00:10:16.515649	InterestPoint
268	44.563414417310646	-123.27284744895817	2022-05-28 00:12:02.800657	BikeRack
269	44.56394298029218	-123.2725737059194	2022-05-28 00:14:06.830693	BikeRack
\.


--
-- TOC entry 4358 (class 0 OID 3372803)
-- Dependencies: 214
-- Data for Name: PostalDropBox; Type: TABLE DATA; Schema: public; Owner: inihbbnrihxubh
--

COPY public."PostalDropBox" ("markerID", "collectionTime") FROM stdin;
181	3:00pm
222	3pm
256	Election time
\.


--
-- TOC entry 4359 (class 0 OID 3372806)
-- Dependencies: 215
-- Data for Name: Report; Type: TABLE DATA; Schema: public; Owner: inihbbnrihxubh
--

COPY public."Report" ("userID", "markerID", date) FROM stdin;
\.


--
-- TOC entry 4360 (class 0 OID 3372810)
-- Dependencies: 216
-- Data for Name: Restroom; Type: TABLE DATA; Schema: public; Owner: inihbbnrihxubh
--

COPY public."Restroom" ("markerID", "isFree", "hasChangingRoom", "isSingleUser", "hasSanitaryProducts", "isGenderInclusive") FROM stdin;
176	t	\N	f	\N	f
188	t	\N	f	t	t
196	t	\N	f	\N	f
198	t	\N	f	\N	\N
201	t	t	t	\N	t
202	t	\N	f	\N	f
207	t	f	f	f	f
209	t	\N	f	\N	f
215	t	t	f	\N	f
217	t	t	f	t	f
229	t	t	t	\N	t
237	t	\N	f	\N	f
243	t	f	f	f	f
244	t	f	t	f	t
247	t	f	f	t	f
249	t	f	f	t	f
\.


--
-- TOC entry 4361 (class 0 OID 3372813)
-- Dependencies: 217
-- Data for Name: Review; Type: TABLE DATA; Schema: public; Owner: inihbbnrihxubh
--

COPY public."Review" ("userID", "markerID", rating, description) FROM stdin;
98	244	4	Always locked!
103	248	3	\N
98	256	5	Not a mailbox, but a ballot drop box. Go democracy!
\.


--
-- TOC entry 4362 (class 0 OID 3372816)
-- Dependencies: 218
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: inihbbnrihxubh
--

COPY public."User" ("userID", username) FROM stdin;
101	\N
102	\N
103	\N
104	\N
98	Charlie
99	\N
100	\N
\.


--
-- TOC entry 4364 (class 0 OID 3372820)
-- Dependencies: 220
-- Data for Name: VendingMachine; Type: TABLE DATA; Schema: public; Owner: inihbbnrihxubh
--

COPY public."VendingMachine" ("markerID", "hasDrinks", "hasCandy", "hasFood", "acceptsCard", "acceptsCash") FROM stdin;
185	t	t	t	t	t
186	t	t	t	t	t
204	t	t	t	t	t
210	t	t	t	t	t
218	t	t	t	t	t
228	t	t	t	t	t
263	t	t	t	t	t
\.


--
-- TOC entry 4372 (class 0 OID 0)
-- Dependencies: 213
-- Name: Marker_markerID_seq; Type: SEQUENCE SET; Schema: public; Owner: inihbbnrihxubh
--

SELECT pg_catalog.setval('public."Marker_markerID_seq"', 269, true);


--
-- TOC entry 4373 (class 0 OID 0)
-- Dependencies: 219
-- Name: User_userID_seq; Type: SEQUENCE SET; Schema: public; Owner: inihbbnrihxubh
--

SELECT pg_catalog.setval('public."User_userID_seq"', 104, true);


--
-- TOC entry 4195 (class 2606 OID 3372824)
-- Name: BikeRack BikeRack_pkey; Type: CONSTRAINT; Schema: public; Owner: inihbbnrihxubh
--

ALTER TABLE ONLY public."BikeRack"
    ADD CONSTRAINT "BikeRack_pkey" PRIMARY KEY ("markerID");


--
-- TOC entry 4197 (class 2606 OID 3372826)
-- Name: DrinkingFountain DrinkingFountain_pkey; Type: CONSTRAINT; Schema: public; Owner: inihbbnrihxubh
--

ALTER TABLE ONLY public."DrinkingFountain"
    ADD CONSTRAINT "DrinkingFountain_pkey" PRIMARY KEY ("markerID");


--
-- TOC entry 4199 (class 2606 OID 3372828)
-- Name: InterestPoint InterestPoint_pkey; Type: CONSTRAINT; Schema: public; Owner: inihbbnrihxubh
--

ALTER TABLE ONLY public."InterestPoint"
    ADD CONSTRAINT "InterestPoint_pkey" PRIMARY KEY ("markerID");


--
-- TOC entry 4201 (class 2606 OID 3372830)
-- Name: Marker Marker_pkey; Type: CONSTRAINT; Schema: public; Owner: inihbbnrihxubh
--

ALTER TABLE ONLY public."Marker"
    ADD CONSTRAINT "Marker_pkey" PRIMARY KEY ("markerID");


--
-- TOC entry 4203 (class 2606 OID 3372832)
-- Name: PostalDropBox PostalDropBox_pkey; Type: CONSTRAINT; Schema: public; Owner: inihbbnrihxubh
--

ALTER TABLE ONLY public."PostalDropBox"
    ADD CONSTRAINT "PostalDropBox_pkey" PRIMARY KEY ("markerID");


--
-- TOC entry 4205 (class 2606 OID 3372834)
-- Name: Report Report_pkey; Type: CONSTRAINT; Schema: public; Owner: inihbbnrihxubh
--

ALTER TABLE ONLY public."Report"
    ADD CONSTRAINT "Report_pkey" PRIMARY KEY ("userID", "markerID");


--
-- TOC entry 4207 (class 2606 OID 3372836)
-- Name: Restroom Restroom_pkey; Type: CONSTRAINT; Schema: public; Owner: inihbbnrihxubh
--

ALTER TABLE ONLY public."Restroom"
    ADD CONSTRAINT "Restroom_pkey" PRIMARY KEY ("markerID");


--
-- TOC entry 4209 (class 2606 OID 3372838)
-- Name: Review Review_pkey; Type: CONSTRAINT; Schema: public; Owner: inihbbnrihxubh
--

ALTER TABLE ONLY public."Review"
    ADD CONSTRAINT "Review_pkey" PRIMARY KEY ("markerID", "userID");


--
-- TOC entry 4211 (class 2606 OID 3372840)
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: inihbbnrihxubh
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY ("userID");


--
-- TOC entry 4213 (class 2606 OID 3372842)
-- Name: VendingMachine VendingMachine_pkey; Type: CONSTRAINT; Schema: public; Owner: inihbbnrihxubh
--

ALTER TABLE ONLY public."VendingMachine"
    ADD CONSTRAINT "VendingMachine_pkey" PRIMARY KEY ("markerID");


--
-- TOC entry 4193 (class 2606 OID 3372843)
-- Name: Review ratingBound; Type: CHECK CONSTRAINT; Schema: public; Owner: inihbbnrihxubh
--

ALTER TABLE public."Review"
    ADD CONSTRAINT "ratingBound" CHECK (((rating >= 1) AND (rating <= 5))) NOT VALID;


--
-- TOC entry 4370 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: inihbbnrihxubh
--

REVOKE ALL ON SCHEMA public FROM postgres;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO inihbbnrihxubh;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- TOC entry 4371 (class 0 OID 0)
-- Dependencies: 866
-- Name: LANGUAGE plpgsql; Type: ACL; Schema: -; Owner: postgres
--

GRANT ALL ON LANGUAGE plpgsql TO inihbbnrihxubh;


-- Completed on 2022-05-27 17:38:25

--
-- PostgreSQL database dump complete
--

