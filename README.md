# WordMorpher
A way of morphing between any two words

A [p5.js](https://p5js.org/) sketch that uses the [RiTa](https://rednoise.org/rita/) library to morph from one word to another, a syllable at a time:

Helena → Halena → Halemer → Hammer

## Running it

Open `index.html` in a browser, or serve the folder with any local web server, e.g.

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

and visit http://localhost:8765. p5.js and RiTa are loaded from a CDN, so you need to be online.

Type two words and press Morph (or Enter). Syllables from the first word are drawn in ink, syllables from the second in red.

## How it works

- `morpher.js` – the morphing logic. Asks RiTa for the syllables of each word (which come back as sounds, e.g. `hh-ae/m-er`), works out which letters spell each sound, and then swaps syllables of the second word into the first from the outside in: first syllable, last syllable, second syllable, second to last... Any syllables of the first word left over in the middle are then dropped one at a time.
- `sketch.js` – the p5.js sketch that animates the steps.
- `CONVERSATION_LOG.md` – a record of the prompts and responses used to make this project with Claude.
