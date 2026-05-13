#!/bin/sh

# Install sshpass if not already installed
if ! command -v sshpass > /dev/null 2>&1
then
    echo "sshpass could not be found, installing..."
    apt-get update && apt-get install -y sshpass
fi

# Install rsync if not already installed
if ! command -v rsync > /dev/null 2>&1
then
    echo "rsync could not be found, installing..."
    apt-get update && apt-get install -y rsync
fi

# Use rsync with sshpass for password authentication
sshpass -p "$SSH_E2E_PASSWORD" rsync -avz --delete \
    --exclude=".git/" \
    --exclude="node_modules/" \
    --exclude=".pnpm-store/" \
    --exclude="playwright-report/" \
    --exclude="test-results/" \
    -e "ssh -o StrictHostKeyChecking=no -p $SSH_E2E_PORT" \
    ./ cust@labdevs.com:/home/cust/view-resources/baseview/

# TODO check if other repositories need to be synced
# TODO Check in githubactions if other tests are running with an env variable on the test cluster.
