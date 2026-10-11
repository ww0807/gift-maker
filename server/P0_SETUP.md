# P0 Cloud Setup

This is the smallest test environment required to run the gift-maker flow.
Do not commit actual credentials. Put secrets in veFaaS environment variables.

## Required Region

Use `cn-beijing` for veFaaS, TOS, Ark, and image segmentation so
generation traffic stays in one region.

## 1. veFaaS

Create two Node.js 20 functions:

| Function | Mode | Purpose | Suggested configuration |
| --- | --- | --- | --- |
| `gift-maker-web-test` | synchronous Web application | serve Vite `dist/`, create/read task JSON, issue upload URLs, start jobs, save drafts, export events | 512 MB, 30 s timeout |
| `gift-maker-generate-test` | asynchronous task | generate and segment the four images, update task states | 1 GB, 180 s timeout, retry once |

The Web application must be able to invoke the generator function. The invocation
payload is only `{ "taskId": "tsk_..." }`; the generator reloads task data from
private TOS rather than receiving photo data or credentials in the payload.

Configure `gift-maker-web-test` to expose its platform test domain. It serves both
the SPA and `/v1/*` endpoints from the same origin, so no CORS configuration is
needed for the browser flow. If the selected veFaaS creation flow requires an
API Gateway trigger to expose the application, route the application at `/`
instead of creating a separate API-only domain.

## 2. TOS

Create a private test bucket named similarly to `gift-maker-media-test`.

- Enable a seven-day lifecycle deletion rule for `original/`, `generated/`, and
  `tasks/`, plus a two-day deletion rule for `quota/`.
- Do not allow public read or write.
- Grant the API and generator service role only the required object operations.
- The API issues one-hour PUT/GET signed URLs. Browser uploads use the PUT URLs;
  generated PNG previews use GET URLs.
- Task metadata, status, draft, and daily device counters are server-only JSON
  objects under `tasks/` and `quota/`. They are never returned as public TOS URLs.

## 3. Ark And Segmentation

Enable the Seedream model and create a server-side Ark API key. Enable the
chosen Volcengine image-segmentation service as well. Configure both keys only
as veFaaS environment variables.

The generator submits one `2496x3744` 2x2 character-board request using the four
source photos as ordered references. It removes the background from the complete
board with the AI MediaKit `human` scene, then splits the transparent result into
four PNGs and stores them separately.

## 4. Environment Variables

Copy the variable names from `server/.env.example` into both functions where
relevant. Generate `INVITE_TOKEN` outside the repository and never use a
`VITE_` prefix for it.

## Values To Return After Setup

Return these non-secret values so the API implementation can be connected:

1. Region and the Web application test URL.
2. veFaaS function names and whether async invocation is enabled.
3. TOS bucket name and endpoint.
4. Seedream model ID and selected segmentation product.

Keep API keys, database passwords, and access keys in veFaaS directly. Do not
paste them into chat or source files.

## 5. Deployment Packages

The source tree now contains deployable function code:

```text
server/web/index.mjs        # Web application HTTP server
server/generator/index.mjs  # async group-image processor
server/shared.mjs           # private TOS JSON/media helpers
```

Run `npm install --prefix server` before packaging so `sharp` and the AWS S3
compatible client are included. Build the Vite app first with `npm run build`,
then package `dist/` beside `server/web/index.mjs` for `gift-maker-web-test`.

The task function package includes `server/generator/index.mjs`,
`server/generator/run.sh`, `server/shared.mjs`, and `server/node_modules`. Its
startup command is `./run.sh`. Create its API Gateway trigger as a `POST`
route at `/internal/generate`. Its event payload is:

```json
{ "taskId": "tsk_xxx" }
```

The exact protected `GENERATOR_INVOKE_URL` differs by the veFaaS task trigger
created in the console. Configure it only after the task function endpoint is
visible. Set the same random `GENERATOR_INVOKE_TOKEN` in both functions: the
Web function sends it as `X-Generator-Token`; the task function rejects requests
without it. Do not expose that token to browsers.
