import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const [,, inputSvg, outputPng] = process.argv;
if (!inputSvg || !outputPng) {
  console.error("Usage: node scripts/render-svg-to-png.mjs <input.svg> <output.png>");
  process.exit(2);
}

const inputPath = path.resolve(__dirname, "..", inputSvg);
const outputPath = path.resolve(__dirname, "..", outputPng);

const svg = fs.readFileSync(inputPath, "utf8");
const resourcesDir = path.dirname(inputPath);

const mimeForPath = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
};

const embedLocalImages = (svgText) =>
  svgText.replaceAll(/\shref="([^"]+)"/g, (match, hrefValue) => {
    if (/^(https?:|data:)/i.test(hrefValue)) return match;
    const resolved = path.resolve(resourcesDir, hrefValue);
    if (!fs.existsSync(resolved)) return match;
    const bytes = fs.readFileSync(resolved);
    const mime = mimeForPath(resolved);
    const dataUri = `data:${mime};base64,${bytes.toString("base64")}`;
    return ` href="${dataUri}"`;
  });

const svgWithEmbeddedImages = embedLocalImages(svg);

const resvg = new Resvg(svgWithEmbeddedImages, {
  resourcesDir,
  background: "transparent",
  fitTo: { mode: "width", value: 1200 },
});

const pngData = resvg.render().asPng();
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, pngData);
console.log(`Wrote ${path.relative(process.cwd(), outputPath)}`);
