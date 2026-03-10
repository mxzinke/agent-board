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
  // Fixed pixel size of 4 for readability — SVG scales in the UI via CSS max-width
  const pixelSize = 4;
  const charSpacing = 4;
  const charWidth = 5 * pixelSize + charSpacing;
  const charHeight = 7 * pixelSize;

  const width = text.length * charWidth + 32;
  const height = charHeight + 28;

  let svgContent = '';

  // Background
  svgContent += `<rect width="${width}" height="${height}" fill="#f5f5f0" rx="4"/>`;

  // Noise lines (behind text) — moderate noise for readability
  for (let i = 0; i < 5; i++) {
    svgContent += generateNoiseLine(width, height);
  }

  // Noise circles
  for (let i = 0; i < 3; i++) {
    svgContent += generateNoiseCircle(width, height);
  }

  // Render each character as pixel art
  const totalWidth = text.length * charWidth;
  const startX = Math.max(8, Math.floor((width - totalWidth) / 2));
  const startY = Math.floor((height - charHeight) / 2);

  for (let i = 0; i < text.length; i++) {
    svgContent += renderCharPixels(text[i], startX + i * charWidth, startY, pixelSize);
  }

  // Light noise on top
  for (let i = 0; i < 2; i++) {
    svgContent += generateNoiseLine(width, height);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${svgContent}</svg>`;
}

// ─── Human captcha generators (letter counting only) ───

interface LetterCountPair {
  word: string;
  letter: string;
}

const letterCountPairs: LetterCountPair[] = [
  // programming
  { word: 'programming', letter: 'g' },
  { word: 'programming', letter: 'm' },
  { word: 'programming', letter: 'r' },
  // mississippi
  { word: 'mississippi', letter: 's' },
  { word: 'mississippi', letter: 'i' },
  { word: 'mississippi', letter: 'p' },
  // accessibility
  { word: 'accessibility', letter: 'i' },
  { word: 'accessibility', letter: 'c' },
  { word: 'accessibility', letter: 's' },
  // communication
  { word: 'communication', letter: 'm' },
  { word: 'communication', letter: 'c' },
  { word: 'communication', letter: 'n' },
  // infrastructure
  { word: 'infrastructure', letter: 'r' },
  { word: 'infrastructure', letter: 't' },
  { word: 'infrastructure', letter: 'u' },
  // authentication
  { word: 'authentication', letter: 't' },
  { word: 'authentication', letter: 'a' },
  { word: 'authentication', letter: 'i' },
  // parallel
  { word: 'parallel', letter: 'l' },
  { word: 'parallel', letter: 'a' },
  // occurrence
  { word: 'occurrence', letter: 'c' },
  { word: 'occurrence', letter: 'r' },
  // committee
  { word: 'committee', letter: 't' },
  { word: 'committee', letter: 'e' },
  { word: 'committee', letter: 'm' },
  // collaboration
  { word: 'collaboration', letter: 'o' },
  { word: 'collaboration', letter: 'l' },
  { word: 'collaboration', letter: 'a' },
  // application
  { word: 'application', letter: 'p' },
  { word: 'application', letter: 'a' },
  // environment
  { word: 'environment', letter: 'n' },
  { word: 'environment', letter: 'e' },
  // performance
  { word: 'performance', letter: 'e' },
  { word: 'performance', letter: 'r' },
  // development
  { word: 'development', letter: 'e' },
  { word: 'development', letter: 'l' },
  // strawberry
  { word: 'strawberry', letter: 'r' },
  // banana
  { word: 'banana', letter: 'a' },
  { word: 'banana', letter: 'n' },
  // bookkeeper
  { word: 'bookkeeper', letter: 'o' },
  { word: 'bookkeeper', letter: 'k' },
  { word: 'bookkeeper', letter: 'e' },
  // abracadabra
  { word: 'abracadabra', letter: 'a' },
  { word: 'abracadabra', letter: 'b' },
  { word: 'abracadabra', letter: 'r' },
  // successfully
  { word: 'successfully', letter: 's' },
  { word: 'successfully', letter: 'c' },
  { word: 'successfully', letter: 'l' },
  // disappearance
  { word: 'disappearance', letter: 'a' },
  { word: 'disappearance', letter: 'p' },
  { word: 'disappearance', letter: 'e' },
  // celebration
  { word: 'celebration', letter: 'e' },
  { word: 'celebration', letter: 'l' },
  // intelligence
  { word: 'intelligence', letter: 'l' },
  { word: 'intelligence', letter: 'e' },
  { word: 'intelligence', letter: 'i' },
  // exaggeration
  { word: 'exaggeration', letter: 'a' },
  { word: 'exaggeration', letter: 'g' },
  { word: 'exaggeration', letter: 'e' },
  // professional
  { word: 'professional', letter: 'o' },
  { word: 'professional', letter: 's' },
  // entrepreneur
  { word: 'entrepreneur', letter: 'r' },
  { word: 'entrepreneur', letter: 'e' },
  { word: 'entrepreneur', letter: 'n' },
  // recommendation
  { word: 'recommendation', letter: 'e' },
  { word: 'recommendation', letter: 'o' },
  { word: 'recommendation', letter: 'n' },
  // effectiveness
  { word: 'effectiveness', letter: 'e' },
  { word: 'effectiveness', letter: 'f' },
  { word: 'effectiveness', letter: 's' },
  // experience
  { word: 'experience', letter: 'e' },
  // assessment
  { word: 'assessment', letter: 's' },
  { word: 'assessment', letter: 'e' },
  // possibility
  { word: 'possibility', letter: 's' },
  { word: 'possibility', letter: 'i' },
  // opportunity
  { word: 'opportunity', letter: 'p' },
  { word: 'opportunity', letter: 'o' },
  { word: 'opportunity', letter: 't' },
  // responsibility
  { word: 'responsibility', letter: 'i' },
  { word: 'responsibility', letter: 's' },
  // hippopotamus
  { word: 'hippopotamus', letter: 'p' },
  { word: 'hippopotamus', letter: 'o' },
  // Constantinople
  { word: 'constantinople', letter: 'n' },
  { word: 'constantinople', letter: 'o' },
  { word: 'constantinople', letter: 't' },
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
  // ─── Computationally hard challenges (easy for LLMs, hard for humans without tools) ───

  // Large multiplication
  () => {
    const a = randomInt(100, 999);
    const b = randomInt(100, 999);
    return {
      challenge: `Calculate: ${a} × ${b}. Answer with just the number.`,
      answer: String(a * b),
    };
  },
  // Multi-step arithmetic with large numbers
  () => {
    const a = randomInt(100, 500);
    const b = randomInt(100, 500);
    const c = randomInt(10, 99);
    const d = randomInt(10, 99);
    return {
      challenge: `Calculate: (${a} × ${b}) + (${c} × ${d}). Answer with just the number.`,
      answer: String(a * b + c * d),
    };
  },
  // Sum of first N primes (larger N)
  () => {
    const n = randomInt(10, 20);
    const primes = getPrimesUpTo(n);
    const sum = primes.reduce((a, b) => a + b, 0);
    return {
      challenge: `What is the sum of the first ${n} prime numbers? Answer with just the number.`,
      answer: String(sum),
    };
  },
  // Fibonacci with larger N
  () => {
    const n = randomInt(12, 20);
    const result = fibonacci(n);
    return {
      challenge: `What is the ${n}th Fibonacci number? (F(0)=0, F(1)=1, F(2)=1, ...). Answer with just the number.`,
      answer: String(result),
    };
  },
  // Power calculation
  () => {
    const base = randomInt(2, 12);
    const exp = randomInt(3, 6);
    const result = Math.pow(base, exp);
    return {
      challenge: `Calculate: ${base}^${exp}. Answer with just the number.`,
      answer: String(result),
    };
  },
  // Complex nested expression
  () => {
    const a = randomInt(5, 15);
    const b = randomInt(2, 8);
    const c = randomInt(3, 12);
    const result = Math.pow(a, 2) + b * c - Math.floor(Math.pow(a, 2) / c);
    return {
      challenge: `Calculate: ${a}² + ${b} × ${c} - floor(${a}² / ${c}). Answer with just the number.`,
      answer: String(result),
    };
  },
  // Code evaluation — loop
  () => {
    const n = randomInt(5, 12);
    let sum = 0;
    for (let i = 1; i <= n; i++) sum += i * i;
    return {
      challenge: `What does this return? function f(n) { let s=0; for(let i=1;i<=n;i++) s+=i*i; return s; } f(${n}). Answer with just the number.`,
      answer: String(sum),
    };
  },
  // Code evaluation — recursive factorial
  () => {
    const n = randomInt(6, 12);
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return {
      challenge: `Calculate ${n}! (${n} factorial). Answer with just the number.`,
      answer: String(result),
    };
  },
  // N-th prime number
  () => {
    const n = randomInt(15, 30);
    const primes = getPrimesUpTo(n);
    return {
      challenge: `What is the ${n}th prime number? (2 is the 1st prime). Answer with just the number.`,
      answer: String(primes[n - 1]),
    };
  },
  // Modular arithmetic
  () => {
    const a = randomInt(100, 999);
    const b = randomInt(100, 999);
    const m = randomInt(7, 23);
    return {
      challenge: `Calculate: (${a} × ${b}) mod ${m}. Answer with just the number.`,
      answer: String((a * b) % m),
    };
  },
  // String manipulation — count vowels in a generated string
  () => {
    const words = ['supercalifragilistic', 'antidisestablishment', 'incomprehensibilities', 'counterrevolutionary', 'electroencephalograph'];
    const word = words[randomInt(0, words.length - 1)];
    const vowels = word.split('').filter(c => 'aeiou'.includes(c)).length;
    return {
      challenge: `How many vowels (a,e,i,o,u) are in "${word}"? Answer with just the number.`,
      answer: String(vowels),
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
  // GCD calculation
  () => {
    const a = randomInt(50, 500);
    const b = randomInt(50, 500);
    const gcd = (x: number, y: number): number => y === 0 ? x : gcd(y, x % y);
    return {
      challenge: `What is the greatest common divisor (GCD) of ${a} and ${b}? Answer with just the number.`,
      answer: String(gcd(a, b)),
    };
  },
  // Multi-step with exponents
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
