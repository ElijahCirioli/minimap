import express from "express";
import { engine } from "express-handlebars";
import fs from "fs";

const credentials_path = "./credentials.json";
let credentials = {
	mapsKey: process.env.GMAPSKEY,
};
if (fs.existsSync(credentials_path)) {
	credentials = JSON.parse(fs.readFileSync(credentials_path));
}
if (!credentials.mapsKey) {
	throw "Maps key not found";
}

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

app.get("/markers", (req, res) => {});

app.listen(port, () => {
	console.log("Server is listening on port " + port);
});
