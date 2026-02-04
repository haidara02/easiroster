export function extractShifts(roster) {
  console.log(roster);
  if (!roster?.WeeklyRoster?.CurrentWeekShift?.ShiftBlockCollection) {
    throw new Error('Unexpected roster format: missing ShiftBlockCollection');
  }

  return roster.WeeklyRoster.CurrentWeekShift.ShiftBlockCollection;
}
