# Cue

Cue is a Chrome extension that adds a live technical interviewer to NeetCode.

## Requirements

- Node.js 22+
- npm 10+
- Python 3.12+
- [uv](https://docs.astral.sh/uv/)

## Setup

```bash
npm install
npm run setup:api
cp .env.example .env
```

## Development

Run the extension and API in separate terminals:

```bash
npm run dev:extension
npm run dev:api
```

WXT opens a development browser with the extension loaded. The API is available at
`http://localhost:8000`; its health check is `GET /health`.

## Checks

```bash
npm run check
```

## Structure

```text
apps/extension  WXT and React Chrome extension
apps/api        FastAPI service
packages/shared Shared TypeScript contracts
```
