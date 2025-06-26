// static/js/journal_script.js
document.addEventListener('DOMContentLoaded', function () {
    console.log("Journal script loaded.");

    // --- Profile Dropdown Logic ---
    const profileIconJournal = document.getElementById('profileIconLinkJournal');
    const profileDropdownJournal = document.getElementById('profileDropdownMenuJournal');
    const recentEntriesList = document.getElementById('recentEntriesList');

    console.log("Profile Icon Element (Journal):", profileIconJournal);
    console.log("Profile Dropdown Element (Journal):", profileDropdownJournal); 
    if (profileIconJournal && profileDropdownJournal) {
        profileIconJournal.addEventListener('click', function(event) {
            event.preventDefault();
            console.log("Profile icon CLICKED. Current dropdown display:", profileDropdownJournal.style.display);
            profileDropdownJournal.style.display = profileDropdownJournal.style.display === 'none' ? 'block' : 'none';
            console.log("New dropdown display:", profileDropdownJournal.style.display); 
        });

        document.addEventListener('click', function(event) {
            if (profileDropdownJournal && profileDropdownJournal.style.display === 'block' &&
                !profileIconJournal.contains(event.target) && 
                !profileDropdownJournal.contains(event.target)) {
                console.log("Clicked outside profile dropdown. Hiding it.");
                profileDropdownJournal.style.display = 'none';
            }
        });
    } else {
        console.warn("Profile icon or dropdown for journal page not found.");
    }

    // --- Calendar Logic ---
    const calendarGrid = document.getElementById('calendarGrid');
    const calMonthYearDisplay = document.getElementById('calMonthYear');
    const prevMonthBtn = document.getElementById('calPrevMonthBtn');
    const nextMonthBtn = document.getElementById('calNextMonthBtn');
    const entryDateInput = document.getElementById('entryDate');

    console.log("Calendar elements: Grid:", calendarGrid, "MonthYearDisplay:", calMonthYearDisplay);
    console.log("Initial calendar data from Flask: Month:", typeof initialCalendarMonth !== 'undefined' ? initialCalendarMonth : 'MISSING', "Year:", typeof initialCalendarYear !== 'undefined' ? initialCalendarYear : 'MISSING');
    
    let currentDisplayDate;
    if (typeof initialCalendarYear !== 'undefined' && typeof initialCalendarMonth !== 'undefined') {
        currentDisplayDate = new Date(initialCalendarYear, initialCalendarMonth - 1, 1);
    } else {
        console.warn("Initial calendar month/year not provided by Flask, defaulting to current date.");
        currentDisplayDate = new Date();
        currentDisplayDate.setDate(1);
    }
    console.log("Initial currentDisplayDate for calendar:", currentDisplayDate);

    function renderCalendar(date) {
        if (!calendarGrid || !calMonthYearDisplay) {
            console.warn("Calendar elements not found for rendering.");
            return;
        }
        // Clear only day cells, keep headers if they are static in HTML or re-add them
        calendarGrid.innerHTML = ''; // Simple clear for now, will re-add headers
        const dayHeaders = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
        dayHeaders.forEach(headerText => {
            const headerDiv = document.createElement('div');
            headerDiv.className = 'cal-day-header';
            headerDiv.textContent = headerText;
            calendarGrid.appendChild(headerDiv);
        });

        const month = date.getMonth();
        const year = date.getFullYear();
        calMonthYearDisplay.textContent = `${date.toLocaleString('default', { month: 'long' })} ${year}`;
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let i = 0; i < firstDayOfMonth; i++) {
            const emptyDayDiv = document.createElement('div');
            emptyDayDiv.className = 'cal-day empty';
            calendarGrid.appendChild(emptyDayDiv);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'cal-day';
            dayDiv.textContent = day;
            const currentDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            dayDiv.dataset.date = currentDateStr;

            const today = new Date();
            if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                dayDiv.classList.add('current-day');
            }
            // TODO: Highlight days with entries

            dayDiv.addEventListener('click', function() {
                const selectedDay = calendarGrid.querySelector('.cal-day.selected');
                if (selectedDay) selectedDay.classList.remove('selected');
                this.classList.add('selected');
                if (entryDateInput) entryDateInput.value = this.dataset.date;
                console.log("Selected date from calendar:", this.dataset.date);
                // TODO: Load journal entry for this date using fetch
            });
            calendarGrid.appendChild(dayDiv);
        }
    }

    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            currentDisplayDate.setMonth(currentDisplayDate.getMonth() - 1);
            renderCalendar(currentDisplayDate);
        });
    }

    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
            currentDisplayDate.setMonth(currentDisplayDate.getMonth() + 1);
            renderCalendar(currentDisplayDate);
        });
    }
    
    if (calendarGrid && calMonthYearDisplay) { // Ensure elements exist before initial render
        renderCalendar(currentDisplayDate);
    } else {
        console.error("Cannot perform initial calendar render - critical calendar elements missing.");
    }


    // --- Journal Entry Elements ---
    const journalEntryTextarea = document.getElementById('journalEntryText');
    const saveEntryBtn = document.getElementById('saveEntryBtn');

    
    // Function to handle saving/publishing
    function handleSaveJournalEntry(isDraftStatus) {
        if (!journalEntryTextarea || !entryDateInput) {
            console.error("Missing journal text area or date input for saving.");
            alert("Error: Page elements missing. Cannot save entry.");
            return;
        }
        const entryText = journalEntryTextarea.value;
        const date = entryDateInput.value; // Should be in YYYY-MM-DD format

        if (!entryText.trim()) {
            alert("Journal entry cannot be empty.");
            return;
        }
        if (!date) {
            alert("Please select a date for the entry.");
            return;
        }

        console.log(`Submitting Journal Entry (Draft: ${isDraftStatus}):`);
        console.log("Date:", date);
        console.log("Text Snippet:", entryText.substring(0, 50) + "...");
    

        fetch('/save-journal-entry', { // This is your backend endpoint
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: entryText,    // Matches backend: data.get('text')
                date: date,         // Matches backend: data.get('date')        // Matches backend: data.get('tags')
                is_draft: isDraftStatus // Matches backend: data.get('is_draft')
            })
        })
        .then(response => {
            console.log("--- JS: Raw response from /save-journal-entry:", response);
            if (!response.ok) {
                return response.json().then(errData => {
                    console.error("--- JS: Error data from backend (parsed JSON):", errData);
                    throw new Error(errData.message || `HTTP error! Status: ${response.status}`);
                }).catch(() => { // Fallback if error response itself isn't valid JSON
                    console.error("--- JS: HTTP error, response not JSON. Status:", response.status, response.statusText);
                    throw new Error(`HTTP error! Status: ${response.status} - Server error details unavailable.`);
                });
            }
            return response.json();
        })
        .then(data => {
            console.log("--- JS: Parsed JSON data from backend /save-journal-entry:", data);
            if (data.success) {
                alert(data.message || "Entry saved!");
                const sentimentDisplay = document.getElementById('sentimentDisplayArea');
                if (sentimentDisplay && data.sentiment) {
                    let sentimentIconClass = 'far fa-meh';
                    let sentimentText = data.sentiment.charAt(0).toUpperCase() + data.sentiment.slice(1);
                    if (data.sentiment === 'positive') sentimentIconClass = 'far fa-smile';
                    else if (data.sentiment === 'negative') sentimentIconClass = 'far fa-frown';
                    sentimentDisplay.innerHTML = `<i class="${sentimentIconClass}"></i> ${sentimentText}`;
                } // Simple feedback
                // Reload the page to see the entry in "Recent Entries" (simplest approach)
                setTimeout(() => { // Slight delay to allow user to see alert
                    window.location.reload();
                }, 500); 
            } else {
                alert("Error saving entry: " + (data.message || "Unknown server error."));
            }
        })
        .catch(error => {
            console.error("Error submitting journal entry:", error);
            alert("An error occurred while saving your entry: " + error.message);
        });
    }
    function populateEditorWithEntry(entryData) {
        if (journalEntryTextarea) {
            journalEntryTextarea.value = entryData.text || '';
        }
        if (entryDateInput) {
            entryDateInput.value = entryData.date || ''; // Expects YYYY-MM-DD
        }
        const sentimentDisplay = document.getElementById('sentimentDisplayArea');
        if (sentimentDisplay) {
            let sentimentIconClass = 'far fa-meh'; // Neutral default
            let sentimentText = (entryData.sentiment || 'neutral').charAt(0).toUpperCase() + (entryData.sentiment || 'neutral').slice(1);

            if (entryData.sentiment === 'positive') {
                sentimentIconClass = 'far fa-smile';
            } else if (entryData.sentiment === 'negative') {
                sentimentIconClass = 'far fa-frown';
            }
            sentimentDisplay.innerHTML = `<i class="${sentimentIconClass}"></i> ${sentimentText}`;
        }
        // You might also want to store the loaded entry's ID if you plan to update it
        // e.g., journalEntryTextarea.dataset.editingEntryId = entryData.id;
        console.log("Editor populated with entry ID:", entryData.id);
    }
    if (recentEntriesList) {
        recentEntriesList.addEventListener('click', function(event) {
            const targetLink = event.target.closest('a.load-entry-link'); // Find the link clicked

            if (targetLink) {
                event.preventDefault(); // Prevent default link navigation if href="#"
                const entryId = targetLink.dataset.entryId;
                console.log("--- JS: Clicked on recent entry link, ID:", entryId);

                if (entryId) {
                    fetch(`/get-journal-entry/${entryId}`) // Calls the new backend route
                        .then(response => {
                            console.log("--- JS: Raw response from /get-journal-entry:", response);
                            if (!response.ok) {
                                return response.json().then(errData => {
                                    throw new Error(errData.message || `HTTP error! Status: ${response.status}`);
                                }).catch(() => {
                                     throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
                                });
                            }
                            return response.json();
                        })
                        .then(data => {
                            console.log("--- JS: Parsed JSON data from /get-journal-entry:", data);
                            if (data.success && data.entry) {
                                populateEditorWithEntry(data.entry);
                            } else {
                                alert('Error loading entry: ' + (data.message || 'Entry data not found.'));
                            }
                        })
                        .catch(error => {
                            console.error('--- JS: Error fetching journal entry:', error);
                            alert('Could not load journal entry: ' + error.message);
                        });
                }
            }
        });
    } else {
        console.warn("--- JS: Recent entries list (id='recentEntriesList') NOT FOUND. ---");
    }
    if (saveEntryBtn) {
        saveEntryBtn.addEventListener('click', function() {
            console.log("Save Entry button clicked.");
            handleSaveJournalEntry(true); // true indicates it's a draft
        });
    }

    // Initialize entryDate input with today's date if empty
    if (entryDateInput && !entryDateInput.value) {
        const today = new Date();
        try {
            entryDateInput.value = today.toISOString().split('T')[0]; // YYYY-MM-DD format
        } catch (e) {
            console.error("Error setting initial date:", e);
            // Fallback if toISOString is not available or fails in a very old browser
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            entryDateInput.value = `${yyyy}-${mm}-${dd}`;
        }
    }
});