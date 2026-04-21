import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { parse } from "node-html-parser";
import wkhtmltoimage from "wkhtmltoimage";

const app = express();
const port = 3000;

const manualPath = "./DECODE_Competition_Manual_TU30.htm";
const manualAssetsDir = path.resolve("./DECODE_Competition_Manual_TU30_files");
const manualAssetsBaseUrl = `http://localhost:${port}/`;

app.get("/", (req, res) => {
  res.send("Hello world");
});

app.use(
  "/DECODE_Competition_Manual_TU30_files",
  express.static(manualAssetsDir),
);

app.get("/rule/:ruleNum", async (req, res, next) => {
  if (!isValidRule(req.params.ruleNum)) {
    next("route");
    return;
  }

  res.type("png");
  res.send(await getRuleImage(req.params.ruleNum));
});

app.use((req, res, next) => {
  res.status(404).send("");
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

function isValidRule(ruleNum) {
  return true;
}

async function getRuleImage(ruleNum) {
  // Parse HTML
  const file = await fs.readFile(manualPath);
  const root = parse(file);

  const rule = root.querySelector(`a[name=${ruleNum}]`);

  let next = rule.parentNode;
  const nodes = [next];
  next = next.nextElementSibling;

  while (
    next != null &&
    !(
      next.classNames.includes("RuleNumber") ||
      next.classNames.includes("TRules")
    )
  ) {
    nodes.push(next);
    next = next.nextElementSibling;
  }

  const baseHref = manualAssetsBaseUrl;

  const styleTags = root.querySelectorAll("style");
  const styleHtml = styleTags.map((tag) => tag.toString()).join("");
  const bodyHtml = nodes.map((node) => node.toString()).join("");
  const stringRepresentation = `<!doctype html><html><head><base href="${baseHref}">${styleHtml}</head><body>${bodyHtml}</body></html>`;

  const stream = wkhtmltoimage.generate(stringRepresentation);

  return await new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}
