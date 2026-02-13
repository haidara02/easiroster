export function extractShifts(roster) {
  if (!roster?.WeeklyRoster?.CurrentWeekShift?.ShiftBlockCollection) {
    throw new Error("Unexpected roster format: missing ShiftBlockCollection");
  }

  return roster.WeeklyRoster.CurrentWeekShift.ShiftBlockCollection;
}
