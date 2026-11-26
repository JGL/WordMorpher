// WordMorpher sketch: animates the steps worked out by morpher.js.
//
// Type two words, press Morph (or Enter). Syllables that came from the
// first word are drawn in ink, syllables from the second word in red.

const HOLD_TIME = 1400; // how long each word rests on screen (ms)
const MOVE_TIME = 900; // how long each change takes (ms)
const END_HOLD_TIME = 3000; // how long the final word rests before looping

const PAPER = "#f6f1e7";
const INK = [43, 38, 32];
const RED = [208, 62, 38];

let sourceInput;
let targetInput;

let steps = []; // the words to pass through, from WordMorpher.morphSteps()
let stepIndex = 0; // the step currently resting (or being left)
let stepStart = 0; // when we arrived at it (ms)

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont("Georgia");

  // RiTa guesses the pronunciation of words it doesn't know (like names),
  // and logs a message each time. We don't need to hear about it.
  RiTa.SILENCE_LTS = true;

  sourceInput = createInput("Helena").parent("controls");
  createSpan("→").parent("controls");
  targetInput = createInput("Hammer").parent("controls");
  createButton("Morph").parent("controls").mousePressed(startMorph);
  createButton("Swap").parent("controls").mousePressed(swapWords);

  sourceInput.attribute("aria-label", "Word to morph from");
  targetInput.attribute("aria-label", "Word to morph to");
  for (const input of [sourceInput, targetInput]) {
    input.elt.addEventListener("keydown", (event) => {
      if (event.key === "Enter") startMorph();
    });
  }

  startMorph();
}

function startMorph() {
  const source = WordMorpher.clean(sourceInput.value());
  const target = WordMorpher.clean(targetInput.value());
  if (source === "" || target === "") {
    steps = [];
    return;
  }
  steps = WordMorpher.morphSteps(source, target, RiTa);
  stepIndex = 0;
  stepStart = millis();
  console.log(steps.map((step) => step.word).join(" -> "));
}

function swapWords() {
  const source = sourceInput.value();
  sourceInput.value(targetInput.value());
  targetInput.value(source);
  startMorph();
}

function draw() {
  background(PAPER);
  noStroke();

  if (steps.length === 0) {
    fill(INK[0], INK[1], INK[2], 120);
    textAlign(CENTER, CENTER);
    textSize(24);
    text("Type two words to morph between", width / 2, height / 2);
    return;
  }

  // Where are we in the sequence?
  const isLast = stepIndex === steps.length - 1;
  const elapsed = millis() - stepStart;
  let progress = 0; // 0 = resting on this step, 1 = arrived at the next
  if (isLast) {
    if (elapsed > END_HOLD_TIME) {
      stepIndex = 0;
      stepStart = millis();
    }
  } else if (elapsed > HOLD_TIME) {
    progress = (elapsed - HOLD_TIME) / MOVE_TIME;
    if (progress >= 1) {
      stepIndex++;
      stepStart = millis();
      progress = 0;
    }
  }

  drawWord(progress);
  drawTrail(progress);
}

// The big word in the middle, part way between two steps.
function drawWord(progress) {
  const current = steps[stepIndex];
  const next = steps[min(stepIndex + 1, steps.length - 1)];

  // Make the text as big as will fit the longest word in the sequence.
  let size = min(160, height * 0.3);
  textSize(size);
  let widest = 0;
  for (const step of steps) widest = max(widest, textWidth(step.word));
  if (widest > width * 0.85) size *= (width * 0.85) / widest;
  textSize(size);
  textAlign(LEFT, BASELINE);

  const before = layOut(current);
  const after = layOut(next);
  const eased = easeInOut(progress);
  const y = height / 2 + size * 0.3;

  // Syllables in the current word: either sliding to their new place,
  // or (if they aren't in the next word) floating up and fading out.
  for (const part of before) {
    const destination = after.find((other) => other.key === part.key);
    if (destination) {
      drawPart(part, lerp(part.x, destination.x, eased), y, 255);
    } else {
      const leaving = constrain(eased * 2, 0, 1);
      drawPart(part, part.x, y - leaving * size * 0.35, 255 * (1 - leaving));
    }
  }
  // Syllables that are new in the next word rise up and fade in.
  for (const part of after) {
    if (before.some((other) => other.key === part.key)) continue;
    const arriving = constrain(eased * 2 - 1, 0, 1);
    drawPart(part, part.x, y + (1 - arriving) * size * 0.35, 255 * arriving);
  }
}

// Work out where each syllable of a step sits when the word is centred.
function layOut(step) {
  let x = (width - textWidth(step.word)) / 2;
  const placed = [];
  for (const part of step.parts) {
    placed.push({
      key: part.from + part.index + part.text,
      text: part.text,
      from: part.from,
      x: x,
    });
    x += textWidth(part.text);
  }
  return placed;
}

function drawPart(part, x, y, alpha) {
  const colour = part.from === "source" ? INK : RED;
  fill(colour[0], colour[1], colour[2], alpha);
  text(part.text, x, y);
}

// The whole sequence in small type along the bottom:
// Helena → Halena → Halemer → Hammer
function drawTrail(progress) {
  const arrow = "  →  ";
  const line = steps.map((step) => step.word).join(arrow);

  let size = 22;
  textSize(size);
  if (textWidth(line) > width * 0.9) size *= (width * 0.9) / textWidth(line);
  textSize(size);
  textAlign(LEFT, BASELINE);

  let x = (width - textWidth(line)) / 2;
  const y = height - 48;
  for (let i = 0; i < steps.length; i++) {
    // Words we haven't reached yet are faint.
    let reached = 0;
    if (i <= stepIndex) reached = 1;
    else if (i === stepIndex + 1) reached = progress;
    const alpha = lerp(50, 255, reached);

    if (i > 0) {
      fill(INK[0], INK[1], INK[2], alpha * 0.6);
      text(arrow, x, y);
      x += textWidth(arrow);
    }
    for (const part of steps[i].parts) {
      drawPart(part, x, y, alpha);
      x += textWidth(part.text);
    }
  }
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - pow(-2 * t + 2, 2) / 2;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
