document.addEventListener('DOMContentLoaded', function () {
    const profileIconLink = document.getElementById('profileIconLink');
    const profileDropdownMenu = document.getElementById('profileDropdownMenu');
    const switchToSliderBtn = document.getElementById('switchToSliderBtn');
    const moodSliderContainer = document.getElementById('moodSliderContainer');
    const moodRangeSlider = document.getElementById('moodRange');
    const sliderValueDisplay = document.getElementById('sliderValueDisplay');
    const emojiSelector = document.querySelector('.emoji-selector');
    const selectedMoodValueInput = document.getElementById('selectedMoodValue');
    const moodEmojis = document.querySelectorAll('.emoji-option');
    const saveMoodBtn = document.getElementById('saveMoodBtn');
    const moodNoteTextarea = document.getElementById('moodNote');
    const entryTimestampDisplay = document.getElementById('entryTimestamp');
    const saveMoodMessageDiv = document.getElementById('saveMoodMessage');

    let currentInputMode = 'emoji'; // 'emoji' or 'slider'

    // Emoji selection logic
    moodEmojis.forEach(emoji => {
        emoji.addEventListener('click', function() {
            if (currentInputMode === 'slider') {
                if(emojiSelector) emojiSelector.style.display = 'flex';
                if(moodSliderContainer) moodSliderContainer.style.display = 'none';
                if(switchToSliderBtn) switchToSliderBtn.textContent = 'Switch to Slider';
                currentInputMode = 'emoji';
            }

            moodEmojis.forEach(e => e.classList.remove('selected'));
            this.classList.add('selected');
            selectedMoodValueInput.value = this.dataset.mood; // Assumes data-mood stores the emoji/value
            console.log('Selected emoji mood:', this.dataset.mood);
            updateTimestampDisplay();
        });
    });
    if (profileIconLink && profileDropdownMenu) {
        console.log("MOOD TRACKER SCRIPT: Profile icon and dropdown elements found. Attaching listeners.");
        profileIconLink.addEventListener('click', function (event) {
            event.preventDefault(); // Prevent default link behavior if it's an <a>
            event.stopPropagation(); // Prevent click from bubbling up to document
            console.log("MOOD TRACKER SCRIPT: Profile icon CLICKED.");
            // Toggle visibility of the dropdown
            const isShown = profileDropdownMenu.classList.toggle('show');
            console.log("MOOD TRACKER SCRIPT: Dropdown 'show' class toggled. Is now shown?", isShown);
            if (isShown) {
                profileIconLink.classList.add('active'); // Optional: style for active icon
            } else {
                profileIconLink.classList.remove('active');
            }
        });
         // Optional: Close dropdown if clicked outside
        document.addEventListener('click', function (event) {
            // If the dropdown is visible and the click is outside the dropdown and not on the icon
            if (profileDropdownMenu.classList.contains('show') && 
                !profileDropdownMenu.contains(event.target) && 
                event.target !== profileIconLink && !profileIconLink.contains(event.target)) {
                console.log("MOOD TRACKER SCRIPT: Clicked outside dropdown. Closing it.");
                profileDropdownMenu.classList.remove('show');
                profileIconLink.classList.remove('active');
            }
        });
    } else {
        if (!profileIconLink) console.error("MOOD TRACKER SCRIPT: Profile icon link (id='profileIconLink') NOT FOUND.");
        if (!profileDropdownMenu) console.error("MOOD TRACKER SCRIPT: Profile dropdown menu (id='profileDropdownMenu') NOT FOUND.");
    }
    // --- END: Profile Dropdown Logic ---
    
    if (switchToSliderBtn) {
        switchToSliderBtn.addEventListener('click', function () {
            if (currentInputMode === 'emoji') {
                if(emojiSelector) emojiSelector.style.display = 'none';
                if(moodSliderContainer) moodSliderContainer.style.display = 'block';
                this.textContent = 'Switch to Emoji';
                currentInputMode = 'slider';
                if(moodRangeSlider) selectedMoodValueInput.value = moodRangeSlider.value; // Use slider's numeric value
                console.log('Switched to slider. Current slider mood value:', selectedMoodValueInput.value);
            } else {
                if(emojiSelector) emojiSelector.style.display = 'flex';
                if(moodSliderContainer) moodSliderContainer.style.display = 'none';
                this.textContent = 'Switch to Slider';
                currentInputMode = 'emoji';
                moodEmojis.forEach(e => e.classList.remove('selected'));
                selectedMoodValueInput.value = ''; // Clear when switching back to emoji, user must select
                console.log('Switched to emoji.');
            }
            updateTimestampDisplay();
        });
    }

    if (moodRangeSlider && sliderValueDisplay) {
        moodRangeSlider.addEventListener('input', function () {
            sliderValueDisplay.textContent = this.value;
            if (currentInputMode === 'slider') {
                selectedMoodValueInput.value = this.value;
                console.log('Slider mood value changed:', this.value);
                updateTimestampDisplay();
            }
        });
    }

    function updateTimestampDisplay() {
        if (entryTimestampDisplay) {
            const now = new Date();
            entryTimestampDisplay.textContent = "Entry for: " + now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + " at " + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        }
    }
    updateTimestampDisplay(); // Initial call

    function showSaveMessage(text, type) {
        if (saveMoodMessageDiv) {
            saveMoodMessageDiv.textContent = text;
            saveMoodMessageDiv.className = 'message ' + type;
            saveMoodMessageDiv.style.display = 'block';
            const timeout = type === 'success' ? 1500 : 3000; // Shorter for success before reload
            setTimeout(() => {
                if (saveMoodMessageDiv) saveMoodMessageDiv.style.display = 'none';
            }, timeout);
        } else {
            alert(text); // Fallback
        }
    }

    if (saveMoodBtn) {
        saveMoodBtn.addEventListener('click', function() {
            let moodToSave = selectedMoodValueInput.value;

            if (currentInputMode === 'slider' && moodRangeSlider) {
                // If in slider mode, ensure moodToSave is the slider's numeric value
                // You might want to map this number to an emoji or a descriptive word here or on backend
                // For now, we'll send the number if it's a slider.
                // Or, if you ALWAYS want to send the emoji string even from slider, you'd need a mapping.
                // Assuming for now, data-mood on emojis are emojis, and slider sends number.
                // Backend's MoodEntry.mood_value can store either.
                moodToSave = moodRangeSlider.value; // Example: Sending numeric value from slider
            }
            
            const note = moodNoteTextarea.value.trim();

            if (!moodToSave) { // Check if moodToSave has a value
                showSaveMessage('Please select a mood or use the slider.', 'error');
                return;
            }

            // Clear previous save message
            if (saveMoodMessageDiv) {
                saveMoodMessageDiv.style.display = 'none';
                saveMoodMessageDiv.textContent = '';
            }

            console.log('Saving Mood (frontend):');
            console.log('Mood:', moodToSave);
            console.log('Note:', note);
            console.log('Input Mode:', currentInputMode);

            fetch('/save-mood-entry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({ mood: moodToSave, note: note, })
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(errData => {
                        throw new Error(errData.message || `HTTP error! Status: ${response.status}`);
                    }).catch(() => { throw new Error(`HTTP error! Status: ${response.status}`); });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    showSaveMessage(data.message || 'Mood entry saved successfully!', 'success');
                    // Reload the page to see the updated list of recent entries
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000); // Delay reload slightly to allow user to see success message
                } else {
                    showSaveMessage('Failed to save mood: ' + (data.message || 'Unknown error from server'), 'error');
                }
            })
            .catch(error => {
                console.error('Error saving mood:', error);
                showSaveMessage('An error occurred while saving your mood: ' + error.message, 'error');
            });
        });
    }
});