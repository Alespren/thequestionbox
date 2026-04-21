import fs from "node:fs/promises";
import { parse } from "node-html-parser";
import wkhtmltoimage from "wkhtmltoimage";

export async function getRuleImage(ruleNum, { manualPath, baseHref }) {
  const root = await loadManualRoot(manualPath);
  const rule = findRuleAnchor(root, ruleNum);
  const bodyHtml = buildRuleBodyHtml(rule);
  const styleHtml = getStyleHtml(root);
  const html = wrapHtml({ baseHref, styleHtml, bodyHtml });

  const stream = wkhtmltoimage.generate(html);
  return streamToBuffer(stream);
}

async function loadManualRoot(manualPath) {
  const file = await fs.readFile(manualPath);
  return parse(file);
}

function findRuleAnchor(root, ruleNum) {
  const rule = root.querySelector(`a[name=${ruleNum}]`);
  if (!rule) {
    throw new Error(`Rule not found: ${ruleNum}`);
  }
  return rule;
}

function buildRuleBodyHtml(rule) {
  let next = rule.parentNode;
  const nodes = [next];
  next = next.nextElementSibling;

  while (next != null && !isRuleBoundary(next)) {
    nodes.push(next);
    next = next.nextElementSibling;
  }

  if (nodes.length === 0) {
    throw new Error("No rule content found.");
  }

  return nodes.map((node) => node.toString()).join("");
}

function isRuleBoundary(node) {
  const classNames = node.classNames ?? [];
  return classNames.includes("RuleNumber") || classNames.includes("TRules");
}

function getStyleHtml(root) {
  const styleTags = root.querySelectorAll("style");
  return styleTags.map((tag) => tag.toString()).join("");
}

function wrapHtml({ baseHref, styleHtml, bodyHtml }) {
  return `<!doctype html><html><head><base href="${baseHref}">${styleHtml}</head><body>${bodyHtml}</body></html>`;
}

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}
