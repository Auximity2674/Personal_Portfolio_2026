## Files

| Path | What it is |
| --- | --- |
| `index.html` | All content (SEO-indexable, works without JS) |
| `css/style.css` | Design tokens at the top (`:root`), then one block per section |
| `js/main.js` | Motion layer: GSAP + ScrollTrigger + Lenis, portrait glitch, case-study overlay, skills matrix |
| `js/loader.js` | Loading screen: particle "Hello, world" in several languages, ending on "Halo, dunia". Edit the `GREETINGS` list to change languages |
| `js/background.js` | Animated WebGL background (smoke, dot grid, scanner sweep); colours are in the shader near the top |
| `js/cradle.js` | Interactive Newton's cradle in the About section |
| `assets/img/projects/` | Case-study gallery images |
| `assets/cv/Arsyad-Rizantha-CV.pdf` | CV, generated from `cv-source/resume.html`. Not linked from the site at the moment; add a link like `<a class="btn" href="assets/cv/Arsyad-Rizantha-CV.pdf" download>Download CV</a>` to bring it back |
| `assets/img/og.png` | Social share card, generated from `cv-source/og.html` |

## Before publishing

Search the project for `EDIT:` and fill in each placeholder:

- GitHub and LinkedIn URLs (contact section, project links, CV)
- Repository URLs for each project (delete the GitHub link where a repo is private)
- UsahaOne's exact tech stack
- Internship dates, study years, GPA (optional)
- Real certifications (the two dashed placeholder cards)
- Canonical URL in `<head>` once you have a domain
- Skill-to-project mapping: each `.skill` button has `data-used="..."`. Check it matches what you actually used.

Replace the illustrated previews with real screenshots if you have them: swap the `<svg>` inside a project's `<figure class="pv">` for an `<img>`.

## After editing CSS or JS

`index.html` loads them with a version tag, e.g. `css/style.css?v=2026-11-10b`. Change that tag (all five places) whenever you edit those files, so visitors' browsers load the new version instead of a cached one.

## Regenerate the CV and share image

After editing `cv-source/resume.html` or `cv-source/og.html`, run the static server from this folder, then:

```bash
"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --no-pdf-header-footer --virtual-time-budget=8000 --print-to-pdf="assets/cv/Arsyad-Rizantha-CV.pdf" "http://localhost:5173/cv-source/resume.html"
```

```bash
"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --hide-scrollbars --window-size=1200,630 --virtual-time-budget=8000 --screenshot="assets/img/og.png" "http://localhost:5173/cv-source/og.html"
```

## Accessibility and motion

- `prefers-reduced-motion: reduce` turns off the loader, smooth scroll, pinning, and all animation. The page is fully static and readable.
- If the CDN scripts fail, the page falls back to the same static mode (the loader auto-dismisses after 7s at most).
- The background renders one still frame under reduced motion, pauses when the tab is hidden, and falls back to plain black without WebGL.
