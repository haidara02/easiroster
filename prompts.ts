// The following are the relevant prompts in which I have used to create/modify this project with the Cursor Agent.""

export const initialCreation = `
Set up a Node.js project in the easiroster folder to fetch roster data from an authenticated REST API and export shifts to an iCal file.

Requirements:
- Use Node.js (ES modules)
- Use axios for HTTP requests
- Read authentication tokens from a .env file
- Accept command-line arguments for dateFrom and dateTo

Fetch data from a URL like:
https://oneteam.mycoles.com.au/api/oneteam/rosters/{personNumber}/employeeEntity/Coles/dateFrom/YYYY-MM-DD/dateTo/YYYY-MM-DD

Parse WeeklyRoster.CurrentWeekShift.ShiftBlockCollection
Example of WeeklyRoster object returned by the request:
{
    "WeeklyRoster": {
        "CurrentWeekShift": {
            "WeekCycle": 0,
            "WeekStartDate": "2026-02-02T00:00:00",
            "TodaysDate": "2026-02-02T00:00:00",
            "IsWeekShiftPosted": true,
            "ShiftBlockCollection": [
                {
                    "PersonNumber": [ID],
                    "ShiftId": {Int},
                    "StartTime": "2026-02-02T19:00:00",
                    "EndTime": "2026-02-03T00:00:00",
                    "AssignedStore": [Location],
                    "StoreNumber": [Int],
                    "DepartmentName": "G",
                    "EmployeeName": "",
                    "JobRole": "G",
                    "ShiftCategory": 0,
                    "LeaveType": "",
                    "IsLeave": false,
                    "OrgJobPath": "",
                    "ShiftGuid": "",
                    "JobLevel": ""
                },
                {
                    "PersonNumber": [ID],
                    "ShiftId": [Int],
                    "StartTime": "2026-02-07T19:00:00",
                    "EndTime": "2026-02-08T00:00:00",
                    "AssignedStore": [Location],
                    "StoreNumber": [Int],
                    "DepartmentName": "G",
                    "EmployeeName": "",
                    "JobRole": "G",
                    "ShiftCategory": 0,
                    "LeaveType": "",
                    "IsLeave": false,
                    "OrgJobPath": "",
                    "ShiftGuid": "",
                    "JobLevel": ""
                }
            ]
        },
        "NextWeekShift": {
            "WeekCycle": 0,
            "WeekStartDate": "0001-01-01T00:00:00",
            "TodaysDate": "0001-01-01T00:00:00",
            "IsWeekShiftPosted": false,
            "ShiftBlockCollection": []
        },
        "RosterStartDate": "2026-02-02T00:00:00",
        "HomeStore": "[Location]"
    },
    "DailyRoster": {
        "Date": "0001-01-01T00:00:00",
        "RosterDayOfWeek": 1,
        "ShiftBlockCollection": []
    },
    "OpenShifts": [],
    "ShiftSwapRequests": [],
    "PostedDate": "2026-02-05T00:00:00",
    "CutOffDate": "2026-02-05T00:00:00",
    "AcknowledgeHoursCutOffDate": "2026-02-05T23:59:59"
}

Convert each shift into an iCal event
Write output to roster.ic
Include clear project structure and README instructions and focus on clean, readable code.
`

export const requestHeaders = `
USER_AGENT="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36"
ACCEPT_LANGUAGE=en-GB,en;q=0.8
ORIGIN=https://colesgroup.sharepoint.com
REFERER=https://colesgroup.sharepoint.com/
SEC_CH_UA="Not(A:Brand";v="8", "Chromium";v="144", "Brave";v="144"
SEC_CH_UA_PLATFORM="Windows"
SEC_CH_UA_MOBILE=?0
SEC_GPC=1

I have updated .env to include the above header information needed to bypass Incapsula
Modify the codebase in relation to axios so that the client maps the new headers into the request payload
`

export const dateLogic = `
Implement a CLI arg parser and use a default date range if omitted
The default date range would be Monday of that week to the Monday 2 weeks later
(ie 2 of Feb 2026 is Monday, so the to date would be 16 of Feb 2026)
Use local date instead of UTC
`

export const serverEndpoint = `
Add a HTTP server endpoint (/roster.ics) and refactor the codebase for containerisation
Draft a Dockerfile + example configuration to drop into an existing hypervisor
`



