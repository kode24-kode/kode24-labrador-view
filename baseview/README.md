# Baseview
View resources for Labrador CMS
https://github.com/publishlab/baseview

## Installation steps

Mac/Linux:

`curl -fsSL https://get.pnpm.io/install.sh | sh -`

Windows:

`Invoke-WebRequest https://get.pnpm.io/install.ps1 -UseBasicParsing | Invoke-Expression`

Check which node version you have installed:

`pnpm node -v`

[![Run unit tests with Mocha](https://github.com/publishlab/baseview/actions/workflows/pr-unit-tests.yml/badge.svg)](https://github.com/publishlab/baseview/actions/workflows/pr-unit-tests.yml)  
[![Run e2e and visual tests with Playwright](https://github.com/publishlab/baseview/actions/workflows/pr-playwright-tests.yml/badge.svg)](https://github.com/publishlab/baseview/actions/workflows/pr-playwright-tests.yml)  
[![Code Review with OpenAI](https://github.com/publishlab/baseview/actions/workflows/code-review.yml/badge.svg)](https://github.com/publishlab/baseview/actions/workflows/code-review.yml)

Baseview is a comprehensive set of view resources for Labrador CMS. It serves as a foundation for building custom views, providing definitions for various page components such as front pages, article pages, article teasers, factboxes, and more.

For detailed documentation on setting up your own view, visit the `/support` URL on any running Labrador installation.

---

## File Structure

The following table outlines the structure of the Baseview repository:

| Path                     | Required | Description                                                                 |
|--------------------------|----------|-----------------------------------------------------------------------------|
| **build/**               | No       | Contains build files.                                                      |
| **build/front/**         | No       | Build files for server-side rendering.                                      |
| **build/modules/**       | No       | Build files for editor and client-side rendering.                          |
| **build/buildHelpers/**  | No       | Tools for creating builds.                                                 |
| **client/**              | No       | Definitions of resources for client-side rendering.                        |
| **client/buildHelpers/** | No       | Tools for creating client-side builds.                                     |
| **config/**              | No       | JSON files for configuration.                                              |
| **config/presentation/** | No       | Configuration for server-side rendering in presentation mode.              |
| **config/edit/**         | No       | Configuration for running the view in the editor.                          |
| **dashboard/**           | No       | Separate view resources for running Labrador Dashboard.                    |
| **docs/**                | No       | Documentation files (README files).                                        |
| **lib/**                 | No       | Support frameworks and utilities.                                          |
| **modules/**             | No       | JavaScript modules.                                                        |
| **modules/apps/**        | No       | Apps for the editor.                                                       |
| **modules/behaviours/**  | No       | Behaviors for each element type.                                           |
| **modules/collections/** | No       | Collections for the editor.                                                |
| **node_modules/**        | No       | Node.js dependencies.                                                      |
| **public/**              | No       | Public files available at `/`.                                             |
| **public/common/**       | No       | Public files shared across sites.                                          |
| **releasenotes/**        | No       | JSON files containing logs of new features and changes.                    |
| **test/**                | No       | Resources for testing (unit tests, Playwright e2e and visual tests).       |
| **test/playwright/**     | No       | Playwright test specs, auth setup, and visual regression snapshots.        |
| **view/**                | Yes      | Templates and properties for each supported element type in the view.      |
| **index_client.js**      | No       | Exports modules for client-side rendering using the Labrador rendering engine. |
| **index_editor.js**      | Yes      | Exports modules for the Labrador editor.                                   |
| **index_front.js**       | Yes      | Exports modules for server-side rendering.                                 |
| **package.json**         | No       | Node.js project file for builds, tests, and other scripts.                 |

---

## Testing

Three test suites run on every PR via two separate GitHub Actions workflows:

| Suite | Command | Runner | What it does |
|-------|---------|--------|--------------|
| **Unit tests** | `pnpm run test` | `node:24` | Mocha tests in `test/` — runs after a full build |
| **E2E tests** | `pnpm run test:e2e` | Playwright container | Functional tests against the remote Labrador CMS (create articles, tag, publish, logout) |
| **Visual tests** | `pnpm run test:visual` | Playwright container (Docker) | Screenshot comparison of rendered Baseview components against committed baselines |

### Setup

```bash
pnpm install
pnpm run install:browsers   # needed for local e2e tests
```

E2E tests require credentials. Copy `.env.example` to `.env` and `.secrets`, then fill in the values for `AUTH_USERNAME`, `AUTH_PASSWORD`, and `LAB_SESSION`.

### Running Tests Locally

```bash
# Install dependencies (one-time setup)
pnpm install
pnpm run install:browsers  # for Playwright tests

# Run unit tests (same as CI)
pnpm run build
pnpm run test

# Run E2E tests (requires credentials in .env and .secrets)
pnpm run test:e2e

# Run visual tests (requires Docker)
pnpm run test:visual
```

**Docker Setup:** Visual tests run in Docker containers. See [`docker.md`](docker.md) for detailed setup instructions including Docker runtime options (OrbStack, Docker Desktop, Colima, etc.).

**GitHub Actions with act:** If you want to run workflows locally with act, see [`docker.md`](docker.md) for configuration details and known limitations.

### Unit Tests

```bash
pnpm run build
pnpm run test
```

### E2E Tests

```bash
pnpm run test:e2e
```

Tests run against `labrador-e2e-test.labdevs.com` by default. Set the `BASE_URL` env var (e.g. `BASE_URL=labrador-your-name-test.labdevs.com`) to target a different server. An auth setup (`auth.setup.ts`) primes a session cookie so tests start logged in. The logout test runs last in a dedicated project to avoid invalidating the session for other tests.

### Visual Tests

Visual tests run inside Docker using the official Playwright image to ensure consistent screenshots across machines. They compare full-page screenshots against **committed baseline snapshots** in `test/playwright/visual.spec.ts-snapshots/`. Matching is exact — any pixel difference fails the test.

| Command | Description |
|---------|-------------|
| `pnpm run test:visual` | Run locally. Opens the HTML report automatically on failure. |
| `pnpm run test:visual:ci` | CI mode — list reporter only, never hangs. |
| `pnpm run test:visual:update` | Re-generate baselines after intentional UI changes. |

### Resolving Visual Diffs

When visual tests fail it means the rendered output has changed compared to the committed baselines.

1. Run `pnpm run test:visual` — the HTML report opens automatically showing expected vs. actual vs. diff.
2. If you can't see the report, open it manually with `pnpm exec playwright show-report`.
3. **Unintentional change?** Fix your code and re-run.
4. **Intentional change?** Update the baselines and commit them:
   ```bash
   pnpm run test:visual:update
   ```
   Review the updated snapshots, then commit them to Git.

> **Tip:** Baselines are platform-specific (e.g. `*-chromium-linux.png`). The Docker-based commands ensure Linux baselines are generated regardless of your OS. Always commit the Linux baselines so CI passes.

---

## License

Use of Baseview requires a valid license from Labrador CMS.
For more information, visit [Labrador CMS](https://labradorcms.com).
