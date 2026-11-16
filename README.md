# 🎀 Where Should We Eat?

A tiny, very pink restaurant picker with two mini-games:

- **🕹️ Claw Machine** – steer the claw, drop it, grab a food capsule. The claw is a little slippery sometimes (but never fails more than twice in a row).
- **🏁 Bunny Race** – every restaurant gets bunny ears and races. Naps, sugar rushes, noodle trips, wrong-way runs… live commentary included.

Your friend can skip options, add her own (saved in her browser) and has **one veto** per visit.

## ✏️ Change the restaurants
Edit `options.js`. Each entry: `name`, `emoji`, optional `note` and `maps` (Google Maps search text).

## 🐰 Character background
Put your character picture at `assets/melody.png` (transparent PNG looks best).
It replaces the built-in bunny mascot and shows as a soft background. If the file is missing, the built-in bunny is used.

## 🚀 Deploy to Vercel
It's a plain static site — no build step.

**Option A (GitHub):** push this folder to a GitHub repo → vercel.com → *Add New Project* → import the repo → Framework preset **Other** → Deploy.

**Option B (CLI):**
```bash
npx vercel        # preview
npx vercel --prod # production
```

## Run locally
```bash
python3 -m http.server 4173
```
then open http://localhost:4173
