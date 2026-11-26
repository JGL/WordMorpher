# WordMorpher
A way of morphing between any two words

A [p5.js](https://p5js.org/) sketch that uses the [RiTa](https://rednoise.org/rita/) library to morph from one word to another, a syllable at a time:

Helena → Halena → Halemer → Hammer

## Running it

The sketch lives in the `docs` folder, so it can be published with GitHub Pages (in the repo's Settings → Pages, deploy from the `main` branch and the `/docs` folder).

To run it locally, open `docs/index.html` in a browser, or serve the folder with any local web server, e.g.

```bash
python3 -m http.server 8765 --bind 127.0.0.1 --directory docs
```

and visit http://localhost:8765. p5.js and RiTa are loaded from a CDN, so you need to be online.

Type two words and press Morph (or Enter), or press Random to morph between two random words from RiTa's dictionary. Swap morphs back the other way. Syllables from the first word are drawn in ink, syllables from the second in red.

## How it works

- `docs/morpher.js` – the morphing logic. Asks RiTa for the syllables of each word (which come back as sounds, e.g. `hh-ae/m-er`), works out which letters spell each sound, and then swaps syllables of the second word into the first from the outside in: first syllable, last syllable, second syllable, second to last... Any syllables of the first word left over in the middle are then dropped one at a time. If either word has only one syllable, that first swap would bring in (or take away) a whole word in one jump, so the first syllable is swapped a piece at a time instead: its start, then its end, then its vowel. That gives sprung → wung → wust → worst, and misplace → grisplace → grithplace → growthplace → growth.
- `docs/sketch.js` – the p5.js sketch that animates the steps.
- `docs/index.html` – the page that loads p5.js, RiTa and the two files above.
- `CONVERSATION_LOG.md` – a record of the prompts and responses used to make this project with Claude.
