[![Badge Commits]][Commit Rate]
[![Badge License]][License]
![Build](https://github.com/qxbao/insta-snap/actions/workflows/build.yml/badge.svg)
![Lint](https://github.com/qxbao/insta-snap/actions/workflows/lint.yml/badge.svg)
![Tests](https://github.com/qxbao/insta-snap/actions/workflows/test.yml/badge.svg)
![GitHub release (latest by date)](https://img.shields.io/github/v/release/qxbao/insta-snap)

---

<h1 align="center">
InstaSnap
</h1>

InstaSnap is a browser extension that allows users to keep track on their social media followers and following lists with just a click (or even none, with auto-snapshot feature).

This project is open-sourced. Any contributions are welcome!

---

- [Installation](#installation)
  - [Github releases](#github-releases)
  - [Building from source](#building-from-source)
- [Release history](#release-history)
- [Development](#development)
- [About](#about)

## Installation

Currently, InstaSnap supports Chromium-based browsers (Google Chrome, Microsoft Edge, Brave, etc.) only. The deployment on Chrome Web Store is underway. Until then, you can install the extension manually.

### Github releases

You can download the latest release from the [Releases](https://github.com/qxbao/insta-snap/releases)
page. Download the `.zip` file, extract it, and load the extracted folder as an unpacked extension in your browser.

### Building from source

You can also build the extension from source code. Make sure you have [Node.js](https://nodejs.org/) installed.
Then, follow the steps below:

1. Clone the repository:
   ```bash
   git clone https://github.com/qxbao/insta-snap.git
   ```
2. Navigate to the project directory:

   ```bash
   cd insta-snap
   ```

3. Install the dependencies (using pnpm):

   ```bash
   pnpm install
   ```

   If you don't have `pnpm` installed, you can enable it via corepack:

   ```bash
    corepack enable pnpm
   ```

4. Build the extension:

   ```bash
    pnpm run build
   ```

5. Load the `dist` folder as an unpacked extension in your browser.

## Release history

See the [Releases](https://github.com/qxbao/insta-snap/releases)

## Development

See the [Contributing Guide](CONTRIBUTING.MD)

## About

[GPLv3 License][License]

[Privacy Policy](https://github.com/qxbao/insta-snap/wiki/Privacy-Policy)

Free. Open-source. Any donations are appreciated!

<!----------------------------------------------------------------------------->

[Commit Rate]: https://img.shields.io/github/commit-activity/m/qxbao/insta-snap?label=Commits
[License]: LICENSE.txt

<!----------------------------------------------------------------------------->

[Badge Commits]: https://img.shields.io/github/commit-activity/m/qxbao/insta-snap
[Badge License]: https://img.shields.io/badge/License-GPLv3-blue.svg
