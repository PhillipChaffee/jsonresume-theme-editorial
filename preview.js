// Writes preview/index.html from a resume.json: node preview.js [resume.json]
const fs = require("fs");
const path = require("path");
const { render } = require("./index.js");

const source = process.argv[2] || "resume.json";
const resume = JSON.parse(fs.readFileSync(source, "utf-8"));
fs.mkdirSync("preview", { recursive: true });
fs.writeFileSync(path.join("preview", "index.html"), render(resume));
console.log("Wrote preview/index.html from " + source);
