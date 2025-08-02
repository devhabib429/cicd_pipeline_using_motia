# Motia CI/CD Pipeline for Node.js Deployment

This repository contains a Motia-based CI/CD pipeline that automatically deploys a Node.js application from a GitHub repository to a remote Ubuntu server (Server B) when code is pushed to the `main` branch. The pipeline runs on a separate Ubuntu server (Server A) using Motia, with a visual Workbench UI for monitoring.

## Overview

The pipeline uses [Motia](https://motia.dev) to orchestrate a three-step workflow (`cicd-flow`):
- **ReceiveWebhook**: Listens for GitHub push events via a webhook.
- **PullCode**: Pulls the latest code to Server B via SSH.
- **DeployCode**: Installs dependencies and restarts the app on Server B using PM2.

This setup is ideal for automating deployments and visualizing the CI/CD process. A demo video is available on [LinkedIn](#) (replace with your post link).

## Prerequisites

### Server A (Motia Server)
- **OS**: Ubuntu (e.g., 20.04 or later)
- **Software**:
  - Node.js (v16.0+): `sudo apt install nodejs`
  - pnpm: `npm install -g pnpm`
  - Motia CLI: `npm install -g @motiadev/cli`
  - Git: `sudo apt install git`
- **SSH Access**: Configured to access Server B via SSH keys
- **Network**: Publicly accessible IP or domain (or use `ngrok` for testing) with port 3001 open

### Server B (Deployment Server)
- **OS**: Ubuntu
- **Software**:
  - Node.js (v16.0+)
  - Git
  - PM2: `npm install -g pm2`
- **Repository**: Node.js app cloned at `/home/ubuntu/app`
- **SSH**: Accepts connections from Server A

### GitHub
- **App Repository**: A separate GitHub repo with the Node.js app (e.g., `git@github.com:<username>/app-repo.git`)
- **Motia Repository**: This repo (e.g., `git@github.com:<username>/motia-cicd.git`)
- **Webhook**: Configured to send push events to Server A’s Motia endpoint

## Setup Instructions

### 1. Clone This Repository
Clone this repository to Server A:
```bash
git clone git@github.com:<username>/motia-cicd.git ~/motia
cd ~/motia
pnpm install
```

### 2. Configure SSH for Server B
1. Generate an SSH key on Server A (if not already done):
   ```bash
   ssh-keygen -t rsa -b 4096 -C "server-a-to-server-b"
   ```
2. Copy the public key to Server B’s `/home/ubuntu/.ssh/authorized_keys`:
   ```bash
   ssh-copy-id ubuntu@<server-b-ip>
   ```
3. Test SSH:
   ```bash
   ssh ubuntu@<server-b-ip>
   ```

### 3. Set Up Node.js App on Server B
1. Clone the app repository (if not already present):
   ```bash
   ssh ubuntu@<server-b-ip> "git clone <app-repo-url> /home/ubuntu/app && chown -R ubuntu:ubuntu /home/ubuntu/app"
   ```
2. Install dependencies and start the app:
   ```bash
   ssh ubuntu@<server-b-ip> "cd /home/ubuntu/app && npm install && pm2 start app.js --name app && pm2 save"
   ```
3. Verify:
   ```bash
   curl http://<server-b-ip>:8080
   ```

### 4. Configure Motia Steps
Edit `steps/pullCode.step.js` and `steps/deployCode.step.js` to set:
- `serverB`: Replace `<server-b-ip>` with Server B’s IP address or use `process.env.SERVER_B_IP`.
- `repoDir`: Ensure it matches the app path (e.g., `/home/ubuntu/app`).
- `branch`: Set to `main` or your target branch.

For security, use an environment variable:
```bash
export SERVER_B_IP=<server-b-ip>
```
Update steps to use:
```javascript
const serverB = `ubuntu@${process.env.SERVER_B_IP}`;
```

### 5. Set Up GitHub Webhook
1. In the Node.js app repository, go to **Settings > Webhooks > Add webhook**.
2. Configure:
   - **Payload URL**: `http://<server-a-ip>:3001/webhook` (or `ngrok` URL for testing)
   - **Content type**: `application/json`
   - **Events**: “Just the push event”
   - **Active**: Check
3. Open port 3001 on Server A:
   ```bash
   sudo ufw allow 3001
   ```

### 6. Run Motia
Start the Motia server:
```bash
cd ~/motia
SERVER_B_IP=<server-b-ip> npx motia dev --port 3001
```
Access the Workbench at `http://<server-a-ip>:3001`.

## Pipeline Details
The `cicd-flow` consists of three steps:
- **ReceiveWebhook** (`steps/receiveWebhook.step.js`):
  - Listens for POST requests at `/webhook`.
  - Triggers on pushes to the `main` branch of the app repo.
  - Emits `code-pushed` event.
- **PullCode** (`steps/pullCode.step.js`):
  - Subscribes to `code-pushed`.
  - Pulls the latest code to Server B via SSH.
  - Emits `code-pulled` event.
- **DeployCode** (`steps/deployCode.step.js`):
  - Subscribes to `code-pulled`.
  - Installs dependencies (`npm install`).
  - Restarts the app with PM2.

## Usage
1. Push a commit to the `main` branch of the Node.js app repo:
   ```bash
   cd <local-app-repo-dir>
   echo "// Update" >> app.js
   git add .
   git commit -m "Update app"
   git push origin main
   ```
2. Monitor execution in the Workbench (`http://<server-a-ip>:3001/traces`).
3. Verify on Server B:
   ```bash
   ssh ubuntu@<server-b-ip> "cd /home/ubuntu/app && git log -1 && curl http://localhost:8080"
   ```

## Troubleshooting
- **UI Blank**:
  - Check: `curl http://<server-a-ip>:3001/api/flows`
  - Clear cache: `rm -rf ~/motia/.motia && pnpm install`
  - Run with debug: `MOTIA_LOG_LEVEL=debug npx motia dev --port 3001`
- **Pipeline Fails**:
  - Test SSH: `ssh ubuntu@<server-b-ip> "cd /home/ubuntu/app && git pull origin main"`
  - Check webhook deliveries in GitHub.
- **Security**:
  - Add webhook secret validation in `receiveWebhook.step.js`:
    ```javascript
    const crypto = require('crypto');
    const secret = process.env.WEBHOOK_SECRET;
    const sigHeader = context.req.headers['x-hub-signature-256'];
    const sig = crypto.createHmac('sha256', secret).update(JSON.stringify(context.req.body)).digest('hex');
    if (sigHeader !== `sha256=${sig}`) throw new Error('Invalid webhook signature');
    ```
  - Set `WEBHOOK_SECRET` and update GitHub webhook settings.


