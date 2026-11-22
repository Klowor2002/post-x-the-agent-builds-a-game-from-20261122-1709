// main.ts — entrypoint for the post-x make.fun bounty.
//
// What this program does, and why:
//   The deliverable for this bounty lives on X (a video post from the
//   owner's account). This repo just has to hand the grader a pointer to
//   that post. POST.json in the bot directory carries the pointer as
//   { "url": "https://x.com/<handle>/status/<id>" }, and my only job is
//   to copy that file, untouched, into the output directory.
//
//   Before copying I actually read the file and sanity-check the URL.
//   The kit starter shipped a placeholder address ("<handle>/<id>"),
//   and a placeholder that slips through would silently zero the entry,
//   so a malformed or placeholder URL is a hard failure here, not a
//   warning: print what is wrong and exit 1.
//
// Environment:
//   MAKEFUN_BOT_DIR    where POST.json is read from   (default /bot)
//   MAKEFUN_OUTPUT_DIR where POST.json is written to  (default /output)
//
// Node standard library only.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const botDir = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// A real X post URL: https scheme, x.com host, some handle, the literal
// segment "status", then a purely numeric post id. Anything else — a
// profile link, a twitter.com URL, a trailing path — is not a post.
const POST_URL_PATTERN = /^https:\/\/x\.com\/[^/]+\/status\/\d+$/;

function fail(message: string): never {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

// Read POST.json and return its raw bytes once the URL inside checks
// out. The bytes (not a re-serialised object) are what get copied, so
// the output stays byte-identical to the file in the repo.
function readCheckedPostFile(): Buffer {
  const postPath = join(botDir, 'POST.json');
  let raw: Buffer;
  try {
    raw = readFileSync(postPath);
  } catch (err) {
    fail(`cannot read ${postPath}: ${(err as Error).message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.toString('utf8'));
  } catch (err) {
    fail(`POST.json is not valid JSON: ${(err as Error).message}`);
  }

  const url = (parsed as { url?: unknown } | null)?.url;
  if (typeof url !== 'string' || url.length === 0) {
    fail('POST.json has no string "url" field');
  }
  // The starter's placeholder is called out by name before the pattern
  // check so the error says what actually happened — "you never replaced
  // the placeholder" is a much more useful message than "no match".
  if (url.includes('<handle>') || url.includes('<id>')) {
    fail('POST.json still holds the starter placeholder URL — replace it with the real post URL');
  }
  if (!POST_URL_PATTERN.test(url)) {
    fail(`POST.json url is not an X post URL: ${JSON.stringify(url)}`);
  }
  return raw;
}

const postBytes = readCheckedPostFile();

try {
  mkdirSync(outputDir, { recursive: true });
  // Write the exact bytes that were just validated rather than copying
  // the file a second time — what was checked is what the grader reads.
  writeFileSync(join(outputDir, 'POST.json'), postBytes);
} catch (err) {
  fail(`could not write POST.json into ${outputDir}: ${(err as Error).message}`);
}
