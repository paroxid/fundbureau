// Wait for the HTML content to be fully loaded before running the script
document.addEventListener('DOMContentLoaded', () => {


    // Path to your CSV file
const CSV_PATH = 'data/events.csv';
const DEFAULT_TICKET_LINK = 'https://www.ticketmaster.de/venue/fundbureau-hamburg-tickets/hamfundb/701?language=en-us';
    
    // Find the containers on the page
    const upcomingContainer = document.getElementById('upcoming-events-container');
    const pastContainer = document.getElementById('past-events-container');

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
    
    // Start by assuming we'll use the default link
    let finalTicketLink = DEFAULT_TICKET_LINK;

    // Check if a link exists in the CSV and that it's not just empty spaces
    if (values[8] && values[8].trim().length > 0) {
        // If it's valid, use it instead of the default
        finalTicketLink = values[8].trim();
    }

    const eventData = {
        date: parseDate(values[0]),
        dateString: values[0],
        name: values[1],
        artists: values.slice(2, 8).filter(artist => artist.trim() !== '').join(', '),
        ticketLink: finalTicketLink // Use our final, safe link
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
                displayEvents(upcomingEvents.slice(0, 10), upcomingContainer);
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
            eventsHtml += `
                <div class="event">
        <div class="event-date">${event.dateString}</div>
        <div class="event-name">${event.name}</div>
        <div class="event-artists">${event.artists}</div>
        <a href="${event.ticketLink}" target="_blank" class="event-ticket-link">Tickets</a>
    </div>
            `;
        }
        container.innerHTML = eventsHtml;
    };
});