import { nanoid } from 'nanoid';

// ─── Human Captcha: Letter-counting puzzles rendered as masked SVG ───

interface CaptchaChallenge {
  token: string;
  answer: string;
}

interface HumanCaptcha extends CaptchaChallenge {
  svg: string;
}

interface AgentCaptcha extends CaptchaChallenge {
  challenge: string;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── Pixel font: 5x7 dot matrix for each character (no <text> elements) ───
// Each char is a 5-wide × 7-tall grid. 1 = filled, 0 = empty.
const PIXEL_FONT: Record<string, number[][]> = {
  'a': [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
  ],
  'b': [
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 0],
  ],
  'c': [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  'd': [
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 0],
  ],
  'e': [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 1],
  ],
  'f': [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
  ],
  'g': [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 0],
    [1, 0, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  'h': [
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
  ],
  'i': [
    [1, 1, 1, 1, 1],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [1, 1, 1, 1, 1],
  ],
  'j': [
    [0, 0, 1, 1, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 1, 0],
    [1, 0, 0, 1, 0],
    [1, 0, 0, 1, 0],
    [0, 1, 1, 0, 0],
  ],
  'k': [
    [1, 0, 0, 0, 1],
    [1, 0, 0, 1, 0],
    [1, 0, 1, 0, 0],
    [1, 1, 0, 0, 0],
    [1, 0, 1, 0, 0],
    [1, 0, 0, 1, 0],
    [1, 0, 0, 0, 1],
  ],
  'l': [
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 1],
  ],
  'm': [
    [1, 0, 0, 0, 1],
    [1, 1, 0, 1, 1],
    [1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
  ],
  'n': [
    [1, 0, 0, 0, 1],
    [1, 1, 0, 0, 1],
    [1, 0, 1, 0, 1],
    [1, 0, 0, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
  ],
  'o': [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  'p': [
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
  ],
  'q': [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 1, 0, 1],
    [1, 0, 0, 1, 0],
    [0, 1, 1, 0, 1],
  ],
  'r': [
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 0],
    [1, 0, 1, 0, 0],
    [1, 0, 0, 1, 0],
    [1, 0, 0, 0, 1],
  ],
  's': [
    [0, 1, 1, 1, 1],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [0, 1, 1, 1, 0],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
    [1, 1, 1, 1, 0],
  ],
  't': [
    [1, 1, 1, 1, 1],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
  ],
  'u': [
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  'v': [
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0],
    [0, 0, 1, 0, 0],
  ],
  'w': [
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1],
    [1, 1, 0, 1, 1],
    [1, 0, 0, 0, 1],
  ],
  'x': [
    [1, 0, 0, 0, 1],
    [0, 1, 0, 1, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 0, 1, 0],
    [1, 0, 0, 0, 1],
  ],
  'y': [
    [1, 0, 0, 0, 1],
    [0, 1, 0, 1, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
  ],
  'z': [
    [1, 1, 1, 1, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 1],
  ],
  ' ': [
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
  ],
  '"': [
    [0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
  ],
  '=': [
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 0],
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
  ],
  '?': [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 1, 0, 0],
  ],
  '0': [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 1, 1],
    [1, 0, 1, 0, 1],
    [1, 1, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  '1': [
    [0, 0, 1, 0, 0],
    [0, 1, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 1, 1, 0],
  ],
  '2': [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
    [0, 0, 1, 1, 0],
    [0, 1, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 1],
  ],
  '3': [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
    [0, 0, 1, 1, 0],
    [0, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  '4': [
    [0, 0, 0, 1, 0],
    [0, 0, 1, 1, 0],
    [0, 1, 0, 1, 0],
    [1, 0, 0, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 1, 0],
  ],
  '5': [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 0],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  '6': [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  '7': [
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
  ],
  '8': [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  '9': [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 1],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
};

// ─── SVG rendering with pixel font (no <text> elements) ───

function generateNoiseLine(width: number, height: number): string {
  const x1 = randomInt(0, width);
  const y1 = randomInt(0, height);
  const x2 = randomInt(0, width);
  const y2 = randomInt(0, height);
  const colors = ['#666', '#888', '#aaa', '#999', '#777'];
  const color = colors[randomInt(0, colors.length - 1)];
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${randomInt(1, 2)}" opacity="${(randomInt(3, 7) / 10).toFixed(1)}"/>`;
}

function generateNoiseCircle(width: number, height: number): string {
  const cx = randomInt(0, width);
  const cy = randomInt(0, height);
  const r = randomInt(2, 8);
  const colors = ['#666', '#888', '#aaa', '#bbb'];
  const color = colors[randomInt(0, colors.length - 1)];
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="1" opacity="${(randomInt(2, 5) / 10).toFixed(1)}"/>`;
}

function renderCharPixels(char: string, offsetX: number, offsetY: number, pixelSize: number): string {
  const grid = PIXEL_FONT[char.toLowerCase()];
  if (!grid) return ''; // Unknown char — skip

  let result = '';
  const jitter = Math.max(0, Math.floor(pixelSize * 0.25));

  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (grid[row][col]) {
        const x = offsetX + col * pixelSize + randomInt(-jitter, jitter);
        const y = offsetY + row * pixelSize + randomInt(-jitter, jitter);
        const size = pixelSize + randomInt(-1, 1);
        const colors = ['#111', '#222', '#333', '#1a1a1a', '#2a2a2a'];
        const fill = colors[randomInt(0, colors.length - 1)];

        // Mix shapes: rects and circles for more organic look
        if (randomInt(0, 2) === 0) {
          result += `<circle cx="${x + size / 2}" cy="${y + size / 2}" r="${size / 2}" fill="${fill}"/>`;
        } else {
          const rx = randomInt(0, 2);
          result += `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${fill}" rx="${rx}"/>`;
        }
      }
    }
  }
  return result;
}

