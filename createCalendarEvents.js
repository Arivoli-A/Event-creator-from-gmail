function createCalendarEventsFromLabeledEmails() {
  const labelName = 'calender';
  const label = GmailApp.getUserLabelByName(labelName);
  const calendar = CalendarApp.getDefaultCalendar();
  const currentYear = new Date().getFullYear();

  if (!label) {
    Logger.log(`Label '${labelName}' not found.`);
    return;
  }

  const threads = label.getThreads();

  const timePatterns = {
        time24: /(?:[01]\d|2[0-3]):[0-5]\d/,
        time12: /(?:1[0-2]|0?[1-9]):[0-5]\d\s*(?:am|pm|AM|PM)/,
        time12Loose: /(?:1[0-2]|0?[1-9]):[0-5]\d(?:\s*)?(?:am|pm|AM|PM)/
      };
      
  // Numeric patterns
  const month = "1[0-2]|0?[1-9]";  // Matches: 1-12 or 01-12
  const day = "3[01]|[12][0-9]|0?[1-9]";  // Matches: 31-1 or 01-31
  const year = "(?:19|20)\\d{2}";  // Matches: 1900-2099
  const ordinalSuffix = "(?:st|nd|rd|th)?";  // Matches: st, nd, rd, th (optional)

  // Month names
  const monthNames = "Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?";

  // Date format patterns
  const numericDate = `(?:${month})\\/(?:${day})(?:\\/(?:${year}))?`;  // MM/DD or MM/DD/YYYY
  const textDate = `(?:${monthNames})\\s+(?:${day})${ordinalSuffix}(?:,?\\s*${year})?`;  // Month DD or Month DD, YYYY

  // Complete date regex
  const dateRegex = new RegExp(`(${numericDate}|${textDate})`, 'i');

  const locationRegex = /(?:at|location|venue|where|room|hall|auditorium|lawn|center|centre|lecture|theater|theatre|building|campus|lab|laboratory|office|conference|meeting|classroom|floor|block|wing|department|dept|suite|arena|ground|field|court|studio|gallery|library|cafeteria|lounge|lobby|cabin|chamber|seminar|training|board)[:|\s]([^,.\n]+)/i;


  for (const thread of threads) {
    const messages = thread.getMessages();
    
    for (const message of messages) {
      const body = message.getPlainBody();
      const subject = message.getSubject();
      
      // Regex patterns for time and date
      
      // Find matches
      const dateMatch = body.match(dateRegex);
      const locationMatch = body.match(locationRegex);
      
      // Check time formats
      let timeMatch = null;
      let is12Hour = false;
      
      timeMatch = body.match(timePatterns.time12);
      if (timeMatch) {
        is12Hour = true;
      } else {
        timeMatch = body.match(timePatterns.time24);
      }

      if (dateMatch || timeMatch || locationMatch) {
        try {
          // Parse date with optional year
          let dateStr = dateMatch[0];
          
          // Remove ordinal suffixes (st, nd, rd, th)
          dateStr = dateStr.replace(/(st|nd|rd|th)/gi, '');
          
          // Add year if not present
          if (!dateStr.match(/\d{4}/)) {
            dateStr = dateStr + ', ' + currentYear;
          }
          
          Logger.log('Processed date string: ' + dateStr);
          const eventDate = new Date(dateStr);
          eventDate.setHours(9);
          eventDate.setMinutes(0);
          if(timeMatch){
          if (is12Hour) {
            const timeStr = timeMatch[0].toLowerCase();
            const isPM = timeStr.includes('pm');
            const timeParts = timeStr.split(':');
            let hours = parseInt(timeParts[0]);
            const minutes = parseInt(timeParts[1]);
            
            if (isPM && hours !== 12) {
              hours += 12;
            } else if (!isPM && hours === 12) {
              hours = 0;
            }
            
            eventDate.setHours(hours);
            eventDate.setMinutes(minutes);
          } else {
            const timeParts = timeMatch[0].split(':');
            eventDate.setHours(parseInt(timeParts[0]));
            eventDate.setMinutes(parseInt(timeParts[1]));
          }
          }
          // Set default time to 9 AM if not specified
          else{
            Logger.log('Time not found or invalid, defaulting to 9:00 AM');
          }

          const endDate = new Date(eventDate.getTime() + (60 * 60 * 1000));
          
          // Check if eventDate is valid before creating event
          if (!eventDate || isNaN(eventDate.getTime())) {
              Logger.log('Invalid date detected for email: ' + subject);
              continue; // Skip to next message
          }

          // Additional check to ensure date is not null and is a valid Date object
          if (!(eventDate instanceof Date)) {
              Logger.log('Event date is not a valid Date object for email: ' + subject);
              continue;
          }

          // Process location with enhanced location detection
          let location = '';
          if (locationMatch && locationMatch[0]) {
            location = locationMatch[0].trim()
              .replace(/\s+/g, ' ')               // Remove extra spaces
              .replace(/^[,:;\s]+|[,:;\s]+$/g, '') // Remove leading/trailing punctuation
              .replace(/\([^)]*\)/g, '')          // Remove parentheses and their contents
              .trim();
            Logger.log('Location found: ' + location);
          } else {
            // Also check if the email contains location-like words without explicit markers
            const implicitLocationRegex = /(?:room|hall|auditorium|lawn|center|centre|lecture|theater|theatre)\s+[A-Za-z0-9-]+/i;
            const implicitMatch = body.match(implicitLocationRegex);
            
            if (implicitMatch) {
              location = implicitMatch[0].trim();
              Logger.log('Implicit location found: ' + location);
            } else {
              Logger.log('No location specified in email');
            }
          }

          const event = calendar.createEvent(
            subject,
            eventDate,
            endDate,
            {
              description: body,
              location: location
            }
          );
          event.addPopupReminder(24*60);
          Logger.log('Created event: ' + subject);
          
          // Remove the label after successful event creation
          thread.removeLabel(label);
          
        } catch (error) {
          Logger.log('Error creating event: ' + error);
        }
      } else {
        Logger.log('Missing required components in email: ' + subject);
      }
    }
  }
}
