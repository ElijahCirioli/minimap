import express from "express";
import { engine } from "express-handlebars";

const credentials = require("credentials.json");
const port = process.env.PORT || 3000;

const app = express();

app.engine("handlebars", engine({ defaultLayout: "main" }));
app.set("view engine", "handlebars");
app.set("views", "./views");

app.use(express.json());
app.use(express.static("./static"));

app.get("/", (req, res) => {
	res.status(200).render("map-page");
});

app.listen(port, () => {
	console.log("Server is listening on port " + port);
});
