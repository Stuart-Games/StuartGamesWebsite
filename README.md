# Stuart Games website

The official single-page website for Stuart Games, focused on [Water Physics](https://www.roblox.com/games/6128441278/Water-Physics).

The site is static and designed for GitHub Pages. A scheduled GitHub Action refreshes the local Roblox statistics snapshot and official game imagery every hour, so the browser never depends on cross-origin Roblox API requests. The page displays the snapshot age and marks player activity as stale after two hours.

To preview locally, serve the repository root with any static file server (for example `python3 -m http.server 8080`) and open `http://localhost:8080`.

To manually refresh data and imagery, run:

```sh
node scripts/refresh-roblox-data.mjs
```
