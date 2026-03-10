import { nanoid } from 'nanoid';

// ─── Human Captcha: Math & text puzzles rendered as SVG ───

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

function renderCharAsSvg(char: string, x: number, y: number, fontSize?: number): string {
  const rotation = randomInt(-15, 15);
  const fs = fontSize ?? randomInt(28, 36);
  const dx = randomInt(-3, 3);
  const dy = randomInt(-3, 3);
  const escaped = char === '&' ? '&amp;' : char === '<' ? '&lt;' : char === '>' ? '&gt;' : char === '"' ? '&quot;' : char;
  return `<text x="${x + dx}" y="${y + dy}" font-size="${fs}" font-family="monospace, serif" font-weight="${randomInt(4, 7) * 100}" fill="#222" transform="rotate(${rotation}, ${x + dx}, ${y + dy})">${escaped}</text>`;
}

function renderTextAsSvg(text: string, options?: { width?: number; charSpacing?: number; fontSize?: number }): string {
  const charSpacing = options?.charSpacing ?? 22;
  const width = options?.width ?? Math.max(220, text.length * charSpacing + 40);
  const height = 70;
  const fontSize = options?.fontSize;

  let svgContent = '';

  // Background
  svgContent += `<rect width="${width}" height="${height}" fill="#f5f5f0" rx="4"/>`;

  // Noise lines
  for (let i = 0; i < 6; i++) {
    svgContent += generateNoiseLine(width, height);
  }

  // Noise circles
  for (let i = 0; i < 4; i++) {
    svgContent += generateNoiseCircle(width, height);
  }

  // Render each character with distortion
  const totalWidth = text.length * charSpacing;
  const startX = Math.max(10, Math.floor((width - totalWidth) / 2));
  const baseY = 48;
  for (let i = 0; i < text.length; i++) {
    svgContent += renderCharAsSvg(text[i], startX + i * charSpacing, baseY, fontSize);
  }

  // More noise on top
  for (let i = 0; i < 3; i++) {
    svgContent += generateNoiseLine(width, height);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${svgContent}</svg>`;
}

// ─── Human captcha generators ───

type HumanCaptchaGenerator = () => { text: string; answer: string; wide?: boolean };

const humanChallenges: HumanCaptchaGenerator[] = [
  // Math: addition
  () => {
    const a = randomInt(2, 30);
    const b = randomInt(2, 30);
    return { text: `${a} + ${b} = ?`, answer: String(a + b) };
  },
  // Math: subtraction
  () => {
    const a = randomInt(10, 40);
    const b = randomInt(2, a - 1);
    return { text: `${a} - ${b} = ?`, answer: String(a - b) };
  },
  // Math: multiplication
  () => {
    const a = randomInt(2, 9);
    const b = randomInt(2, 9);
    return { text: `${a} \u00d7 ${b} = ?`, answer: String(a * b) };
  },
  // Letter counting (rendered as SVG image)
  () => {
    const pairs: Array<{ word: string; letter: string }> = [
      { word: 'programming', letter: 'g' },
      { word: 'mississippi', letter: 's' },
      { word: 'mississippi', letter: 'i' },
      { word: 'accessibility', letter: 'i' },
      { word: 'communication', letter: 'm' },
      { word: 'infrastructure', letter: 'r' },
      { word: 'authentication', letter: 't' },
      { word: 'programming', letter: 'm' },
      { word: 'parallel', letter: 'l' },
      { word: 'occurrence', letter: 'c' },
    ];
    const pair = pairs[randomInt(0, pairs.length - 1)];
    const count = (pair.word.match(new RegExp(pair.letter, 'g')) || []).length;
    return {
      text: `"${pair.letter}" in "${pair.word}" = ?`,
      answer: String(count),
      wide: true,
    };
  },
  // Word length (rendered as SVG image)
  () => {
    const words = ['infrastructure', 'programming', 'development', 'authentication', 'collaboration', 'architecture', 'environment', 'performance'];
    const word = words[randomInt(0, words.length - 1)];
    return {
      text: `letters in "${word}" = ?`,
      answer: String(word.length),
      wide: true,
    };
  },
];

export function generateHumanCaptcha(): HumanCaptcha {
  const generator = humanChallenges[randomInt(0, humanChallenges.length - 1)];
  const { text, answer, wide } = generator();

  const svg = wide
    ? renderTextAsSvg(text, { width: 320, charSpacing: 14, fontSize: 22 })
    : renderTextAsSvg(text);

  return {
    token: nanoid(32),
    answer,
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
      {
        // Triangular numbers
        challenge: 'What comes next? 1, 3, 6, 10, 15, 21, ___. Answer with just the number.',
        answer: '28',
      },
      {
        // Catalan-like
        challenge: 'What comes next? 1, 2, 5, 14, 42, ___. Answer with just the number.',
        answer: '132',
      },
      {
        // Powers of 3
        challenge: 'What comes next? 3, 9, 27, 81, 243, ___. Answer with just the number.',
        answer: '729',
      },
      {
        // Factorials
        challenge: 'What comes next? 1, 2, 6, 24, 120, ___. Answer with just the number.',
        answer: '720',
      },
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
