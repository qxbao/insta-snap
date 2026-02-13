# Contributions

All contributions to this project are welcome! Whether you're fixing bugs, adding new features, or improving documentation, your help is appreciated.

## How to Contribute

1. Fork the repository on GitHub.
2. Clone your forked repository to your local machine:
   ```bash
   git clone https://github.com/qxbao/insta-snap.git
   ```
3. Create a new branch for your feature or bug fix:
   ```bash
   git checkout -b branch-name
   ```
4. Make your changes and commit them with clear messages:
   ```bash
   git commit -m "Description of changes"
   ```
5. Push your changes to your forked repository:
   ```bash
   git push origin branch-name
   ```
6. Open a pull request on the original repository, describing your changes and why they should be merged.

## Development environment setup

To set up a local development environment, follow these steps:

1. Ensure you have [Node.js](https://nodejs.org/) installed on your machine.
2. Clone the repository and navigate to the project directory:
3. Install the dependencies using pnpm:
   ```bash
   pnpm install
   ```
   If you don't have `pnpm` installed, you can enable it via corepack:
   ```bash
   corepack enable pnpm
   ```
4. Start the development server:
   ```bash
   pnpm dev
   ```


## Localization Contribution
To contribute to localization, please follow these steps:
1. Create new messages.json file in `public/_locales/{locale}` directory, where {locale} is the language code (e.g., `en`, `vi`, etc.).

2. The messages.json file should contain key-value pairs of localized strings (follow `public/_locales/en/messages.json` as an example).

3. Create {locale}.ts file in `src/i18n/locales` directory

4. The {locale}.ts file should export a locale object that maps the keys from EnglishLocale object. Your locale object must satisfy `EnglishLocale` (follow `src/i18n/locales/vi.ts` as an example).
