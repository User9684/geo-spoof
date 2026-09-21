# Geo-Spoof

### What is this?

This is a geological location spoofer extension for web browsers

### Installation

- Chromium Browsers / Firefox Nightly:
- 1) Navigate to [releases](../../releases)
- 2) Download the appropriate zip file (mv2 for Manifest V2, mv3 for Manifest V3)
- 2) - For Firefix Nightly, you'll want to pick mv2
- 3) Navigate to your browser's extension management page
- 4) Enable "Developer Mode"
- 5) Drag & Drop the zip file, and it should install.
- Firefox:
- - [Install via AMO](https://addons.mozilla.org/en-US/firefox/addon/geolocation-spoofer)

### Building
To build from code, simply run the `build.mjs` file in the `build` directory.<br>
Doing this will give you two zip files, one for Manifest V2 and another for Manifest V3
- Note: the code does NOT change depending on MV2 or MV3, only the format of the manifest.json file.<br>Code is kept constant regardless of Manifest version.

### What makes this different from others?

Most all geographical location spoofers can easily be detected by one of many different [methods](./detection.md)

I, however, actively seek out ways to detect spoofing & then patch it in my own. Not many spoofers even <i>care</i> to patch detection methods, letalone actively seek it out.