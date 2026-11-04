/* Materialize the existing templates; no framework or deployment build is needed.
 * Run after editing home/collection templates or their image metadata:
 *   node scripts/render-static-pages.cjs
 *   node scripts/render-static-pages.cjs --check
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const app = read('app.js').split('// Hydrate the static document')[0];
if (!app.includes('function home()') || app.includes("document.querySelector('#main').innerHTML")) {
  throw new Error('Cannot locate the template-only portion of app.js');
}
for (const file of ['index.html', 'visual/index.html']) {
  const context = vm.createContext({
    location: {pathname: file.startsWith('visual/') ? '/visual/' : '/'},
    document: {addEventListener() {}, title: ''}, innerWidth: 1440
  });
  context.window = context;
  for (const source of ['cover-images.js', 'image-loading.js', 'sprint-case.js']) {
    vm.runInContext(read(source), context, {filename: source});
  }
  vm.runInContext(app, context, {filename: 'app.js'});
  const markup = vm.runInContext(file.startsWith('visual/') ? 'visual()' : 'home()', context);
  const previous = read(file);
  let next = previous.replace(/<main id="main"[^>]*>[\s\S]*?<\/main>/,
    () => `<main id="main" data-prerendered="true">${markup}</main>`);
  next = next.replace(/((?:src|href)="(?:\.\/|\.\.\/))([^"?]+\.(?:js|css))(?:\?v=[^"?]+)?"/g,
    (all, prefix, resource) => {
      if (!fs.existsSync(path.join(root, resource))) return all;
      const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, resource))).digest('hex').slice(0, 10);
      return `${prefix}${resource}?v=${hash}"`;
    });
  if (process.argv.includes('--check')) {
    if (next !== previous) throw new Error(`${file} is stale; run node scripts/render-static-pages.cjs`);
  } else {
    fs.writeFileSync(path.join(root, file), next);
  }
  console.log(`${file}: ${process.argv.includes('--check') ? 'verified' : 'rendered'}`);
}
