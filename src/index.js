import { hideBin } from "yargs/helpers";
import yargs from "yargs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeFile } from "node:fs/promises";
import {
  defaultDateRange,
  generateRosterIcs,
  validateDate,
} from "./service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const argv = yargs(hideBin(process.argv))
    .usage(
      "Usage: $0 [--dateFrom YYYY-MM-DD] [--dateTo YYYY-MM-DD]\n" +
        "If omitted, defaults to Monday of this week to Monday two weeks later.",
    )
    .options({
      dateFrom: { type: "string", describe: "Start date (inclusive)" },
      dateTo: { type: "string", describe: "End date (inclusive)" },
    })
    .strict()
    .help()
    .parse();

  let dateFrom = argv.dateFrom;
  let dateTo = argv.dateTo;

  if (!dateFrom || !dateTo) {
    const range = defaultDateRange();
    dateFrom = range.from;
    dateTo = range.to;
  }

  dateFrom = validateDate(dateFrom, "dateFrom");
  dateTo = validateDate(dateTo, "dateTo");

  console.log(`Generating roster from ${dateFrom} to ${dateTo}...`);

  const { ics, shiftCount } = await generateRosterIcs({ dateFrom, dateTo });
  const outputPath = path.join(__dirname, "..", "roster.ics");
  await writeFile(outputPath, ics, "utf-8");

  console.log(`Wrote ${shiftCount} shift(s) to ${outputPath}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
