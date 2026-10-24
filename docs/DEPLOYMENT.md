# Publish the pilot

This project is configured for **Vercel with a real Python/FastAPI backend**, serving the built React frontend on the same origin. Public GitHub, Vercel and YouTube publication require the owner's authenticated accounts. None is claimed until a returned public URL has been verified.

## 1. Anonymous public GitHub repository

Use a random repository name, for example `n7q4vk2`. Do not use a person's name, email, employer, original document or local paths as repository metadata. The `.gitignore` excludes secrets, virtual environments, generated artifacts and installed dependencies. The original challenge document should not be published; add `*.docx` to your local ignore rules if it is still in the project folder.

If Git and GitHub CLI are installed and authenticated:

```sh
git init -b main
git add .
git commit -m "Build wind forecast procurement pilot"
gh repo create n7q4vk2 --public --source . --remote origin --push
```

Use an appropriate Git author identity for your account, ideally its GitHub no-reply address. A random repository name anonymizes the name, not the public GitHub account or commit identity. Inspect those before submission. If a local Git repository already exists, use it rather than reinitializing or rewriting its history.

## 2. Vercel import

1. Connect Vercel to the public repository and import it with **the repository root** as root directory.
2. Retain `vercel.json`: FastAPI framework, root `index.py` entrypoint, frontend install/build command, function include paths and `/tmp` cache location.
3. Use Python 3.12 (`.python-version`) and Node 22.12+ / Node 24. Root `requirements.txt` loads backend dependencies. The Vercel build command installs and builds `frontend`.
4. Configure a strong random `REFRESH_TOKEN` as a server-only environment variable for production and preview. Keep `VITE_API_BASE_URL` unset so the browser calls same-origin `/api` paths.
5. Deploy. Check the actual build/runtime logs and returned deployment state. A checked-in configuration and local build are not proof of a successful deployment.
6. Open the public URL in an incognito/signed-out browser. If access is blocked by deployment protection, explicitly allow the evaluator to view the production URL. Do not expose secrets to fix access.

Equivalent authenticated CLI flow:

```sh
npx vercel login
npx vercel link
npx vercel env add REFRESH_TOKEN production
npx vercel --prod
```

Enter secrets at the prompt; do not paste them into shell command arguments or a committed file. The configuration follows [Vercel's official FastAPI guide](https://vercel.com/docs/frameworks/backend/fastapi) and [project configuration reference](https://vercel.com/docs/project-configuration/vercel-json). Public deployment was not executed without authenticated account access.

## 3. Production checks

Use the actual returned deployment origin (below, `https://YOUR-APP.vercel.app` is a placeholder, not a submitted URL):

```sh
curl --fail https://YOUR-APP.vercel.app/api/health
curl --fail 'https://YOUR-APP.vercel.app/api/summary?start=2026-01-01&end=2026-01-31&basis=decision'
```

PowerShell browser test:

```powershell
$env:TEST_BASE_URL='https://YOUR-APP.vercel.app'
cd frontend
npx playwright test
```

Verify overview loads, paired coverage is reported, filters change KPIs and charts, CSV downloads, no localhost requests appear in production network traffic, refresh succeeds with the owner's token, denied refresh is safe, and pages work on mobile. Browser tests create isolated contexts; also explicitly check the final submission links in incognito as the challenge requires.

The refresh can make several bounded upstream calls. `maxDuration=180` must fit the account's function-duration limit; choose a supported plan limit or use the bundled snapshot and offline fetch script if the provider limits long refreshes. The deployed analysis itself does not require an upstream fetch on each cold start because a genuine snapshot is packaged.

## 4. Demo and submission

The generated narrated local MP4 and script are described in [DEMO_SCRIPT.md](DEMO_SCRIPT.md). Review it, upload to the owner's YouTube account as **Unlisted**, wait for processing, and verify signed-out playback. Each part must be at most five minutes and total duration at most ten minutes.

Populate the repository README with the real GitHub, Vercel and YouTube URLs, and record their checks in `REQUIREMENT_AUDIT.md`. The [original submission form](https://forms.cloud.microsoft/r/Ljmf1aWESK) was recovered from the Word document's hyperlink relationships. Its contents could not be inspected through the research tool. The [video-upload guide linked in the document](https://sites.uab.edu/apex/for-mph-students/youtube-video/) was also recovered. The owner must complete the form after the mandatory video is ready; no submission is claimed.

## Runtime persistence limits

Vercel memory and `/tmp` are ephemeral per instance. A successful refresh is not a durable distributed update; new instances can still start from the bundled snapshot. For this bounded historical pilot, regenerate/commit the snapshot when making a lasting source update. Docker uses a named volume and does preserve normal runtime refreshes across restarts. Multi-instance shared storage is intentionally outside pilot scope.
