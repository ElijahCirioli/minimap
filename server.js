import express from "express";
import { engine } from "express-handlebars";
import fs from "fs";
import pkg from "pg";
const { Client } = pkg;
import { execSync } from "child_process";

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
function parseMarker(row) {
	return {
		category: row.type,
		pos: { lat: row.latitude, lng: row.longitude },
		id: row.markerID,
		datetime: row.date,
	};
}

app.get("/markers", (req, res) => {
	client
		.query('SELECT * FROM "Marker"')
		.then((dbResult) => {
			const rows = dbResult.rows.map(parseMarker);
			res.status(200).json(rows);
		})
		.catch((e) => {
			console.log(e);
			res.status(500).send("bad request");
		});
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
	return `"${str}"`
}

/* takes internal representations and converts to something more similar to
   database format */
function parseData(data) {
	let markerRepr = {latitude: data.pos.lng, longitude: data.pos.lat, category: data.category}
	let infoRepr = {}
	for (const attr of data.attributes) {
		infoRepr[quotify(attr.columnName)] = attr.value
	}
	return [markerRepr, infoRepr]
}

function parseInfoRepr(infoRepr) {
	let columnStr = "(" + Object.keys(infoRepr).join(", ") + ")"
	let dataStr = "(" + Object.values(infoRepr).join(", ") + ")"
	return [columnStr, dataStr]
}

//TODO FIXME - if it fails to insert into info table, but is in Marker table, that's bad
// In that case the placed Marker should be deleted
app.post("/postMarker", (req, res) => {
	const [markerRepr, infoRepr] = parseData(req.body)
	client
		.query(`INSERT INTO public."Marker" (latitude, longitude, type, date) VALUES ($1, $2, \'${markerRepr.category}\', LOCALTIMESTAMP);`, 
				[markerRepr.latitude, markerRepr.longitude])
		.then((marker_res) => {
			client
				.query('SELECT lastval()')
				.then((lastval_res) => {
					const receivedID = lastval_res.rows[0].lastval
					infoRepr[quotify("markerID")] = receivedID
					const [columnStr, dataStr] = parseInfoRepr(infoRepr)
					console.log(`INSERT INTO public."${markerRepr.category}" ${columnStr} VALUES ${dataStr};`)
					client
						.query(`INSERT INTO public."${markerRepr.category}" ${columnStr} VALUES ${dataStr};`)
						.then(info_res => {res.status(200).json({id: receivedID})})
						.catch((e) => {
							console.log(e);
							res.status(500).send("bad request");
						})
				})
				.catch((e) => {
					console.log(e);
					res.status(500).send("bad request");
				})
		})
		.catch((e) => {
			console.log(e);
			res.status(500).send("bad request");
		})
});

app.listen(port, () => {
	console.log("Server is listening on port " + port);
});
