// Wait for the HTML content to be fully loaded before running the script
document.addEventListener('DOMContentLoaded', () => {


    // Path to your CSV file
const CSV_PATH = 'data/events.csv';
const DEFAULT_TICKET_LINK = 'https://www.ticketmaster.de/venue/fundbureau-hamburg-tickets/hamfundb/701?language=en-us';
    
    // Find the containers on the page
    const upcomingContainer = document.getElementById('upcoming-events-container');
    const pastContainer = document.getElementById('past-events-container');

// Function to split an artist string into name and optional playtime.
// Playtime is the LAST space-separated token and must match one of these patterns:
//   0-3        digits - digits
//   23:30-3    digits:digits - digits (hours can also have :minutes)
//   0:30-1:30  digits:digits - digits:digits
//   3-?        digits - ?
// Spaces around the hyphen are allowed: "0 - 3", "23:30 - 3:00", etc.
// If no playtime is detected, the whole string is returned as the name (backward compat).
const splitArtistAndPlaytime = (artistString) => {
    const trimmed = artistString.trim();
    // Regex: capture the playtime at the end of the string, preceded by whitespace.
    //   (\d+(?::\d+)?)        -> start time: digits, optional :digits
    //   \s*-\s*               -> hyphen with optional spaces
    //   (\d+(?::\d+)?|\?)     -> end time: digits(+optional :digits) OR a literal ?
    const playtimeRegex = /\s+(\d+(?::\d+)?\s*-\s*(?:\d+(?::\d+)?|\?))$/;
    const match = trimmed.match(playtimeRegex);

    if (match) {
        const playtime = match[1].replace(/\s+/g, ''); // remove spaces inside "0 - 3" -> "0-3"
        const name = trimmed.slice(0, match.index).trim();
        return { name, playtime };
    }
    return { name: trimmed, playtime: null };
};

// Function to parse the DD.MM.YY date format into a real Date object
const parseDate = (dateString) => {
    const [day, month, year] = dateString.split('.').map(Number);
    // Add 2000 to the two-digit year to get the full year (e.g., 25 -> 2025)
    const fullYear = year + 2000;
    // JavaScript months are 0-indexed (0=Jan, 1=Feb, etc.)
    return new Date(fullYear, month - 1, day);
};

    // Fetch and process the event data
    fetch(CSV_PATH)
        .then(response => response.text())
        .then(csvText => {
            const rows = csvText.trim().split('\n');
            const headers = rows.shift().split(','); // Assumes first row is headers

            const events = rows.map(row => {
    // This removes a potential carriage return character (\r) that can cause issues with files from Windows
    const cleanRow = row.replace(/\r$/, '');
    const values = cleanRow.split(',');
    
    // Decide what to show for the ticket button:
    //   - Empty column       -> default link, label "Tickets"
    //   - Value is a link    -> that link, label "Tickets"
    //   - Value is other text -> no link (unpressable), label is that text
    let finalTicketLink = DEFAULT_TICKET_LINK;
    let ticketLabel = 'Tickets';

    const rawTicketValue = values[8] ? values[8].trim() : '';
    if (rawTicketValue.length > 0) {
        const isLink = /^(https?:\/\/|www\.)/i.test(rawTicketValue);
        if (isLink) {
            finalTicketLink = rawTicketValue;
        } else {
            finalTicketLink = null; // signal "no link, unpressable"
            ticketLabel = rawTicketValue;
        }
    }

    // Start time (column 9): free-form string, uppercased. Empty -> not shown.
    const startTime = values[9] ? values[9].trim().toUpperCase() : '';

    const eventData = {
        date: parseDate(values[0]),
        dateString: values[0],
        name: values[1],
        artists: values.slice(2, 8)
            .filter(artist => artist.trim() !== '')
            .map(artist => {
                const { name, playtime } = splitArtistAndPlaytime(artist);
                return playtime ? `${name}<sup>${playtime}</sup>` : name;
            })
            .join(', '),
        ticketLink: finalTicketLink,
        ticketLabel: ticketLabel,
        startTime: startTime
    };
    return eventData;
});
            
            // Separate events into upcoming and past
            const now = new Date();
            now.setHours(0, 0, 0, 0); // Compare dates only, ignoring time

            const upcomingEvents = events
                .filter(event => event.date >= now)
                .sort((a, b) => a.date - b.date); // Sort soonest first
            
const pastEvents = events
    .filter(event => event.date < now)
    .sort((a, b) => b.date - a.date); // Sorts most recent first 
                

            // Display events on the correct page
            if (upcomingContainer) {
                // On the landing page, show the next 3 events
                displayEvents(upcomingEvents.slice(0, 99), upcomingContainer);
            }
            if (pastContainer) {
                // On the archive page, show all past events
                displayEvents(pastEvents, pastContainer);
            }
        })
        .catch(error => {
            console.error('Error fetching or parsing CSV:', error);
            const container = upcomingContainer || pastContainer;
            if (container) {
                container.innerHTML = '<p>Could not load events. Please check the data file.</p>';
            }
        });

    // Function to create HTML for events and display them
    const displayEvents = (events, container) => {
        if (events.length === 0) {
            container.innerHTML = '<p>Keine Events gefunden.</p>';
            return;
        }

        let eventsHtml = '';
        for (const event of events) {
            // If there's no link, render the anchor without href (unpressable).
            const ticketAttrs = event.ticketLink
                ? `href="${event.ticketLink}" target="_blank"`
                : '';
            // Only render the start time line if a value is present.
            const startTimeHtml = event.startTime
                ? `<div class="event-starttime">${event.startTime}</div>`
                : '';
            eventsHtml += `
                <div class="event">
        <div class="event-date">${event.dateString}</div>
        <div class="event-name">${event.name}</div>
        <div class="event-artists">${event.artists}</div>
        ${startTimeHtml}
        <a ${ticketAttrs} class="event-ticket-link">${event.ticketLabel}</a>
    </div>
            `;
        }
        container.innerHTML = eventsHtml;
    };
});