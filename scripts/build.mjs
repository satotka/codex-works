import {readFile,writeFile} from 'node:fs/promises';
const css=await readFile('dist/style.css','utf8');
const engine=(await readFile('dist/engine.js','utf8')).replaceAll('export ','');
const app=(await readFile('dist/app.js','utf8')).replace(/^import[^\n]+\n/,'');
const html=(await readFile('dist/index.html','utf8')).replace('<link rel="stylesheet" href="style.css">',`<style>${css}</style>`).replace('<script type="module" src="app.js"></script>',`<script type="module">${engine}\n${app}</script>`);
await writeFile('PLAY.html',html);console.log('Built offline PLAY.html');
