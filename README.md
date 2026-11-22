# Wera Frontend

[![CI](https://github.com/wera-jobs/Wera-Frontend/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/wera-jobs/Wera-Frontend/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/wera-jobs/Wera-Frontend/badges/coverage.json)](https://github.com/wera-jobs/Wera-Frontend/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/wera-jobs/Wera-Frontend?sort=semver&display_name=tag)](https://github.com/wera-jobs/Wera-Frontend/releases)
[![Tested with Playwright](https://img.shields.io/badge/e2e-Playwright-2EAD33?logo=playwright&logoColor=white)](e2e)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](tsconfig.json)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-fe5196?logo=conventionalcommits&logoColor=white)](https://www.conventionalcommits.org)
[![License](https://img.shields.io/github/license/wera-jobs/Wera-Frontend)](LICENSE)

The public site and user dashboard for [Wera](https://www.wera-jobs.com). Pairs with the Go backend in [wera-jobs/Wera](https://github.com/wera-jobs/Wera).

https://github.com/user-attachments/assets/525e661c-765b-4137-98b7-168d57af9690

## Architecture

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/architecture-dark.svg">
  <img alt="Frontend architecture: in the browser, the router leads to lazy-loaded pages and Tailwind components; pages read through TanStack Query and the API client, which calls /api on nginx, which proxies to the Go API; a 401 sends the user back to sign-in; CI checks gate the Vite build that ships as an nginx image" src="docs/architecture.svg">
</picture>

A React single-page app calling its own origin (`/api`), so session cookies stay first-party behind Vite, nginx, or Vercel rewrites. Server state lives in TanStack Query; route guards handle auth and onboarding.

- **Resilient to outages:** If the API drops, the current screen stays visible with a status banner and automatically recovers when the server returns. Unsaved resume edits retry and warn before leaving.
- **Fast on mobile:** The public landing page renders without waiting on an auth check, inputs use 16px on touch devices, and layouts fit mobile viewports.

## Features

- **Today & Jobs:** Daily review queue ranked by fit score (or instant local estimates), searchable/filterable jobs table with keyboard shortcuts (`j`/`k`, `Enter`, `o`), saved searches, and bulk actions.
- **Job view:** Posting text beside the fit breakdown, matched/missing skills, H-1B wage comparison, referral links, cover letter tab, tailored resume tab, and interview prep for tracked roles.
- **Resume editor:** Structured editor with live preview across four templates (Ivy, Parse, Signal, Ledger), drag-to-reorder, undo/redo, deterministic review score, AI bullet rewrites, one-click one-page fit, and PDF/LaTeX export.
- **Tracker:** Kanban board, list view, archive, progress analytics, and CSV import/export. Closed postings stay visible on your board.
- **Sponsorship & Companies:** Certified H-1B LCA filings (counts, new hires, offered wages by title and level) alongside posting sponsorship signals, plus company pages and follows.
- **Interview prep:** Role-based multiple-choice quizzes, email work simulations, and job-specific prep.
- **Community:** Posts, reactions, and comments screened by AI moderation.
- **Profile & Settings:** Resume upload, matching preferences, application details and saved answers for [Wera for Chrome](https://github.com/wera-jobs/wera-extension), theme (light/dark/system), hidden companies, connected browsers, and account deletion.

*(Admin tools live in the separate [wera-admin](https://github.com/wera-jobs/wera-admin) console.)*

## Stack

Vite 8, React 19, TypeScript 6 (strict), Tailwind CSS 4, React Router 7, TanStack Query, Lucide icons, Geist fonts (self-hosted), Vitest, Testing Library, Playwright.

## Develop

Clone beside the backend (`../wera`):

```sh
# in ../wera
go run ./cmd/wera serve             # API on :8080

# in wera-frontend/
npm install
npm run dev                         # http://localhost:5173 (/api -> :8080)
WERA_API=http://127.0.0.1:8090 npm run dev
```

Use port `5173` (allowed by default in the API's origin check).

## Quality checks

```sh
npm run lint        # ESLint (zero warnings)
npm run typecheck   # TypeScript (app, configs, e2e)
npm test            # Vitest unit & component tests
npm run coverage    # Coverage report
npm run e2e         # Playwright against a running API (see e2e/README.md)
npm run build       # Production bundle in dist/
```

## Landing screenshots

Product screens in `public/landing/*.webp` are rendered from real components using invented data. To regenerate them against a local dev API (never production) with Vite on `:5174`:

```sh
node scripts/landing-shots.mjs          # all screens
node scripts/landing-shots.mjs tracker  # single screen
```

## Deployment

- **Docker:** Built as `wera-web` from `../wera/docker-compose.yml` (`docker compose up -d --build wera-web`) with nginx security headers (`security-headers.conf`). Published to `ghcr.io/wera-jobs/wera-frontend`.
- **Vercel:** Deploys `main`. `vercel.json` sets security headers and rewrites `/api/*` and `/healthz` to the public API (`api.wera-jobs.com`). Set `COOKIE_SECURE=true`, `TRUST_PROXY=true`, and `PUBLIC_ORIGINS` on the backend.

Commits follow [Conventional Commits](https://www.conventionalcommits.org); [release-please](https://github.com/googleapis/release-please) manages versions and changelogs.

## Project layout

```
src/
├── api/          API client, types, React Query hooks, fixtures
├── auth/         Login, signup, route guards
├── components/   Job drawer, cover letter, ScoreRing, FilterBar, charts
├── layout/       Sidebar, mobile tab bar, command palette
├── landing/      Public landing page, hero canvas, footer & policy pages
├── lib/          Theme, toasts, formatting
├── pages/        Today, Jobs, Industries, Tracker, Sponsorship, Interview, Community, Profile, Settings
├── profile/      Resume upload, preferences, profile editor
├── resume/       Resume editor and live preview
└── test/         Test helpers and fixtures
e2e/              Playwright specs and seed data
scripts/          Landing screenshots, commit checks, coverage badge
public/           Landing images, icons, web manifest
docs/             Architecture diagram (Excalidraw sources in docs/diagrams)
```

Theme tokens live in `src/index.css`.
