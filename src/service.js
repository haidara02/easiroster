import { loadConfig } from './config.js';
import { createApiClient, fetchRoster } from './client.js';
import { extractShifts } from './roster.js';
import { createCalendarString } from './ical.js';

export function validateDate(value, name) {
  const isoPattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoPattern.test(value)) {
    throw new Error(`${name} must be in YYYY-MM-DD format`);
  }
  return value;
}

function formatIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Given "today", return Monday of this week and Monday two weeks later, as YYYY-MM-DD
export function defaultDateRange(today = new Date()) {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let day = d.getDay();
  if (day === 0) day = 7; // Sunday -> 7 to make Monday=1..Sunday=7

  const monday = new Date(d);
  monday.setDate(d.getDate() - (day - 1));

  const mondayTwoWeeksLater = new Date(monday);
  mondayTwoWeeksLater.setDate(monday.getDate() + 14);

  return {
    from: formatIsoDate(monday),
    to: formatIsoDate(mondayTwoWeeksLater)
  };
}

export async function generateRosterIcs({ dateFrom, dateTo }) {
  const config = loadConfig();
  const client = createApiClient(config);

  const roster = await fetchRoster(client, {
    personNumber: config.personNumber,
    dateFrom,
    dateTo
  });

  const shifts = extractShifts(roster);
  const ics = createCalendarString(shifts);

  return {
    ics,
    shiftCount: Array.isArray(shifts) ? shifts.length : 0
  };
}

