const fs = require('fs');

const css = fs.readFileSync('/home/maturowski/Documents/ai-transparent/app.css', 'utf-8');

// Extract keyframes
const keyframes = [];
const keyframeRegex = /@keyframes\s+([^{]+)\s*{/g;
let match;
while ((match = keyframeRegex.exec(css)) !== null) {
  keyframes.push(match[1].trim());
}

console.log("=== KEYFRAMES ===");
console.log([...new Set(keyframes)].join('\n'));

// Extract transition rules classes
const transitionRegex = /([^{]+)\{[^}]*transition:\s*([^;}]+)/g;
const transitions = [];
while ((match = transitionRegex.exec(css)) !== null) {
  let selector = match[1].trim();
  // clean up selector
  selector = selector.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  if (selector.length < 100) {
    transitions.push(`${selector} -> ${match[2].trim()}`);
  }
}

console.log("\n=== TRANSITIONS ===");
// output first 50 transitions to not clutter
console.log([...new Set(transitions)].slice(0, 50).join('\n'));
