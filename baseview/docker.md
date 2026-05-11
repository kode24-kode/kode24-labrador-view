# Docker Setup for Baseview

This project requires a Docker runtime for running visual tests locally. You can use any Docker runtime you prefer (Docker Desktop, Colima, Rancher Desktop, etc.).

The following instructions show how to set up **OrbStack on macOS** as an example, but the tests will work with any Docker-compatible runtime. **Note:** OrbStack and Docker Desktop require paid licenses for commercial use. Free alternatives include Colima and Rancher Desktop.

## Installation (macOS with OrbStack)

```bash
brew install --cask orbstack
```

OrbStack will start automatically after installation and integrates seamlessly with macOS.

**Using a different Docker runtime?** Skip to the "Verify Docker is Working" section below. As long as `docker` commands work, you're all set.

## Verify Docker is Working

```bash
# Check Docker is running (empty list is normal - means no containers running)
docker ps

# Test with a simple container
docker run --rm hello-world
```

You should see "Hello from Docker!" message confirming your setup is working correctly.

**Note:** An empty list from `docker ps` is normal and expected. It just means no containers are currently running.

## Running Tests Locally

The recommended way to test locally is to run the same commands that CI uses:

```bash
# Set up environment (one-time)
pnpm install
pnpm run install:browsers  # for Playwright tests

# Run unit tests (same as CI)
pnpm run build
pnpm run test

# Run E2E tests (requires credentials in .env and .secrets)
pnpm run test:e2e

# Run visual tests (uses Docker)
pnpm run test:visual
```

### Running GitHub Actions with act (Optional)

If you want to run GitHub Actions workflows locally using [act](https://nektosact.com/), note that the official workflows have compatibility issues due to how `act` handles PATH modifications between steps.

A simplified workflow is provided as a workaround:

```bash
act pull_request
```

However, running tests directly (as shown above) is more reliable and what we recommend.

### Prerequisites for E2E/Visual Tests

Ensure your `.secrets` and `.env` files exist with required credentials:

```bash
# .secrets file
AUTH_USERNAME=your_username
AUTH_PASSWORD=your_password
LAB_SESSION=your_session_token
SSH_E2E_PASSWORD=your_ssh_password
SSH_E2E_PORT=your_ssh_port
```

## Troubleshooting

### "Cannot connect to the Docker daemon"

1. Check OrbStack is running: Look for the OrbStack icon in your menu bar
2. Open OrbStack app and ensure Docker is started
3. Try restarting OrbStack from the menu bar app
4. If still not working, restart your Mac

### Playwright tests fail

The Playwright tests require:
- `SSH_E2E_PASSWORD` and `SSH_E2E_PORT` set in `.secrets`
- Network connectivity to the staging server

Run them directly with:
```bash
pnpm run test:e2e      # for E2E tests
pnpm run test:visual   # for visual tests
```
