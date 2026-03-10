import { nanoid } from 'nanoid';

// ─── Human Captcha: Math puzzle rendered as SVG ───

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

function renderCharAsSvg(char: string, x: number, y: number): string {
  const rotation = randomInt(-15, 15);
  const fontSize = randomInt(28, 36);
  const dx = randomInt(-3, 3);
  const dy = randomInt(-3, 3);
  return `<text x="${x + dx}" y="${y + dy}" font-size="${fontSize}" font-family="monospace, serif" font-weight="${randomInt(4, 7) * 100}" fill="#222" transform="rotate(${rotation}, ${x + dx}, ${y + dy})">${char}</text>`;
}

export function generateHumanCaptcha(): HumanCaptcha {
  const ops = ['+', '-', '\u00d7'] as const;
  const op = ops[randomInt(0, 2)];
  let a: number, b: number, answer: number;

  switch (op) {
    case '+':
      a = randomInt(2, 30);
      b = randomInt(2, 30);
      answer = a + b;
      break;
    case '-':
      a = randomInt(10, 40);
      b = randomInt(2, a - 1);
      answer = a - b;
      break;
    case '\u00d7':
      a = randomInt(2, 9);
      b = randomInt(2, 9);
      answer = a * b;
      break;
    default:
      a = 1; b = 1; answer = 2;
  }

  const text = `${a} ${op} ${b} = ?`;
  const width = 220;
  const height = 70;

  // Build SVG
  let svgContent = '';

  // Background with slight texture
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
  const startX = 20;
  const baseY = 48;
  for (let i = 0; i < text.length; i++) {
    svgContent += renderCharAsSvg(text[i], startX + i * 22, baseY);
  }

  // More noise on top
  for (let i = 0; i < 3; i++) {
    svgContent += generateNoiseLine(width, height);
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${svgContent}</svg>`;

  return {
    token: nanoid(32),
    answer: String(answer),
    svg,
  };
}

// ─── Agent Captcha: Text-based reasoning challenges ───

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
  // Word problem
  () => {
    const items = randomInt(3, 8);
    const price = randomInt(2, 9);
    return {
      challenge: `If you have ${items} items and each costs $${price}, what is the total cost in dollars? Answer with just the number.`,
      answer: String(items * price),
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
