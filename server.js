import express from "express";
import { engine } from "express-handlebars";
import fs from "fs";
import pkg from "pg";
const { Client } = pkg;
import { execSync } from "child_process";
import { isStringObject } from "util/types";

const dataDictionary = JSON.parse(fs.readFileSync("static/dictionary.json"));

/* CREDENTIALS FOR GOOGLE APIs (Maps)
 */
const credentialsPath = "./credentials.json";
let credentials = { mapsKey: process.env.GMAPSKEY };
if (!credentials.mapsKey && fs.existsSync(credentialsPath)) {
	credentials = JSON.parse(fs.readFileSync(credentialsPath));
}
if (!credentials.mapsKey) {
	throw "Maps key not found";
}

/* CONNECT TO PG DATABASE HOSTED BY HEROKU

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

/* EXPRESS SETUP
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

function parseMarker(row) {
	return {
		category: row.type,
		pos: { lat: row.latitude, lng: row.longitude },
		id: row.markerID,
		datetime: row.date,
	};
}

app.get("/markers", async (req, res) => {
	const dbResult = await client.query('SELECT * FROM "Marker"').catch((e) => {
		console.log(e);
		res.status(500).send("bad request");
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

function parseMarkerInfo(type, rows) {
	if (rows.length > 1) {
		console.log("WARNING: a markerInfo query received multiple rows-- it shouldn't have");
	}
	const attributes = JSON.parse(JSON.stringify(dataDictionary[type])); // deep copy
	for (const attr of attributes) {
		attr.value = rows[0][attr.columnName];
	}
	return { category: markerTypeVerbose[type], attributes: attributes };
}

app.get("/markerInfo/:id", (req, res) => {
	client
		.query('SELECT type FROM public."Marker" WHERE "Marker"."markerID" = $1;', [req.params.id])
		.then((res1) => {
			if (res1.rows.length !== 1) {
				console.log(res1.rows.length + " rows returned, 1 expected");
				res.status(500).send("bad request");
				return;
			}

			const type = res1.rows[0].type;
			client
				.query(`SELECT * FROM public."${type}" WHERE "${type}"."markerID" = $1;`, [req.params.id])
				.then((res2) => {
					res.status(200).json(parseMarkerInfo(type, res2.rows));
				})
				.catch((e) => {
					console.log(e);
					res.status(500).send("bad request");
				});
		})
		.catch((e) => {
			console.log(e);
			res.status(500).send("bad request");
		});
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

/* Turns columnName into "columnName", which is much preferable to PostgreSQL */
function quotify(str) {
	return `"${str}"`;
}

function buildInfoRepr(data) {
	const infoRepr = {};
	for (const attr of data.attributes) {
		const key = quotify(attr.columnName);
		if (attr.value === null || attr.value === "") {
			infoRepr[key] = "NULL";
		} else if (attr.type === "ShortString" || attr.type === "LongString") {
			infoRepr[key] = `'${attr.value}'`;
		} else {
			infoRepr[key] = attr.value;
		}
	}
	return infoRepr;
}

/* takes internal representations and converts to something more similar to
   database format */
function parseData(data) {
	const markerRepr = {
		latitude: data.pos.lat,
		longitude: data.pos.lng,
		category: data.category,
	};
	return [markerRepr, buildInfoRepr(data)];
}

function parseInfoRepr(infoRepr) {
	const columnStr = "(" + Object.keys(infoRepr).join(", ") + ")";
	const dataStr = "(" + Object.values(infoRepr).join(", ") + ")";
	return [columnStr, dataStr];
}

//TODO FIXME - if it fails to insert into info table, but is in Marker table, that's bad
// In that case the placed Marker should be deleted
app.post("/postMarker", (req, res) => {
	const [markerRepr, infoRepr] = parseData(req.body);

	if (!isValidCategory(markerRepr.category)) {
		res.status(500).send("invalid category: " + markerRepr.category);
		return;
	}

	client
		.query(
			`INSERT INTO public."Marker" (latitude, longitude, type, date) VALUES ($1, $2, '${markerRepr.category}', LOCALTIMESTAMP);`,
			[markerRepr.latitude, markerRepr.longitude]
		)
		.then((markerRes) => {
			client
				.query("SELECT lastval()")
				.then((lastvalRes) => {
					const receivedID = lastvalRes.rows[0].lastval;
					infoRepr[quotify("markerID")] = receivedID;
					const [columnStr, dataStr] = parseInfoRepr(infoRepr);
					client
						.query(`INSERT INTO public."${markerRepr.category}" ${columnStr} VALUES ${dataStr};`)
						.then((infoRes) => {
							res.status(200).json({ id: receivedID });
						})
						.catch((e) => {
							console.log(e);
							res.status(500).send("bad request");
						});
				})
				.catch((e) => {
					console.log(e);
					res.status(500).send("bad request");
				});
		})
		.catch((e) => {
			console.log(e);
			res.status(500).send("bad request");
		});
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

function buildUpdateStr(infoRepr) {
	"columnname = value, columnname = value";
	const columnStrings = [];
	for (const attr of Object.keys(infoRepr)) {
		columnStrings.push(`"${attr}" = "${infoRepr[attr].toString()}"`);
	}
	return columnStrings.join(", ");
}

app.post("/editMarker", (req, res) => {
	const data = req.body;
	if (!data.id) {
		console.log("No id given to edit");
		res.status(500).send("bad request");
	}
	if (!data.category) {
		console.log("No category given on marker data");
		res.status(500).send("bad request");
	}

	if (!isValidCategory(data.category)) {
		res.status(500).send("invalid category: " + data.category);
		return;
	}

	const infoRepr = buildInfoRepr(data);
	const [columnStr, dataStr] = parseInfoRepr(infoRepr);

	client
		.query('SELECT "markerID" from public."Marker" WHERE "markerID" = $1', [data.id])
		.then((check_res) => {
			if (check_res.rows.length != 1) {
				console.log(
					`markerID either not present or duplicated: returned ${check_res.rows.length} rows`
				);
				res.status(500).send("bad request");
			}
			client
				.query(
					`UPDATE public."${data.category}" SET ${buildUpdateStr(infoRepr)} WHERE "markerID" = $1`,
					[data.id]
				)
				.then((insert_res) => {
					res.status(200).send("Edited");
				})
				.catch((e) => {
					console.log(e);
					res.status(500).send("bad request");
				});
		})
		.catch((e) => {
			console.log(e);
			res.status(500).send("bad request");
		});
});

app.listen(port, () => {
	console.log("Server is listening on port " + port);
});
