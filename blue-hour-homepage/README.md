# blue hour homepage

A small Firefox homepage: clock, weather, rain, a search bar, and two expandable lists (canvas and calendar) you can edit by hand or fill from an `.ics` file. Plain TypeScript, no framework. The built page is about 21 KB (8 KB gzipped).

## Quick start

Pick one way to run it.

**A. Host it on GitHub Pages (recommended).** You get a normal web address that works as your homepage and in New Tab Override. Steps are in "Hosting on GitHub Pages" below.

**B. Open the local file.** Open `docs/index.html` in Firefox, copy the address from the address bar, then Settings > Home > Homepage and new windows > Custom URLs... > paste it. It looks like `file:///C:/Users/you/blue-hour-homepage/docs/index.html` (Windows) or `file:///Users/you/blue-hour-homepage/docs/index.html` (Mac). This covers new windows and the home button, not new tabs. New Tab Override's local file mode can't load a page's linked CSS and JavaScript (its own warning says so), so for new tabs use option A.

**Edit and rebuild.**

1. Install Node.js (the LTS version).
2. In this folder run `npm install` once.
3. `npm run dev` rebuilds on every save, refresh Firefox to see changes.
4. `npm run build` typechecks and makes the final `docs/` folder.

Edit files in `src/` and `public/`, never in `docs/` (it gets wiped on every build). The folder is called `docs` because GitHub Pages can serve a folder with that name.

## Hosting on GitHub Pages

1. Create a new repository on GitHub and make it **Public**. On the free plan, Pages only works with public repositories.
2. Upload the project the way you normally do. Include the `docs/` folder, it is the website.
3. In the repository go to Settings > Pages (under "Code, planning, and automation"). Under "Build and deployment" set Source to **Deploy from a branch**, pick your main branch, set the folder to **/docs**, and click Save.
4. Wait a few minutes, then refresh that Settings page. The address appears at the top. If it never appears, look at the repository's Actions tab for a failed page build.
5. Open the address to check it works. (please)

The address depends on the repository name: a repo called `blue-hour-homepage` gives `https://YOURNAME.github.io/blue-hour-homepage/`, and a repo called `YOURNAME.github.io` gives `https://YOURNAME.github.io/`. Either works with this project.

Then point Firefox at it:

