# Host the Co-op Game Online (GitHub → Render)

This puts the game on the internet so students can join from **any** wifi or phone
data with a single link — no local Node, no "same network" requirement. The live
leaderboard and walkable shared world all work.

The project is ready to deploy. You just need to (1) put it on GitHub and
(2) connect it to a free host. The easiest path on Windows is **GitHub Desktop**;
command-line steps are below it.

---

## Part 1 — Put it on GitHub  (~5 min)

### First: remove the leftover `.git` folder

There's an empty/partial `.git` folder in the project folder that should be
deleted before you start. In File Explorer turn on **View → Hidden items**, then
delete the `.git` folder. (Or in a `cmd` window in the project folder run
`rmdir /s /q .git`.)

### Option A — GitHub Desktop (easiest, no commands)

1. Install **GitHub Desktop** from https://desktop.github.com and sign in.
2. **File → Add local repository →** choose this project folder. When it says
   "this folder is not a Git repository," click **create a repository here**.
3. Click **Publish repository** (top bar). Name it `cato-capitalism-coop`,
   leave "Keep this code private" checked if you like, and publish.

That's it — your code is on GitHub.

### Option B — command line

Open a terminal **in the project folder** (in File Explorer, type `cmd` in the
address bar) and run:

```bash
git init
git add -A
git commit -m "Freedom Founder co-op"
git branch -M main
git remote add origin https://github.com/YOURNAME/cato-capitalism-coop.git
git push -u origin main
```

Create the empty `cato-capitalism-coop` repo first at https://github.com/new
(don't add a README/.gitignore — the project already has them) to get the URL
for the `git remote add` line. It'll ask you to sign in to GitHub the first time.

---

## Part 2 — Deploy it free on Render  (~5 min)

Render runs the little Node server for free and gives you a public link.

1. Go to https://render.com and sign up (you can sign in **with GitHub** — easiest).
2. Click **New +  →  Blueprint**.
3. Pick your `cato-capitalism-coop` repo. Render reads the included `render.yaml`
   and fills everything in automatically.
4. Click **Apply / Create**. Wait ~2 minutes for the first build.
5. Render gives you a URL like `https://cato-capitalism-coop.onrender.com`.

That URL is your world. Hand them out:

| Link | Who |
|------|-----|
| `https://YOUR-APP.onrender.com`        | Students |
| `https://YOUR-APP.onrender.com/host`   | Teacher leaderboard |
| `https://YOUR-APP.onrender.com/join`   | QR + join screen to project |

---

## Good to know

- **Free tier sleeps.** After ~15 min idle the server naps; the next visit wakes
  it (one slow ~30-second load), then it's fast again. Fine for a class — just open
  it a minute before you start.
- **It's public.** Anyone with the link can join. There's no personal data in the
  game, but don't treat the leaderboard as private.
- **Updating the game later:** commit your changes and `git push`. Render
  redeploys automatically (`autoDeploy` is on).
- **Still want same-wifi/offline play?** The local launchers
  (`Start Co-op Host …`) still work exactly as before — the server detects whether
  it's running locally or in the cloud.
