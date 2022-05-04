import express from "express";
import { engine } from "express-handlebars";
import fs from "fs";
import pkg from "pg";
import format from "pg-format";
const { Client } = pkg;
import { execSync } from "child_process";

const dataDictionary = JSON.parse(fs.readFileSync("static/dictionary.json"));

/* 
CREDENTIALS FOR GOOGLE APIs (Maps)
*/
const credentialsPath = "./credentials.json";
let credentials = { mapsKey: process.env.GMAPSKEY };
if (!credentials.mapsKey && fs.existsSync(credentialsPath)) {
	credentials = JSON.parse(fs.readFileSync(credentialsPath));
}
if (!credentials.mapsKey) {
	throw "Maps key not found";
}

/* 
CONNECT TO PG DATABASE HOSTED BY HEROKU

Notes:
get it with heroku config:get DATABASE_URL --app osuminimap
I think process.env.DATABASE_URL autopopulated with it on heroku side
*/
function getDatabaseURL() {
	return execSync("heroku config:get DATABASE_URL --app osuminimap").toString().trim();
}

const databaseURL = process.env.DATABASE_URL || getDatabaseURL();
console.log("Database URL found:", databaseURL);

const client = new Client({
	connectionString: databaseURL,
	ssl: {
		rejectUnauthorized: false,
	},
});
client.connect();

/* 
DATABASE UTILITIES
*/

function logQuery(query) {
	console.log("\tSQL:", query);
	return query;
}

/* meant for user error messages, not for library tracebacks */
function logError(err) {
	console.log("\tERROR:", err);
	return err;
}

function makeQuery(template, args) {
	return logQuery(format.withArray(template, args));
}

function isValidCategory(category) {
	const validCategories = [
		"Restroom",
		"InterestPoint",
		"VendingMachine",
		"PostalDropBox",
		"DrinkingFountain",
		"BikeRack",
	];
	return validCategories.includes(category);
}

/*
EXPRESS SETUP
*/

const port = process.env.PORT || 3000;

const app = express();

app.engine("handlebars", engine({ defaultLayout: "main" }));
app.set("view engine", "handlebars");
app.set("views", "./views");

app.use(express.json());
app.use(express.static("./static"));

app.get("/", (req, res) => {
	res.status(200).render("map-page", { apiKey: credentials.mapsKey });
});

/*
ENUMERATE MARKERS

Spec:
const markers = [{ category: "VendingMachine", pos: { lat: 2, lng: 2 }, id: 3, datetime: 2022-04-29 11:57 }];
*/

function parseMarker(row) {
	return {
		category: row.type,
		pos: { lat: row.latitude, lng: row.longitude },
		id: row.markerID,
		datetime: row.date,
	};
}

app.get("/markers", async (req, res) => {
	console.log("INFO: /markers request");
	const dbResult = await client.query(logQuery('SELECT * FROM "Marker"')).catch((e) => {
		console.log(e);
		res.status(500).send("something went wrong");
	});
	const rows = dbResult.rows.map(parseMarker);
	res.status(200).json(rows);
});

/*
GET MARKER INFORMATION

Spec:
function get_info(id_num) {
	return {
		category: "Vending Machine",
		attributes: [
			{name: "Accepts cash", type: "Bool", value: undefined }
		]
		reviews: [
			{username: name, userID: int, description: string, rating: int}
		]
	}
}
*/
const markerTypeVerbose = {
	BikeRack: "Bike Rack",
	Restroom: "Restroom",
	PostalDropBox: "Postal Drop Box",
	DrinkingFountain: "Drinking Fountain",
	VendingMachine: "Vending Machine",
	InterestPoint: "Point of Interest",
};

function parseMarkerInfo(category, infoRow, reviewRows) {
	const attributes = JSON.parse(JSON.stringify(dataDictionary[category])); // deep copy
	for (const attr of attributes) {
		attr.value = infoRow[attr.columnName];
	}

	return { category: markerTypeVerbose[category], attributes: attributes, reviews: reviewRows };
}

