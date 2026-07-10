# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A Google Drive clone: Express + MongoDB backend (`server/`) and a React + Vite frontend (`client/`). Two independent Node projects, each with its own `package.json` and `node_modules` — no root-level package.json or workspace tooling.

## Commands

Run these from the respective subdirectory (`server/` or `client/`), not the repo root.

**Server** (`server/`)
- `npm run dev` — start the API with `node --watch app.js` (auto-restarts on file change). Listens on port 80.
- No test, lint, or build scripts exist for the server.
- `node config/setup.js` — (re-)applies MongoDB JSON-schema validators to the `users`, `directories`, `files` collections. Run manually when those schemas change; it opens its own DB connection and closes it on exit.

**Client** (`client/`)
- `npm run dev` — Vite dev server (`--host`, so it's reachable on the LAN too).
- `npm run build` — production build.
- `npm run lint` — ESLint over the client source.
- `npm run preview` — preview the production build.
- No test script/framework is configured.

**Database**: MongoDB must be running as a replica set (`mongodb://anuprabh:anu@localhost:27017/StorageApp?replicaSet=myReplicaSet`, see `server/config/db.js`) — the replica set is required because user registration uses a multi-document transaction (creating the user and their root directory atomically).

## Architecture

### Backend (`server/`)

- `app.js` is the entry point. It connects to MongoDB once at startup (`connectDB()`), then attaches that single shared connection to every request via `req.db = db` middleware. Routes read `req.db`, not a per-request connection.
- Auth is cookie-based, not JWT: `POST /user/login` sets an httpOnly `uid` cookie containing the user's Mongo `_id` string. `middlewares/authMiddleware.js` (`CheckAuth`) looks up that `_id` on every protected request and attaches the full user doc as `req.user`. `/directory` and `/file` routes are mounted with `CheckAuth`; `/user` is not (it has its own per-route checks where needed).
- `middlewares/validateIdMiddleware.js` is wired via `router.param("id"/"parentDirId", ...)` in both `directoryRoute.js` and `fileRoute.js` to reject malformed Mongo ObjectIds before the handler runs.
- Three Mongo collections, each with a JSON-schema validator (defined in `config/setup.js`, `additionalProperties: false`): `users` (`name`, `email`, `password` — stored **unhashed**, `rootDirId`), `directories` (`name`, `userId`, `parentDirId`, nullable for root), `files` (`name`, `extension`, `userId`, `parentDirId`).
- The directory tree isn't stored as nested arrays — parent/child relationships are queried live (`directories.find({parentDirId})`, `files.find({parentDirId})`), not maintained as `children` arrays on the parent doc.
- Every user gets a root directory (`parentDirId: null`) created transactionally alongside their user doc at registration (`routes/userRoutes.js`); `user.rootDirId` is the entry point for their whole tree.
- File uploads (`routes/fileRoute.js`, `POST /file/:parentDirId?`) stream the raw request body straight to disk via `createWriteStream` + `req.pipe(writeStream)` — there's no multipart/form-data parsing or size-limiting middleware. The filename comes from a `filename` request header, not the body. Files are written to `./storage/<mongoId><extension>` (relative to `server/`'s cwd) and named by their Mongo `_id`, so the DB row must exist before the stream starts.
- Directory deletion (`DELETE /directory/:id`) recursively walks subdirectories and files in application code (`deleteDirectoryRecursively`) rather than using a Mongo cascade — it deletes both the DB docs and the on-disk files for every file in the subtree.
- **Known gotcha**: the upload/download code paths reference `./storage/...` (lowercase) but the actual directory on disk is `server/Storage/` (capital S). This only works today because of case-insensitive filesystem defaults (macOS/Windows); it will break on a case-sensitive filesystem (most Linux/CI setups) unless the folder name or the code is made consistent.
- `usersDB.json`, `directoriesDB.json`, `filesDB.json` and their imports are leftovers from a pre-MongoDB, file-based version of this app (see recent commit history: "Database connected" → "Database Validation added" → "Database Auth enabled"). Most references to them in the route files are commented out but the imports themselves are still present — don't treat these JSON files as a real data source.
- The global error-handling middleware in `app.js` is registered *before* the routes are mounted, so Express's error-handler-must-be-last convention isn't honored and `next(err)` calls from routes won't reach it.

### Frontend (`client/src/`)

- Routing (`App.jsx`, `react-router-dom` v7): `/` and `/directory/:dirId` both render `DirectoryView`; `dirId` absent means "show the logged-in user's root directory". `/login` and `/register` are separate pages.
- No global state library — `DirectoryView.jsx` is a large single component owning directory/file lists, upload queue, modals, and context-menu state via `useState`/`useRef`, with presentational pieces split out into `components/` (`DirectoryHeader`, `DirectoryList`, `DirectoryItem`, `ContextMenu`, `CreateDirectoryModal`, `RenameModal`).
- API base URL is hardcoded as `http://localhost:80` in multiple files (`DirectoryView.jsx`, `DirectoryHeader.jsx`, `Login.jsx`, `Register.jsx`) — there's no shared config/env var for it, so it must be updated in each file if the backend origin changes.
- File uploads use raw `XMLHttpRequest` (not `fetch`) specifically to get upload progress events; uploads are queued and processed one at a time (`processUploadQueue`), with per-item cancel support via a tracked `XMLHttpRequest` map.
- All API calls use `credentials: "include"` to send the `uid` auth cookie; a `401` response from `getDirectoryItems()` redirects to `/login`.
