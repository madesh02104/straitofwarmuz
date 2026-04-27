const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    if (fs.statSync(file).isDirectory()) results = results.concat(walk(file));
    else if (file.endsWith('.jsx')) results.push(file);
  });
  return results;
}
walk('src/components/HUD').forEach(file => {
  if (file.includes('Landing.jsx')) return;
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/fontSize:\s*["'](\d+(?:\.\d+)?)rem["']/g, (m, val) => {
    return 'fontSize: "' + (parseFloat(val) * 0.6).toFixed(2) + 'rem"';
  });
  content = content.replace(/fontSize:\s*(\d+)/g, (m, val) => {
    return 'fontSize: ' + Math.floor(parseInt(val) * 0.6);
  });
  content = content.replace(/letterSpacing:\s*(\d+)/g, (m, val) => {
    return 'letterSpacing: ' + Math.floor(parseInt(val) * 0.5);
  });
  fs.writeFileSync(file, content);
});
