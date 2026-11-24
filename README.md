# FatalQuackers.github.io

Portfolio site for Quackers, owner of RUSHED. Live at https://fatalquackers.github.io

## Games page (live Roblox stats)

List your games in `data/games.config.json`:

- `places`: place IDs (the number in `roblox.com/games/<ID>/...`)
- `groups`: Roblox group IDs (e.g. the RUSHED group); every public game the group owns is added
- `users`: Roblox user IDs; every public game on that profile is added

The **Update Roblox game stats** GitHub Action (`.github/workflows/roblox-games.yml`) fetches visits, players, likes, favourites, icons and screenshots every 6 hours and saves them to `data/games.json`. Run it any time from the **Actions** tab → *Update Roblox game stats* → *Run workflow*. Game screenshots also show up in the Gallery under "My games".

### Optional: Roblox Open Cloud key

Add a repo secret named `ROBLOX_API_KEY` (Settings → Secrets and variables → Actions) and the Action also pulls each game's platforms, age rating and social links (Discord, group, YouTube) from Open Cloud. The key never goes into the website itself.

## Other content

Everything else is in `index.html`, in the `DATA` section near the bottom of the script: the "Currently on" bar, QA roster, RUSHED / Tethr Link screenshot rows (`projects/`), pricing and gallery files.

Light/dark mode follows the visitor's device and can be switched with the moon button. Background music is generated in the browser (no audio file).

Pages: `#portfolio`, `#games`, `#gallery`, `#pricing`, `#testing`, `#contact`.
