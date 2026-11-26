// WordMorpher: morph between any two words, one syllable at a time.
//
// RiTa gives us the syllables of a word as *phonemes* (sounds), e.g.
//   RiTa.syllables("hammer") -> "hh-ae/m-er"
// but to morph the written word we need the syllables as *letters*:
//   "ha" + "mmer"
// So the work here happens in three stages:
//   1. alignPhonesToLetters() - work out which letters spell each phoneme
//   2. syllabify()            - use that to cut the written word into syllables
//   3. morphSteps()           - swap syllables from the outside in
//
// This file has no dependency on p5.js: sketch.js does all the drawing.

const WordMorpher = (() => {
  // The ways each of RiTa's phonemes (ARPAbet) is commonly spelled in English.
  // It doesn't need to be complete: anything not listed still gets aligned,
  // just with a higher cost (see graphemeCost below).
  const SPELLINGS = {
    aa: "a o ah au aw ea",
    ae: "a ai au",
    ah: "a e i o u y ou io ia eo ai oo oe",
    ao: "o a au aw ou oa oo augh ough",
    aw: "ou ow au ough",
    ay: "i y ie igh ei ai uy ye eye eigh ui",
    eh: "e ea a ai ie ay u ei eo ae",
    er: "er ir ur or ar ear our re yr urr err irr r eur ure ere",
    ey: "a ai ay ei ey ea eigh e et ee au aigh",
    ih: "i y e ui a u o ee ie ia ei",
    iy: "e ee ea y i ie ei ey eo oe ae",
    ow: "o oa ow oe ou ough eau oh ew au oo",
    oy: "oi oy uoy",
    uh: "oo u ou o eu",
    uw: "oo u ue ew o ou ui oe eu ough wo eau ieu iew",
    b: "b bb",
    ch: "ch tch t c cz ti te",
    d: "d dd ed ld",
    dh: "th the",
    f: "f ff ph gh lf ft",
    g: "g gg gh gu gue x",
    hh: "h wh j",
    jh: "j g dg dge ge d gg dj di",
    k: "c k ck cc ch q qu x kk cq que lk kh",
    l: "l ll le el",
    m: "m mm mb mn lm gm",
    n: "n nn kn gn pn mn",
    ng: "ng n ngue",
    p: "p pp",
    r: "r rr wr rh rrh",
    s: "s ss c sc ps st z sw",
    sh: "sh ti ci ssi si ch s ss sci c xi sch t",
    t: "t tt ed th pt bt ct tte d",
    th: "th tth",
    v: "v f vv ph w",
    w: "w wh u o ou",
    y: "y i j e ll",
    z: "z zz s ss x",
    zh: "s si g z ge j su zi ti",
  };
  const GRAPHEMES = {};
  for (const phone in SPELLINGS) {
    GRAPHEMES[phone] = new Set(SPELLINGS[phone].split(" "));
  }

  const VOWEL_PHONES = new Set(
    "aa ae ah ao aw ay eh er ey ih iy ow oy uh uw".split(" ")
  );
  const LONGEST_GRAPHEME = 4; // e.g. "ough", "eigh"

  // How bad is it to say that `letters` spells `phone`? 0 is a perfect match.
  function graphemeCost(phone, letters) {
    // A phoneme with no letters of its own, like the "s" sound hidden
    // inside the x of "taxi" (t-ae-k-s-iy).
    if (letters === "") return 3.5;

    const known = GRAPHEMES[phone];
    if (known && known.has(letters)) return 0;

    const isVowelPhone = VOWEL_PHONES.has(phone);

    // Silent e after a consonant, as in the "ke" of "make".
    if (
      !isVowelPhone &&
      letters.length > 1 &&
      letters.endsWith("e") &&
      known &&
      known.has(letters.slice(0, -1))
    ) {
      return 0.5;
    }

    // An unknown spelling. It's more believable if vowel sounds are
    // spelled with vowel letters and consonant sounds with consonants.
    const allVowels = /^[aeiouy]+$/.test(letters);
    const noVowels = /^[^aeiou]+$/.test(letters);
    const sameKind = isVowelPhone ? allVowels : noVowels;
    return sameKind
      ? 2 + 1.5 * (letters.length - 1)
      : 4 + 2 * letters.length;
  }

  // Work out which letters of `word` spell each phoneme in `phones`.
  // Returns one [start, end) pair of letter positions per phoneme.
  // Every letter ends up belonging to exactly one phoneme.
  //
  // This is a classic dynamic-programming alignment: best[p][l] is the
  // cheapest way of spelling the first p phonemes with the first l letters.
  function alignPhonesToLetters(word, phones) {
    const P = phones.length;
    const L = word.length;
    const best = [];
    const taken = []; // how many letters phoneme p used, on the best path
    for (let p = 0; p <= P; p++) {
      best.push(new Array(L + 1).fill(Infinity));
      taken.push(new Array(L + 1).fill(0));
    }
    best[0][0] = 0;

    for (let p = 1; p <= P; p++) {
      for (let l = 0; l <= L; l++) {
        // The last phoneme has to soak up any letters left over.
        const longest = p === P ? l : Math.min(l, LONGEST_GRAPHEME);
        for (let n = 0; n <= longest; n++) {
          if (best[p - 1][l - n] === Infinity) continue;
          const cost =
            best[p - 1][l - n] +
            graphemeCost(phones[p - 1], word.slice(l - n, l));
          if (cost < best[p][l]) {
            best[p][l] = cost;
            taken[p][l] = n;
          }
        }
      }
    }

    // Walk backwards from the end to read off the best path.
    const spans = new Array(P);
    let l = L;
    for (let p = P; p >= 1; p--) {
      const n = taken[p][l];
      spans[p - 1] = [l - n, l];
      l -= n;
    }
    return spans;
  }

  // Keep only the letters of whatever was typed in.
  function clean(word) {
    return String(word).replace(/[^\p{L}]/gu, "");
  }

  // Cut a written word into syllables, e.g. "Helena" -> ["He", "le", "na"].
  // `rita` is the RiTa object (passed in so this also works in Node).
  function syllabify(word, rita) {
    word = clean(word);
    if (word === "") return [];
    const lower = word.toLowerCase();

    // "hh-ae/m-er" -> [["hh", "ae"], ["m", "er"]]
    let phoneSyllables = [];
    try {
      phoneSyllables = rita
        .syllables(lower)
        .split(/[\/\s]+/)
        .filter((s) => s.length > 0)
        .map((s) => s.split("-"));
    } catch (e) {
      // fall through: treat the word as a single syllable
    }
    if (phoneSyllables.length < 2) return [word];

    const phones = phoneSyllables.flat();
    const spans = alignPhonesToLetters(lower, phones);

    // A syllable starts where its first phoneme starts.
    const starts = [];
    let p = 0;
    for (const syllable of phoneSyllables) {
      starts.push(spans[p][0]);
      p += syllable.length;
    }
    starts[0] = 0;

    const syllables = [];
    for (let i = 0; i < starts.length; i++) {
      const end = i + 1 < starts.length ? starts[i + 1] : word.length;
      // (slices of the original word, so capital letters are kept)
      if (end > starts[i]) syllables.push(word.slice(starts[i], end));
    }
    return syllables;
  }

  // When a syllable is lifted out of its word, a doubled consonant at its
  // start no longer makes sense: the last syllable of "ha|mmer" is "mer".
  function undouble(text) {
    if (
      text.length > 2 &&
      text[0].toLowerCase() === text[1].toLowerCase() &&
      !/[aeiou]/i.test(text[0])
    ) {
      return text.slice(1);
    }
    return text;
  }

  // The sequence of words that morphs `source` into `target`.
  //
  // Each step is { word, parts }, where parts is the list of syllables
  // making up the word: { text, from: "source" | "target", index }.
  //
  // Syllables of the target replace syllables of the source from the
  // outside in: first syllable, then last, then second, then second to
  // last... and any source syllables left over in the middle are then
  // dropped one at a time.
  //
  //   Helena -> Hammer
  //   He|le|na   the source
  //   Ha|le|na   first syllable replaced by the first of Hammer
  //   Ha|le|mer  last syllable replaced by the last of Hammer
  //   Ha|mmer    left over middle syllable dropped
  function morphSteps(source, target, rita) {
    const S = syllabify(source, rita);
    const T = syllabify(target, rita);

    let front = 0; // how many target syllables are in place at the front
    let back = 0; // ...and at the back
    let lo = 0; // the source syllables still left are S[lo] to S[hi - 1]
    let hi = S.length;

    function snapshot() {
      const parts = [];
      for (let i = 0; i < front; i++) {
        parts.push({ text: T[i], from: "target", index: i });
      }
      for (let i = lo; i < hi; i++) {
        parts.push({ text: S[i], from: "source", index: i });
      }
      for (let i = T.length - back; i < T.length; i++) {
        parts.push({ text: T[i], from: "target", index: i });
      }
      // Undouble any syllable that's been separated from the syllable
      // it normally follows.
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const previous = parts[i - 1];
        const stillAttached =
          part.index === 0 ||
          (previous &&
            previous.from === part.from &&
            previous.index === part.index - 1);
        if (!stillAttached) part.text = undouble(part.text);
      }
      return { word: parts.map((part) => part.text).join(""), parts };
    }

    const steps = [snapshot()];
    let fromFront = true;
    while (front + back < T.length || lo < hi) {
      if (fromFront) {
        if (front + back < T.length) front++;
        if (lo < hi) lo++;
      } else {
        if (front + back < T.length) back++;
        if (lo < hi) hi--;
      }
      fromFront = !fromFront;

      const step = snapshot();
      if (step.word !== steps[steps.length - 1].word) steps.push(step);
    }
    return steps;
  }

  return { syllabify, morphSteps, alignPhonesToLetters, clean };
})();

// Allow `require("./morpher.js")` in Node, for testing.
if (typeof module !== "undefined") module.exports = WordMorpher;
