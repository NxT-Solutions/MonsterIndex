# Production Docker Setup

This folder contains the production image build assets for MonsterIndex.

## Files

- `images/Dockerfile`: single production image build used by GitHub Actions
- `images/configs/app/entrypoint.sh`: runtime role switcher for web, queue, and scheduler containers
- `images/configs/app/post-deploy.sh`: Laravel deploy actions run after the new web container starts

## Runtime Model

- No server-side app `.env` file is required.
- GitHub Actions takes `codebase/.env.production`, injects GitHub secrets into it, and bakes the result into the image as `.env.production` and `.env`.
- The VPS runtime stack lives in the ops repo, not here.
- The production workflow builds and publishes the image, then SSHes into the VPS and runs the ops repo deploy for `monster-index`.