app.get("/markerInfo/:id", async (req, res) => {
	console.log(`INFO: /markerInfo/${req.params.id} request`);
	let infoResult = undefined;
	let reviewResult = undefined;
	let category = undefined;

	try {
		const categoryResult = await client.query(
			makeQuery('SELECT type FROM public."Marker" WHERE "markerID" = %L', [req.params.id])
		);

		if (categoryResult.rows.length !== 1) {
			logError(res1.rows.length + " rows returned, 1 expected");
			res.status(500).send("something went wrong");
			return;
		}

		category = categoryResult.rows[0].type;

		infoResult = await client.query(
			makeQuery(`SELECT * FROM public.%I WHERE "markerID" = %L`, [category, req.params.id])
		);

		if (infoResult.rows.length > 1) {
			logError(infoResult.rows.length + " rows returned, 1 expected");
			res.status(500).send("something went wrong");
			return;
		}

		reviewResult = await client.query(makeQuery(
			'SELECT "Review"."userID", "Review"."markerID", "Review".rating, "Review".description, "User".username FROM "Review" INNER JOIN "User" ON "Review"."userID" = "User"."userID" WHERE "Review"."markerID" = %L',
			[req.params.id])
		);
	} catch (e) {
		console.log(e);
		res.status(500).send("something went wrong");
		return;
	}

	res.status(200).json(parseMarkerInfo(category, infoResult.rows[0], reviewResult.rows));
});

/*
POST MARKERS TO DATABASE

Spec:
let data = {category: "VendingMachine", pos: {lat: 2, lng: 3}, attributes: [
	{name: "Accepts cash", type: "Bool", value: undefined, columnName: "acceptsCash" }
]}
function post_marker(data) {
	// post to database
	// use current datetime as "time", using LOCALTIMESTAMP
	let id = 0;
	return id;
}
*/

function buildInfoRepr(data) {
	const infoRepr = {};
	for (const attr of data.attributes) {
		infoRepr[attr.columnName] = attr.value === "" ? null : attr.value;
	}
	return infoRepr;
}

function buildMarkerRepr(data) {
	const markerRepr = {
		latitude: data.pos.lat,
		longitude: data.pos.lng,
	};
	return markerRepr;
}

//TODO FIXME - if it fails to insert into info table, but is in Marker table, that's bad
// In that case the placed Marker should be deleted
app.post("/postMarker", async (req, res) => {
	console.log("INFO: /postMarker request");
	const markerRepr = buildMarkerRepr(req.body);
	const markerCategory = req.body.category;
	const infoRepr = buildInfoRepr(req.body);

	if (!isValidCategory(markerCategory)) {
		res.status(500).send("invalid category: " + markerCategory);
		return;
	}

	try {
		await client.query(
			makeQuery(`INSERT INTO public."Marker" (%I,type) VALUES (%L,'${markerCategory}')`, [
				Object.keys(markerRepr),
				Object.values(markerRepr),
			])
		);
	} catch (e) {
		console.log(e);
		res.status(500).send("something went wrong");
		return;
	}

	try {
		const lastvalResult = await client.query(logQuery("SELECT lastval()"));
		infoRepr.markerID = lastvalResult.rows[0].lastval;
	} catch (e) {
		console.log(e);
		res.status(500).send("something went wrong");
		return;
	}

	try {
		await client.query(
			makeQuery("INSERT INTO public.%I (%I) VALUES (%L)", [
				markerCategory,
				Object.keys(infoRepr),
				Object.values(infoRepr),
			])
		);
	} catch (e) {
		console.log(e);
		res.status(500).send("something went wrong");
		return;
	}

	res.status(200).json({ id: infoRepr.markerID });
});

/*
EDIT INFORMATION COLUMNS OF EXISTING MARKERS

marker data needs to have an `id` key, and an attribute list
[{*columnName*, name, *value*, type}]

Order of operations:
check that the id exists on the marker data
check that the id exists in the Marker table
	SELECT 1 from public."Marker" where "markerID" = 70
check that the id exists in the {category} table [optional?]
update the data
	Different than INSERTing, needs to be UPDATEd
*/

// outputs in a format like "columnname = value, columnname = value"
function buildUpdateStr(infoRepr) {
	const keyValueArr = [];
	for (const attr of Object.keys(infoRepr)) {
		keyValueArr.push(attr);
		keyValueArr.push(infoRepr[attr]);
	}

	const fmtArr = [];
	for (let i = 0; i < Object.keys(infoRepr).length; i++) {
		fmtArr.push("%I = %L");
	}
	const fmt = fmtArr.join(", ");

	return format.withArray(fmt, keyValueArr);
}

