import express from 'express';
import fs from 'node:fs/promises'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'

const app = express()
const port = 3000;

import ruleFile from './rulesv4.json' with { type: 'json' }
const manualPath = './DECODE_Competition_Manual_TU27.pdf'

const { rules, version } = ruleFile

app.get('/', (req, res) => {
  res.send('Hello world')
})

app.get('/rule/:ruleNum', async (req, res, next) => {
  if (!isValidRule(req.params.ruleNum))
    next('route')

  res.type('png')
  res.send(await getRuleImage(req.params.ruleNum))
})

app.use((req, res, next) => {
  res.status(404).send("Sorry, can't find that!")
})

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`)
})

function isValidRule(ruleNum) {
  return rules[ruleNum] != undefined
}

async function getRuleImage(ruleNum) {
  const rule = rules[ruleNum]
  const nextRule = rules[Object.keys(rules)[Object.keys(rules).indexOf(ruleNum) + 1]]

  const scale = 2

  const startPageNum = parseInt(rule.range.start_page)
  const endPageNum = parseInt(rule.range.end_page)

  const document = await pdfjs.getDocument(manualPath).promise

  const page = await document.getPage(startPageNum)
  const viewport = page.getViewport({ scale })
  
  const startY = parseFloat(rule.start.y_center) - 15

  // if this rule ends on the same page as the next rule, use the start position of the next rule.
  // If the next rule starts on a different page, just set the endY to the end of the page (0)
  const endY = (endPageNum != parseInt(nextRule.range.start_page)) ? 0 : parseFloat(nextRule.start.y_center)

  // TODO remove hardcoded values
  viewport.transform = [ 2, 0, 0, -2, 0, 1584 - startY * scale]
  viewport.height = (endY * scale) - (startY * scale);

  const canvas = createCanvas(viewport.width, viewport.height)
  const ctx = canvas.getContext('2d')
  // ctx.translate(0, -endY)

  // TODO Handle multiple pages. Either every page is put onto
  // one canvas, or they have their own canvases and are then
  // combined into one.

  await page.render({ canvasContext: ctx, viewport }).promise
  return canvas.toBuffer("image/png")
}
