# Co-op / Classroom Mode — How to Host

Run a shared world where every student plays their own city on the same wifi,
the town becomes a shared space where players see each other walking around,
and you (the teacher) get a **live leaderboard** of every city's health,
house level, and vanity items.

---

## One-time setup (about 3 minutes)

You only do this once per computer that will *host*.

1. Install **Node.js** — go to https://nodejs.org and install the **LTS** version
   (just click Next through the installer). Students do **not** need this.

That's it.

---

## Running a session

1. **Double-click the launcher** in the project folder:
   - Windows: `Start Co-op Host (Windows).bat`
   - Mac: `Start Co-op Host (Mac).command`
2. Two browser tabs open automatically:
   - **Join screen** (a big QR code + link) — put this on the projector.
   - **Teacher dashboard** — the live leaderboard and grid of every city.
3. **Students join** by scanning the QR code or typing the link
   (it looks like `http://192.168.x.x:3000`) into any browser on the same wifi.
   Phones, tablets, Chromebooks, laptops all work.
4. Keep the black launcher window **open** during class. Closing it ends the session.

---

## What each link is for

| Link | Who | What it shows |
|------|-----|----------------|
| `http://<your-ip>:3000`        | Students | The game (their own city) |
| `http://<your-ip>:3000/host`   | Teacher  | Live leaderboard + every city |
| `http://<your-ip>:3000/join`   | Projector| Big QR code + join link |

The launcher window prints these exact links when it starts.

---

## The leaderboard

On the teacher dashboard you can:
- **Rename the world** (top-left box) — students see the new name.
- **Sort** by clicking any column: Nation, City Health, House, Vanity, Score, or Grade.
- See a **live card for every city** with its four health bars, house tier,
  vanity-item count, score, and grade.
- Watch it all update every second. Students who close their tab drop off after a few seconds.

---

## The walkable shared world

When students are in **Town** mode, they appear as avatars walking around the
same town, each with their nation name and a little health bar floating above
them. They move in real time. Each student's own town still reflects *their*
city's stats; the shared layer is the other players walking through it.

---

## Troubleshooting

- **A student can't connect:** make sure they're on the *same wifi*, and that
  they typed the full link including `http://` and the `:3000` port. Try the QR code.
- **"Node.js is not installed":** install it from https://nodejs.org (LTS), then
  double-click the launcher again.
- **Port already in use:** the host automatically tries 3001, 3002, … — just use
  whatever link the launcher window prints.
- **School wifi blocks devices from seeing each other ("client isolation"):**
  some guest networks prevent this. Use a teacher hotspot or a classroom network
  where devices can reach each other.
- **No QR code on the join screen:** if the host machine is fully offline the QR
  image can't load, but the typed link still works perfectly.

---

## How it works (for the curious)

`coop/coop-server.js` is a tiny zero-dependency Node server. It serves the
existing game file (untouched — opening the `.html` directly is still normal
single-player) with a small co-op script injected. Each browser streams its
game state to the host a few times a second; the host keeps everyone's state in
memory and hands it back out to the dashboard and to other players' towns.
Nothing is saved to disk and nothing leaves your local network.
