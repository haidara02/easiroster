import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './config.js';
import { createApiClient, fetchRoster } from './client.js';
import { extractShifts } from './roster.js';
import { writeIcs } from './ical.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function validateDate(value, name) {
  const isoPattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoPattern.test(value)) {
    throw new Error(`${name} must be in YYYY-MM-DD format`);
  }
  return value;
}

async function main() {
  const argv = yargs(hideBin(process.argv))
    .usage('Usage: $0 --dateFrom YYYY-MM-DD --dateTo YYYY-MM-DD')
    .options({
      dateFrom: { type: 'string', demandOption: true, describe: 'Start date (inclusive)' },
      dateTo: { type: 'string', demandOption: true, describe: 'End date (inclusive)' }
    })
    .strict()
    .help()
    .parse();

  const dateFrom = validateDate(argv.dateFrom, 'dateFrom');
  const dateTo = validateDate(argv.dateTo, 'dateTo');

  const config = loadConfig();
  const client = createApiClient(config);

  console.log(`Fetching roster for ${config.personNumber} from ${dateFrom} to ${dateTo}...`);

  const roster = await fetchRoster(client, {
    personNumber: config.personNumber,
    dateFrom,
    dateTo
  });

  const shifts = extractShifts(roster);

  if (!Array.isArray(shifts) || shifts.length === 0) {
    console.warn('No shifts found in response.');
  }

  const outputPath = path.join(__dirname, '..', 'roster.ics');
  await writeIcs(shifts, outputPath);

  console.log(`Wrote ${shifts.length} shift(s) to ${outputPath}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
