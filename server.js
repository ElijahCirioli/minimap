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
const markers = [{ type: "VendingMachine", pos: { lat: 2, lng: 2 }, id: 3 }];
*/
function parseMarker(row) {
	return {
		type: row.type,
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
let data = {type: "VendingMachine", pos: {lat: 2, lng: 3}, attributes: [
	{name: "Accepts cash", type: "Bool", value: undefined }
]}
function post_marker(data) {
	// post to database
	let id = 0;
	return id;
}
*/

app.listen(port, () => {
	console.log("Server is listening on port " + port);
});