function renderMaskedSvg(text: string): string {
  const maxWidth = 380;
  const padding = 24;

  // Auto-scale pixel size to fit within maxWidth
  const availableWidth = maxWidth - padding;
  // charWidth = 5 * pixelSize + spacing, we need text.length * charWidth <= availableWidth
  // Start with pixelSize=3, reduce if needed
  let pixelSize = 3;
  while (pixelSize > 1 && text.length * (5 * pixelSize + Math.max(2, pixelSize)) > availableWidth) {
    pixelSize--;
  }

  const charSpacing = Math.max(2, pixelSize);
  const charWidth = 5 * pixelSize + charSpacing;
  const charHeight = 7 * pixelSize;

  const width = Math.min(maxWidth, text.length * charWidth + padding);
  const height = charHeight + 20;

  let svgContent = '';

  // Background
  svgContent += `<rect width="${width}" height="${height}" fill="#f5f5f0" rx="4"/>`;

  // Noise lines (behind text)
  for (let i = 0; i < 8; i++) {
    svgContent += generateNoiseLine(width, height);
  }

  // Noise circles
  for (let i = 0; i < 5; i++) {
    svgContent += generateNoiseCircle(width, height);
  }

  // Render each character as pixel art
  const totalWidth = text.length * charWidth;
  const startX = Math.max(8, Math.floor((width - totalWidth) / 2));
  const startY = Math.floor((height - charHeight) / 2);

  for (let i = 0; i < text.length; i++) {
    svgContent += renderCharPixels(text[i], startX + i * charWidth, startY, pixelSize);
  }

  // More noise on top
  for (let i = 0; i < 4; i++) {
    svgContent += generateNoiseLine(width, height);
  }
  for (let i = 0; i < 3; i++) {
    svgContent += generateNoiseCircle(width, height);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${svgContent}</svg>`;
}

// ─── Human captcha generators (letter counting only) ───

interface LetterCountPair {
  word: string;
  letter: string;
}

const letterCountPairs: LetterCountPair[] = [
  { word: 'programming', letter: 'g' },
  { word: 'programming', letter: 'm' },
  { word: 'programming', letter: 'r' },
  { word: 'mississippi', letter: 's' },
  { word: 'mississippi', letter: 'i' },
  { word: 'mississippi', letter: 'p' },
  { word: 'accessibility', letter: 'i' },
  { word: 'accessibility', letter: 'c' },
  { word: 'communication', letter: 'm' },
  { word: 'communication', letter: 'c' },
  { word: 'infrastructure', letter: 'r' },
  { word: 'infrastructure', letter: 't' },
  { word: 'authentication', letter: 't' },
  { word: 'authentication', letter: 'a' },
  { word: 'parallel', letter: 'l' },
  { word: 'parallel', letter: 'a' },
  { word: 'occurrence', letter: 'c' },
  { word: 'occurrence', letter: 'r' },
  { word: 'committee', letter: 't' },
  { word: 'committee', letter: 'e' },
  { word: 'collaboration', letter: 'o' },
  { word: 'collaboration', letter: 'l' },
  { word: 'application', letter: 'p' },
  { word: 'application', letter: 'a' },
  { word: 'environment', letter: 'n' },
  { word: 'environment', letter: 'e' },
  { word: 'performance', letter: 'e' },
  { word: 'performance', letter: 'r' },
  { word: 'development', letter: 'e' },
  { word: 'development', letter: 'l' },
];

export function generateHumanCaptcha(): HumanCaptcha {
  const pair = letterCountPairs[randomInt(0, letterCountPairs.length - 1)];
  const count = (pair.word.match(new RegExp(pair.letter, 'g')) || []).length;

  // Display text: "g" in programming = ?
  const text = `"${pair.letter}" in ${pair.word} = ?`;
  const svg = renderMaskedSvg(text);

  return {
    token: nanoid(32),
    answer: String(count),
    svg,
  };
}

// ─── Agent Captcha: Text-based reasoning challenges ───

function getPrimesUpTo(n: number): number[] {
  const primes: number[] = [];
  for (let i = 2; primes.length < n; i++) {
    let isPrime = true;
    for (let j = 2; j <= Math.sqrt(i); j++) {
      if (i % j === 0) { isPrime = false; break; }
    }
    if (isPrime) primes.push(i);
  }
  return primes;
}

function fibonacci(n: number): number {
  if (n <= 1) return n;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    const tmp = a + b;
    a = b;
    b = tmp;
  }
  return b;
}

const agentChallenges: Array<() => { challenge: string; answer: string }> = [
  // String reversal
  () => {
    const words = ['algorithm', 'function', 'variable', 'database', 'protocol', 'endpoint', 'framework', 'pipeline', 'callback', 'instance'];
    const word = words[randomInt(0, words.length - 1)];
    return {
      challenge: `Reverse the following string: "${word}"`,
      answer: word.split('').reverse().join(''),
    };
  },
  // Letter counting
  () => {
    const words = ['mississippi', 'programming', 'accessibility', 'authentication', 'communication', 'infrastructure'];
    const word = words[randomInt(0, words.length - 1)];
    const targetLetters = [...new Set(word.split(''))].filter(l => (word.match(new RegExp(l, 'g')) || []).length > 1);
    const letter = targetLetters[randomInt(0, targetLetters.length - 1)];
    const count = (word.match(new RegExp(letter, 'g')) || []).length;
    return {
      challenge: `How many times does the letter "${letter}" appear in "${word}"? Answer with just the number.`,
      answer: String(count),
    };
  },
  // Sequence completion
  () => {
    const sequences: Array<{ items: string[]; next: string }> = [
      { items: ['2', '4', '8', '16'], next: '32' },
      { items: ['1', '1', '2', '3', '5'], next: '8' },
      { items: ['3', '6', '9', '12'], next: '15' },
      { items: ['1', '4', '9', '16'], next: '25' },
      { items: ['2', '6', '12', '20'], next: '30' },
      { items: ['100', '81', '64', '49'], next: '36' },
    ];
    const seq = sequences[randomInt(0, sequences.length - 1)];
    return {
      challenge: `What comes next in this sequence? ${seq.items.join(', ')}, ___. Answer with just the number.`,
      answer: seq.next,
    };
  },
  // Simple code evaluation
  () => {
    const a = randomInt(2, 10);
    const b = randomInt(2, 10);
    return {
      challenge: `What does this expression evaluate to? (${a} * ${b}) + ${a} - ${b}. Answer with just the number.`,
      answer: String((a * b) + a - b),
    };
  },
  // ASCII value
  () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const letter = letters[randomInt(0, 25)];
    return {
      challenge: `What is the ASCII code of the uppercase letter "${letter}"? Answer with just the number.`,
      answer: String(letter.charCodeAt(0)),
    };
  },

  // ─── Harder challenges requiring genuine reasoning ───

  // Sum of first N primes
  () => {
    const n = randomInt(5, 10);
    const primes = getPrimesUpTo(n);
    const sum = primes.reduce((a, b) => a + b, 0);
    return {
      challenge: `What is the sum of the first ${n} prime numbers? Answer with just the number.`,
      answer: String(sum),
    };
  },
  // Logic puzzle — syllogisms
  () => {
    const puzzles = [
      {
        challenge: 'If all bloops are razzies and all razzies are lazzies, are all bloops lazzies? Answer "yes" or "no".',
        answer: 'yes',
      },
      {
        challenge: 'If all zippers are flonks and some flonks are brips, are all zippers brips? Answer "yes" or "no".',
        answer: 'no',
      },
      {
        challenge: 'If no wumpus is a tove and all toves are borogoves, can a wumpus be a borogove? Answer "yes" or "no".',
        answer: 'yes',
      },
      {
        challenge: 'If all glorps are snazzles and no snazzles are frumps, are any glorps frumps? Answer "yes" or "no".',
        answer: 'no',
      },
      {
        challenge: 'If some plinkos are dwerbs, and all dwerbs are quozzles, are some plinkos quozzles? Answer "yes" or "no".',
        answer: 'yes',
      },
    ];
    return puzzles[randomInt(0, puzzles.length - 1)];
  },
  // Fibonacci evaluation — code reasoning
  () => {
    const n = randomInt(6, 10);
    const result = fibonacci(n);
    return {
      challenge: `What does this function return? function f(n) { return n <= 1 ? n : f(n-1) + f(n-2); } f(${n}). Answer with just the number.`,
      answer: String(result),
    };
  },
  // Complex sequence with twist
  () => {
    const puzzles = [
      { challenge: 'What comes next? 1, 3, 6, 10, 15, 21, ___. Answer with just the number.', answer: '28' },
      { challenge: 'What comes next? 1, 2, 5, 14, 42, ___. Answer with just the number.', answer: '132' },
      { challenge: 'What comes next? 3, 9, 27, 81, 243, ___. Answer with just the number.', answer: '729' },
      { challenge: 'What comes next? 1, 2, 6, 24, 120, ___. Answer with just the number.', answer: '720' },
    ];
    return puzzles[randomInt(0, puzzles.length - 1)];
  },
  // Multi-step arithmetic
  () => {
    const a = randomInt(3, 9);
    const b = randomInt(2, 5);
    const power = Math.pow(a, b);
    const sub = randomInt(10, 50);
    return {
      challenge: `Calculate ${a}^${b} - ${sub}. Answer with just the number.`,
      answer: String(power - sub),
    };
  },
];

export function generateAgentCaptcha(): AgentCaptcha {
  const generator = agentChallenges[randomInt(0, agentChallenges.length - 1)];
  const { challenge, answer } = generator();
  return {
    token: nanoid(32),
    challenge,
    answer,
  };
}

export function validateCaptchaAnswer(expected: string, provided: string): boolean {
  return expected.trim().toLowerCase() === provided.trim().toLowerCase();
}
