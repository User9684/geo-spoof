import { readFile } from "fs/promises";
import * as fs from "fs";
import * as path from "path";
import AdmZip from "adm-zip";

const OUTPUT_DIR = "./output";

async function createManifestFromBase(version) {
	const rawData = await readFile("./base-manifest.json", "utf8");
	let jsonObject = JSON.parse(rawData);

	jsonObject["manifest_version"] = version;

	if (version >= 3) { // Manifest v3
		// Background script
		jsonObject.background = {
			service_worker: "background.js",
		};

		// Popup
		jsonObject.action = {
			default_popup: "popup.html",
		};

		// Apply to all pages
		jsonObject.host_permissions = [
			"<all_urls>",
		];
	}
	else { // Manifest v2
		// Background script
		jsonObject.background = {
			scripts: [
				"background.js",
			],
		};

		// Popup
		jsonObject.browser_action = {
			default_popup: "popup.html",
		};

		// Apply to all pages
		jsonObject.permissions.push("<all_urls>");
	}

	return JSON.stringify(jsonObject, null, "\t");
}

async function build() {
	console.log("Building extensions...");

	// Create output folder if not exist
	if (!fs.existsSync(OUTPUT_DIR)) {
		console.log("Created output dir");
		fs.mkdirSync(OUTPUT_DIR);
	}

	const manifest_v2 = await createManifestFromBase(2);

	const mv2Zip = new AdmZip();
	mv2Zip.addLocalFolder("../src");
	mv2Zip.addFile("manifest.json", Buffer.from(manifest_v2));

	let mv2FilePath = path.join(OUTPUT_DIR, "mv2.zip");
	mv2Zip.writeZip(mv2FilePath);
	console.log(`Built mv2! Output file: ${mv2FilePath}`);

	const manifest_v3 = await createManifestFromBase(3);

	const mv3Zip = new AdmZip();
	mv3Zip.addLocalFolder("../src");
	mv3Zip.addFile("manifest.json", Buffer.from(manifest_v3));

	let mv3FilePath = path.join(OUTPUT_DIR, "mv3.zip");
	mv3Zip.writeZip(mv3FilePath);
	console.log(`Built mv3! Output file: ${mv3FilePath}`);
}

build();
