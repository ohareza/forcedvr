import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("src/manifest.json", root), "utf8"));
const pkg = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
if (manifest.version !== pkg.version) throw new Error("Package and manifest versions differ");

for (const target of ["chrome", "firefox"]) {
  const output = new URL(`dist/${target}/`, root);
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  const targetManifest = structuredClone(manifest);
  if (target === "firefox") {
    delete targetManifest.minimum_chrome_version;
    targetManifest.background = { scripts: ["background.js"] };
    targetManifest.browser_specific_settings = {
      gecko_android: { strict_min_version: "142.0" },
      gecko: {
        id: "forcedvr@ohareza.twt",
        strict_min_version: "140.0",
        data_collection_permissions: { required: ["none"] },
      },
    };
  }
  await writeFile(new URL("manifest.json", output), `${JSON.stringify(targetManifest, null, 2)}\n`);
  for (const file of ["inject.js", "background.js", "enabled.png", "disabled.png", "icon.png"]) {
    await copyFile(new URL(`src/${file}`, root), new URL(file, output));
  }
  for (const file of ["LICENSE", "THIRD_PARTY_NOTICES.md"]) {
    await copyFile(new URL(file, root), new URL(file, output));
  }
  console.log(`Built ${target} ${manifest.version} in ${fileURLToPath(output)}`);
}
