# Automatic Sign-in and Progress Saving, Setup (about 10 minutes, free)

Students sign in with a **name + PIN**. Their avatar, stars, items, house, and grades
save by themselves and load on any device. This needs one small piece of free durable
storage (Upstash Redis). Until you set it up, the game still works, sign-in just says
"automatic saving is not set up yet" and students can use a Save Code instead.

## Step 1, create a free Upstash Redis database
1. Go to https://upstash.com and sign up (you can sign in with Google, it is free).
2. Click **Create Database**. Give it any name (e.g. `cato-game`). Pick the region closest
   to you. Leave the defaults and create it.
3. Open the database, then open the **REST API** section.
4. Copy the two values:
   - `UPSTASH_REDIS_REST_URL`  (looks like `https://xxxx.upstash.io`)
   - `UPSTASH_REDIS_REST_TOKEN`  (a long token)

## Step 2, add them to Render
1. Open your service at https://dashboard.render.com (the `cato-capitalism-coop` service).
2. Go to **Environment**, then **Add Environment Variable**, and add both:
   - Key: `UPSTASH_REDIS_REST_URL`   Value: the URL you copied
   - Key: `UPSTASH_REDIS_REST_TOKEN` Value: the token you copied
3. Save. Render restarts the service automatically. Automatic sign-in is now on.

## How it works for students
- **First time:** type a name and a PIN (3 to 6 digits), tap Sign in, create a leader.
  From then on it saves on its own.
- **Next time (any computer):** type the same name and PIN, tap Sign in, and their leader
  and progress load automatically. No avatar to remake.
- On the same computer the name and PIN are remembered, so it is usually one tap.

## Notes
- PINs are for saving the game only. They are stored hashed (not in plain text). Tell
  students to keep their PIN private and not reuse a real password. No email is collected.
- Upstash free tier is generous (plenty for a class). If two students pick the exact same
  name, the second is asked to choose a different name.
- The Save Code (on the title screen leader panel) still works as an offline backup.
