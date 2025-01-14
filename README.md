## Event creator : Automatically create Google calender events from Gmail

This is a script to run in Google's [Apps Script](https://developers.google.com/apps-script) to automatically create events in google calender from gmail.

Copy the script [createCalenderEvents](/createCalendarEvents.js) into your own Google's Apps Script editor and run it.

The script looks for emails in the label ```calender``` and automatically read date, time and location from the body of the email

## Future work

1. The current method of obtaining the location using regex is not accurate. In the future, the location can be intelligently identified using machine learning techniques that learn locally from the user's emails. Another approach could be to use a large language model (e.g., Gemini) to extract the location from the body of emails.