- Homepage: Settings > Home > Homepage and new windows > Custom URLs... > paste the address.
- New tabs: install [New Tab Override](https://addons.mozilla.org/addon/new-tab-override/), choose its custom URL option, and paste the same address.

**Updating later.** Change something in `src/` or `public/`, run `npm run build`, commit and push (including the updated `docs/`), and the site refreshes after a short wait.

**Things to know.**

- The site and your code are public. `config.ts` is visible, so use city-level coordinates for the weather, not your home.
- Your assignments and events are not in the repository. They live in each browser's local storage, so every browser or device starts empty. Use `export` and `restore` to move them.
- If you only want it on your own machine, you can run a local web server instead. With Python installed, `python -m http.server 8000 --directory docs` and then use `http://localhost:8000`. It only works while that command is running.

## Where things live

```
public/index.html      page skeleton, each widget mounts into one element here
public/style.css       all colors and layout, palette is at the top in :root
src/config.ts          settings you are most likely to change
src/main.ts            starts every module and wires the power saver
src/types.ts           shared types, including the Widget shape
src/modules/           one file per widget (clock, weather, rain, search, eventPanel, ...)
src/lib/               helpers: dates, dom, storage, ics parser, event store
build.mjs              bundles src into docs/main.js and copies public/
docs/                  the built site (this is what you publish)
```

## Common edits

| I want to | Change |
| --- | --- |
| set my city and units | `WEATHER_LAT`, `WEATHER_LON`, `WEATHER_PLACE`, `WEATHER_UNIT` in `config.ts` |
| 24 hour clock or seconds | `CLOCK_USE_24H`, `CLOCK_SHOW_SECONDS` |
| turn a widget off | set it to `false` in `ENABLED_WIDGETS` |
| calmer or heavier rain | `RAIN_MAX_DROPS`, `RAIN_SLANT`, `RAIN_FPS` |
| change the colors | the variables under `:root` in `style.css` |
| import further ahead | `IMPORT_HORIZON_DAYS` |

After changing `config.ts` you need to rebuild (`npm run build`).

## Search bar

Turn it on or off with `search` in `ENABLED_WIDGETS` (`config.ts`). It is on by default.

- Engine: `SEARCH_ENGINE` is `"duckduckgo"`, `"google"`, or `"bing"`. To add another, add an entry to `SEARCH_ENGINES` with the engine's search page address and the name of its query parameter (usually `q`), then use its name in `SEARCH_ENGINE`.
- Position: `SEARCH_POSITION` is `"top"` (above the clock), `"middle"` (between the clock and the lists), or `"bottom"` (under the lists).
- Alignment: `SEARCH_ALIGN` is `"left"`, `"center"`, or `"right"`.
- Shortcut: press `/` to jump into the bar. This replaces Firefox's quick find shortcut on this page, and it does nothing while you are typing in another box.

Rebuild after changing any of these. To see a setting without rebuilding, open the page, press F12, and in the Inspector change `data-position` or `data-align` on the `<section id="search">` element.

## The lists

Each panel has `+ add`, an `edit` button on every row, and a checkbox on canvas items. Past, unfinished canvas items show up as overdue. Finished ones stay visible for two days (`SHOW_DONE_FOR_DAYS`) so a stray click is easy to undo.

**Importing from Canvas or Google Calendar.** The page can't log into either service by itself. Browsers stop a page from reading another site's data unless that site allows it, and calendar feeds generally don't, so live sync would need a small server or a sign-in flow. Importing a file keeps everything on your computer.

- Canvas: Calendar > Calendar Feed link. Use "Click to view Calendar Feed" to download an `.ics` file ([Instructure guide](https://community.instructure.com/en/kb/articles/662804-how-do-i-view-the-calendar-ical-feed-to-subscribe-to-an-external-calendar)). Import it into the canvas panel.
- Google Calendar: Settings > pick the calendar > Integrate calendar > "Secret address in iCal format" ([Google help](https://support.google.com/calendar/answer/37648?hl=en)). Paste the link into Firefox's address bar and save the `.ics` it gives you, then import it into the calendar panel. Treat that link like a password.

What the importer does:

- only keeps upcoming events inside the import window (90 days by default)
- expands daily and weekly repeats, monthly and yearly repeats only show their first date
- times with a time zone name are read as your local time
- a title ending in `[COURSE]` moves the course into the course field
- importing again is safe: new items are added, items you edited by hand are left alone, items you deleted stay deleted

## Power saver

The leaf in the bottom right corner. When on, it stops the rain, drops the clock to once a minute, stops weather polling, and swaps the gradient and blur for a flat dark background. It remembers your choice, and on first visit it follows your system's reduced motion setting. Everything also pauses while the tab is hidden.

## Your data and backups

Items are stored in Firefox's local storage for this page, nothing is sent anywhere. That storage can disappear:

- if Firefox is set to clear cookies and site data when it closes (Settings > Privacy & Security)
- if the page's address changes, for example you moved the local folder or switched between the local file and the GitHub address (each address has its own storage)
- in private windows

Use `export` (bottom left) now and then and `restore` to load it back.

## How the code is organized

Every widget is a class with `start()` and `stop()`, optionally `setSaver(on)`. `main.ts` creates the ones you enabled, calls `setSaver` with the saved state, then `start()`. It also stops them all when the tab is hidden. Names follow Luau habits: camelCase for variables and methods, PascalCase for classes and types, UPPER_SNAKE_CASE for constants.

**Adding a widget.** Say a line of text under the clock.

1. `src/modules/motto.ts`

```ts
import type { Widget } from "../types";

export class Motto implements Widget {
  name = "motto";
  private mount: HTMLElement;

  constructor(mount: HTMLElement) {
    this.mount = mount;
  }

  start(): void {
    this.mount.textContent = "one task at a time";
  }

  stop(): void {}
}
```

2. Add `<div id="motto"></div>` to `public/index.html`.
3. In `main.ts`, import it and add `const mottoMount = findEl("motto"); if (mottoMount) widgets.push(new Motto(mottoMount));`.
4. Style it in `style.css`.

**Coming from Luau.**

| Luau | TypeScript |
| --- | --- |
| `local x = 1` | `let x = 1` or `const x = 1` |
| `nil` | `null` or `undefined` |
| `~=` and `..` | `!==` and template strings like `` `hi ${name}` `` |
| `for _, v in ipairs(t)` | `for (const v of list)` |
| `t[#t + 1] = v` | `list.push(v)` |
| `type Item = { name: string }` | `interface Item { name: string }` |
| `self:update()` | `this.update()` |
| `part.Touched:Connect(fn)` | `button.addEventListener("click", fn)` |
| `task.wait(1)` | `setTimeout(fn, 1000)` |

The big gotcha: arrays start at 0, not 1.

## Learning resources

I checked that each of these loads and what it covers. They are free unless noted.

HTML
- [web.dev: Learn HTML](https://web.dev/learn/html), a course from the Chrome team and contributors, covering document structure, semantic HTML, text, links, lists, tables, forms, images, media, and dialogs
- [MDN: Structuring content with HTML](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content), beginner module covering the same ground with exercises
- [MDN: HTML elements reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements), every element grouped by purpose, good for looking things up
- [W3C Markup Validation Service](https://validator.w3.org/), paste or upload your HTML to catch mistakes

This project's `index.html` is small on purpose. The interesting elements it relies on are `<details>` (the expandable lists), `<dialog>` (the edit popup), `<form>` and `<input>` (search), and `<canvas>` (rain). Look each one up in the MDN reference.

Start here
- [MDN: Learn web development](https://developer.mozilla.org/en-US/docs/Learn_web_development), structured beginner path from Mozilla
- [The Odin Project: Foundations](https://www.theodinproject.com/paths/foundations/courses/foundations), hands-on HTML, CSS, Git and JavaScript basics
- [javascript.info](https://javascript.info/), modern JavaScript from scratch
- [freeCodeCamp](https://www.freecodecamp.org/learn), interactive lessons

TypeScript
- [TypeScript for the New Programmer](https://www.typescriptlang.org/docs/handbook/typescript-from-scratch.html)
- [TypeScript for JavaScript Programmers](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html)
- [TypeScript Playground](https://www.typescriptlang.org/play), try snippets in the browser

CSS and the browser
- [web.dev: Learn CSS](https://web.dev/learn/css), box model, flexbox, grid, gradients
- [Firefox Developer Tools docs](https://firefox-source-docs.mozilla.org/devtools-user/), press F12 on the page to inspect elements and see errors in the console

Tools and services used here
- [esbuild: getting started](https://esbuild.github.io/getting-started/), the bundler in `build.mjs`
- [Open-Meteo docs](https://open-meteo.com/en/docs), the weather API, no key needed for non-commercial use
- [GitHub Pages: publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [Firefox: set your homepage](https://support.mozilla.org/en-US/kb/how-to-set-the-home-page)
- [New Tab Override](https://addons.mozilla.org/addon/new-tab-override/), for new tabs
- [Node.js](https://nodejs.org/) and [VS Code](https://code.visualstudio.com/), the runtime and a free editor

A good order: work through web.dev's Learn HTML while you tweak `index.html`, skim the MDN modules for CSS, read javascript.info while you edit `config.ts`, then TypeScript for the New Programmer and try adding the motto widget above.