app.post("/editMarker", (req, res) => {
	console.log("INFO: /editMarker request");
	const data = req.body;

	if (!data.id) {
		res.status(500).send(logError("No id given to edit"));
		return;
	}
	if (!data.category) {
		res.status(500).send(logError("No category given on marker data"));
		return;
	}
	if (!isValidCategory(data.category)) {
		res.status(500).send(logError("invalid category: " + data.category));
		return;
	}

	const infoRepr = buildInfoRepr(data);

	client
		.query(makeQuery('SELECT "markerID" from public."Marker" WHERE "markerID" = %L', [data.id]))
		.then((check_res) => {
			if (check_res.rows.length != 1) {
				logError(`markerID either not present or duplicated: returned ${check_res.rows.length} rows`);
				res.status(500).send("something went wrong");
			}
			client
				.query(
					makeQuery(
						`UPDATE public."${data.category}" SET ${buildUpdateStr(
							infoRepr
						)} WHERE "markerID" = %L`,
						[data.id]
					)
				)
				.then((insert_res) => {
					res.status(200).send("Edited");
				})
				.catch((e) => {
					console.log(e);
					res.status(500).send("something went wrong");
				});
		})
		.catch((e) => {
			console.log(e);
			res.status(500).send("something went wrong");
		});
});

/*
ADD REVIEW

request body has the following attributes:
userID : int : mandatory
markerID : int : mandatory
username : string : optional
rating : int : mandatory
description : string : optional

Order of operations:
Check inclusion and types

Check if userID is already in User table
If yes: update with new username / lack of username
If no: insert username with username / lack of username
Insert into Review the review data

Note:
Since the review primary key is userID and markerID, it is not possible for one user
to review the same place twice. This will be handled by the database integrity constraint
on the database's side, I don't think we need explicit handling of that on this end.
*/

app.post("/postReview", async (req, res) => {
	console.log("INFO: /postReview request");
	const data = req.body;

	/* checking truthiness seems bad here because userID could technically
	   be 0, so instead checks for null / undefined */
	if (data.userID === undefined || data.userID === null) {
		res.status(500).send(logError("request missing userID"));
		return;
	}
	if (data.markerID === undefined || data.markerID === null) {
		res.status(500).send(logError("request missing markerID"));
		return;
	}
	if (data.rating === undefined || data.rating === null) {
		res.status(500).send(logError("request missing rating"));
		return;
	}

	if (typeof data.userID != "number") {
		res.status(500).send(logError("request userID must be a number"));
		return;
	}
	if (typeof data.markerID != "number") {
		res.status(500).send(logError("request markerID must be a number"));
		return;
	}
	if (data.username && typeof data.username != "string") {
		res.status(500).send(logError("request username must be a number"));
		return;
	}
	if (typeof data.rating != "number") {
		res.status(500).send(logError("request rating must be a number"));
		return;
	}
	if (data.description && typeof data.description != "string") {
		res.status(500).send(logError("request description must be a string"));
		return;
	}

	/* formatting tools can handle JS null, but not empty strings or undefined */
	if (data.username === "" || data.username === undefined) {
		data.username = null;
	}
	if (data.description === "" || data.username === undefined) {
		data.description = null;
	}

	try {
		let checkResult = await client.query(
			makeQuery('SELECT * FROM public."User" WHERE "userID" = %L', [data.userID])
		);
		let inTable = checkResult.rows.length == 1;

		if (inTable) {
			await client.query(makeQuery('UPDATE public."User" SET username = %L', [data.username]));
		} else {
			await client.query(
				makeQuery('INSERT INTO public."User" ("userID", username) VALUES (%L)', [
					[data.userID, data.username],
				])
			);
		}

		await client.query(
			makeQuery('INSERT INTO public."Review" ("userID", "markerID", rating, description) VALUES (%L)', [
				[data.userID, data.markerID, data.rating, data.description],
			])
		);
	} catch (e) {
		console.log(e);
		res.status(500).send("something went wrong");
		return;
	}

	res.status(200).send("Ok");
});

/*
GET USERNAME FROM USERID

if USERID isn't in database, return null
if USERNAME is NULL, return null
otherwise, return USERNAME
*/

app.get("/getUsername/:id", async (req, res) => {
	console.log(`INFO: /getUsername/${req.params.id} request`);

	try {
		let userResult = await client.query(
			makeQuery('SELECT username from public."User" WHERE "userID" = %L', [req.params.id])
		);

		if (userResult.rows.length === 0) {
			res.status(200).json({ username: null });
			return;
		}

		res.status(200).json({ username: userResult.rows[0].username });
		return;
	} catch (e) {
		console.log(e);
		res.status(500).send("something went wrong");
		return;
	}
});

app.listen(port, () => {
	console.log("Server is listening on port " + port);
});
