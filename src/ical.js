import ical from "ical-generator";
import fs from "node:fs/promises";

function toDate(dateTimeString) {
  const date = new Date(dateTimeString);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date value: ${dateTimeString}`);
  }
  return date;
}

export function shiftsToEvents(shifts) {
  return shifts.map((shift) => ({
    id: shift.ShiftId?.toString() || shift.ShiftGuid || undefined,
    start: toDate(shift.StartTime),
    end: toDate(shift.EndTime),
    summary: shift.JobRole || "Shift",
    description: [
      `Department: ${shift.DepartmentName || "N/A"}`,
      `Store: ${shift.AssignedStore || "N/A"} (${shift.StoreNumber || ""})`,
    ].join("\n"),
    location: shift.AssignedStore || "",
    url: undefined,
  }));
}

export function createCalendarString(shifts) {
  const cal = ical({ name: "Roster" });
  shiftsToEvents(shifts).forEach((event) => {
    cal.createEvent({
      start: event.start,
      end: event.end,
      summary: event.summary,
      location: event.location,
      description: event.description,
      timezone: "Australia/Sydney", // Force each event to local timezone
    });
  });
  return cal.toString();
}

export async function writeIcs(shifts, targetPath) {
  const ics = createCalendarString(shifts);
  await fs.writeFile(targetPath, ics, "utf-8");
}
