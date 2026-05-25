const fs = require('fs');

const js = fs.readFileSync('/home/maturowski/Documents/ai-transparent/app.js', 'utf-8');

function findOccurrences(str, keyword, context = 100) {
  const results = [];
  let index = 0;
  while ((index = str.indexOf(keyword, index)) !== -1) {
    const start = Math.max(0, index - context);
    const end = Math.min(str.length, index + keyword.length + context);
    results.push(str.substring(start, end).replace(/\n/g, ' '));
    index += keyword.length;
  }
  return results;
}

console.log("=== .animate( in app.js ===");
const animates = findOccurrences(js, '.animate(');
animates.forEach(match => console.log(match + "\n---"));

console.log("=== requestAnimationFrame in app.js (first 5) ===");
const rafs = findOccurrences(js, 'requestAnimationFrame(');
rafs.slice(0, 5).forEach(match => console.log(match + "\n---"));

console.log("=== style.transition in app.js (first 10) ===");
const transitions = findOccurrences(js, 'style.transition');
transitions.slice(0, 10).forEach(match => console.log(match + "\n---"));
