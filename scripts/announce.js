#!/usr/bin/env node
/* Post the newest "What's new" entry to the team GroupMe.

   node scripts/announce.js            print the message only (dry run)
   node scripts/announce.js --send     post it through the GroupMe bot

   The message comes from CHANGELOG[0] in js/ui/title.js, so it always
   matches the title screen. The bot ID is a secret: it's read from the
   GROUPME_BOT_ID environment variable or ~/.config/d3dynasty/groupme_bot_id,
   never from the repo. This file isn't served (see .assetsignore). */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');

function latestChange() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'ui', 'title.js'), 'utf8');
  const start = src.indexOf('const CHANGELOG = [');
  if (start < 0) throw new Error('CHANGELOG not found in js/ui/title.js');
  const list = src.slice(start + 'const CHANGELOG = '.length, src.indexOf('];', start) + 1);
  // eslint-disable-next-line no-new-func
  const entries = new Function(`return ${list};`)();
  return entries[0];
}

function botId() {
  if (process.env.GROUPME_BOT_ID) return process.env.GROUPME_BOT_ID.trim();
  const file = path.join(os.homedir(), '.config', 'd3dynasty', 'groupme_bot_id');
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim() : '';
}

function post(id, text) {
  const body = JSON.stringify({ bot_id: id, text });
  return new Promise((resolve, reject) => {
    const req = https.request('https://api.groupme.com/v3/bots/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      res.resume();
      res.on('end', () => (res.statusCode === 202 ? resolve() : reject(new Error(`GroupMe answered ${res.statusCode}`))));
    });
    req.on('error', reject);
    req.end(body);
  });
}

(async () => {
  const change = latestChange();
  const text = `D3 Dynasty update (${change.date}): ${change.text}`;
  console.log(text);
  if (!process.argv.includes('--send')) {
    console.log('\n(dry run: add --send to post)');
    return;
  }
  const id = botId();
  if (!id) throw new Error('No bot ID. Set GROUPME_BOT_ID or write it to ~/.config/d3dynasty/groupme_bot_id.');
  await post(id, text);
  console.log('\nPosted to GroupMe.');
})().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
