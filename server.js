import express from "express";
import { engine } from "express-handlebars";
import fs from "fs";

const port = process.env.PORT || 3000;
const app = express();

app.engine("handlebars", engine({ defaultLayout: "main" }));
app.set("view engine", "handlebars");
app.set("views", "./views");

app.use(express.json());
app.use(express.static("public"));

app.listen(port, () => {
	console.log("Server is listening on port " + port);
});
