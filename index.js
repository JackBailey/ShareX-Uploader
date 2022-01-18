const express = require("express");
const bodyParser = require("body-parser");

let formidable = require("express-formidable");
let path = require("path");
let uuid4 = require("uuid4");
let fs = require("fs");

require("dotenv").config();
const app = express();

app.set("view engine", "ejs");

// init files

if (!fs.existsSync("./uploads")) {
	fs.mkdirSync("./uploads");
}
if (!fs.existsSync("./tmp")) {
	fs.mkdirSync("./tmp");
}

if (!fs.existsSync("./config.json")) {
	var Config = {
		domain: "http://localhost:8080",
		port: 8080,
		files: {
			maxSize: 100,
			chars: ["LOWERCASE", "UPPERCASE", "NUMBERS"],
			length: 5,
		},
		urls: {
			length: 6,
		},
		index: {
			title: "My Host",
			color: "#662aac",
			embed: false,
		},
	};
	fs.writeFileSync("./config.json", JSON.stringify(Config, null, 4));
}

if (!fs.existsSync("./data.json")) {
	var data = {};
	fs.writeFileSync("./data.json", JSON.stringify(data, null, 4));
}

if (!fs.existsSync("./.env")) {
	console.log("Created .env - please change this key!");
	fs.writeFileSync("./.env", "KEY=password123");
}

let config = require("./config.json");

function generateString(length) {
	var data = require("./data.json");
	var exists = true;
	while (exists) {
		var lowercase = config.files.chars.includes("LOWERCASE") ? "abcdefghijklmnopqrstuvwxyz" : "";
		var uppercase = config.files.chars.includes("UPPERCASE") ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ" : "";
		var numbers = config.files.chars.includes("NUMBERS") ? "0123456789" : "";
		var characters = lowercase + uppercase + numbers;
		var result = "";
		for (var i = 0; i < length; i++) {
			result += characters.charAt(Math.floor(Math.random() * characters.length));
		}
		exists = data.hasOwnProperty(result);
	}
	return result;
}

function niceBytes(x) {
	const units = ["bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
	let l = 0,
		n = parseInt(x, 10) || 0;
	while (n >= 1024 && ++l) {
		n = n / 1024;
	}
	return n.toFixed(n < 10 && l > 0 ? 1 : 0) + " " + units[l];
}

function getUploadSize() {
	var size = 0;
	fs.readdirSync(path.join(__dirname, "uploads")).forEach((file) => {
		size += fs.statSync(path.join(__dirname, "uploads", file)).size;
	});

	return niceBytes(size);
}

app.use(
	formidable({
		encoding: "utf-8",
		uploadDir: path.join(__dirname, "tmp"),
		multiples: true,
		keepExtensions: true,
		maxFieldsSize: config.files.maxSize * 1024 * 1024,
	})
);

app.get("/", (req, res) => {
	var locals = {
		size: getUploadSize(),
		title: config.index.title,
	};

	res.render("pages/index.ejs", locals);
});

app.get("/config/:key", (req, res) => {
	if (req?.params?.key != process.env.KEY) return res.status(400).json({ msg: "Invalid Key" });
	const { hostname } = new URL(config.domain);
	var file = {
		Version: "13.1.0",
		Name: config.index.title,
		DestinationType: "ImageUploader, URLShortener",
		RequestMethod: "POST",
		RequestURL: config.domain,
		Body: "MultipartFormData",
		Arguments: {
			url: "$input$",
			key: req.params.key,
		},
		FileFormName: "sharex",
	};
	fs.writeFileSync(path.join(__dirname, "sharex.sxcu"), JSON.stringify(file, null, 2));
	res.download(path.join(__dirname, "sharex.sxcu"), hostname + ".sxcu");
});

app.get("/image/:id", (req, res) => {
	var data = require("./data.json");
	var id = req.params.id.split(".")[0];
	if (!data.hasOwnProperty(id)) return res.status(404).send("File not found");
	var entry = data[id];
	if (entry.type == "file") {
		return res.sendFile(__dirname + "/uploads/" + data[id].filename);
	}

	if (entry.type == "url") return res.redirect(307, data[id].url);
});

app.get("/:id", (req, res) => {
	var data = require("./data.json");
	var id = req.params.id.split(".")[0];
	if (!data.hasOwnProperty(id)) return res.status(404).send("File not found");
	var entry = data[id];
	var size = fs.statSync(path.join(__dirname, "uploads", entry.filename)).size;
	if (entry.type == "file") {
		if (config.index.embed)
			return res.render("pages/embed.ejs", {
				title: config.index.title,
				size: niceBytes(size),
				color: config.index.color,
				url: config.domain + "/image/" + id,
				id,
			});
		return res.sendFile(__dirname + "/uploads/" + data[id].filename);
	}

	if (entry.type == "url") return res.redirect(307, data[id].url);
});

app.post("/", (req, res) => {
	if (req.fields.url != "") {
		if (req?.fields?.key != process.env.KEY) return res.status(400).json({ msg: "Invalid Key" });

		var entry = {
			type: "url",
			url: req.fields.url,
		};

		var id = generateString(config.urls.length);

		var data = require("./data.json");
		data[id] = entry;
		fs.writeFileSync("./data.json", JSON.stringify(data, null, 2));

		res.status(200).send(config.domain + "/" + id);
	} else if (req.files.sharex) {
		if (!req?.files?.sharex) return res.status(400).json({ msg: "No files were uploaded" });
		if (req?.fields?.key != process.env.KEY) return res.status(400).json({ msg: "Invalid Key" });
		let file = req.files.sharex;
		if (file.size > config.files.maxSize * 1024 * 1024) {
			fs.unlinkSync(file.path);
			return res.status(400).json({ msg: "File is too large" });
		}

		var extension = file.name.split(".").pop();

		var entry = {
			type: "file",
			filename: uuid4() + "." + extension,
		};

		var id = generateString(config.files.length);

		fs.renameSync(file.path, path.join(__dirname, "uploads", entry.filename));

		var data = require("./data.json");
		data[id] = entry;
		fs.writeFileSync("./data.json", JSON.stringify(data, null, 2));

		res.status(200).send(config.domain + "/" + id);
	} else {
		res.status(404).send("URL not found");
	}
});

app.listen(config.port, () => {
	console.log("Server is running on port " + config.port);
	var data = require("./data.json");
	var key = encodeURI(process.env.KEY);
	if (Object.keys(data) == 0) console.log(`No images/urls uploaded yet - the config is at ${config.domain}/config/${key}`);
	fs.readdirSync(path.join(__dirname, "tmp")).forEach((file) => {
		fs.unlinkSync(path.join(__dirname, "tmp", file));
	});
});
