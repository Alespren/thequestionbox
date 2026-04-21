import express from "express";
import { manualConfig } from "./manual-config.js";
import { getRuleImage } from "./rule-image.js";

const app = express();
const port = 3000;

const manualAssetsBaseUrl = `http://localhost:${port}/`;

app.get("/", (req, res) => {
  res.send("Hello world");
});

app.use(manualConfig.assetsRoute, express.static(manualConfig.assetsDir));

app.get("/rule/:ruleNum", async (req, res, next) => {
  if (!isValidRule(req.params.ruleNum)) {
    next("route");
    return;
  }

  res.type("png");
  res.send(
    await getRuleImage(req.params.ruleNum, {
      manualPath: manualConfig.path,
      baseHref: manualAssetsBaseUrl,
    }),
  );
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
