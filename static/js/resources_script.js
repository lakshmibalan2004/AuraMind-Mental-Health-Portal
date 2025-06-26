document.addEventListener('DOMContentLoaded', function() {
    const filterButtons = document.querySelectorAll('.category-filters .filter-btn');
    // **** IMPORTANT: Update this selector to target ONLY the featured cards ****
    const resourceCards = document.querySelectorAll('#featuredResourcesSection .resource-card'); 
    const searchInput = document.getElementById('resourceSearch');

    // Category Filtering
    if (filterButtons.length && resourceCards.length) {
        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                filterButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');

                const filterValue = this.dataset.filter; // e.g., "all", "self-care"

                resourceCards.forEach(card => {
                    const cardCategories = card.dataset.categories.split(',');
                    
                    // If filter is "all", show all (featured) cards.
                    // Otherwise, show cards that match the category.
                    if (filterValue === 'all' || cardCategories.includes(filterValue)) {
                        card.style.display = ''; 
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        });
    }

    // Search Functionality (will now only search within the displayed featured resources)
    if (searchInput && resourceCards.length) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase().trim();
            const currentActiveFilter = document.querySelector('.category-filters .filter-btn.active')?.dataset.filter || 'all';

            resourceCards.forEach(card => {
                // Only consider cards that are currently potentially visible based on the active category filter
                // OR, more simply, just re-evaluate visibility based on search AND category
                const title = card.querySelector('h4')?.textContent.toLowerCase() || '';
                const description = card.querySelector('p')?.textContent.toLowerCase() || '';
                const cardCategories = card.dataset.categories.split(',');
                
                const matchesSearch = title.includes(searchTerm) || description.includes(searchTerm);
                
                let matchesFilter = false;
                if (currentActiveFilter === 'all') {
                    matchesFilter = true; // All (featured) cards match the "all" filter
                } else {
                    matchesFilter = cardCategories.includes(currentActiveFilter);
                }

                if (matchesSearch && matchesFilter) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });

            // If search is cleared, re-apply active category filter by simulating a click
            if (searchTerm === '') {
                const activeFilterButton = document.querySelector(`.category-filters .filter-btn[data-filter="${currentActiveFilter}"]`);
                if (activeFilterButton) {
                    activeFilterButton.click();
                }
            }
        });
    }

    // Profile Dropdown Logic (keep as is)
    const profileIconResources = document.getElementById('profileIconLinkResources');
    const profileDropdownResources = document.getElementById('profileDropdownMenuResources');

    console.log("RESOURCES_SCRIPT: Profile Icon (Resources) element:", profileIconResources);
    console.log("RESOURCES_SCRIPT: Profile Dropdown (Resources) element:", profileDropdownResources);

    if (profileIconResources && profileDropdownResources) {
        console.log("RESOURCES_SCRIPT: Attaching click listener to profile icon (Resources).");
        
        profileIconResources.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation(); // <<< --- ADD THIS TO STOP BUBBLING

            console.log("RESOURCES_SCRIPT: Profile icon (Resources) CLICKED!");

            let currentDisplay = profileDropdownResources.style.display;
            console.log("RESOURCES_SCRIPT: Current dropdown display style BEFORE toggle is: '", currentDisplay, "'");

            if (currentDisplay === 'none' || currentDisplay === '') {
                console.log("RESOURCES_SCRIPT: Setting to 'block'.");
                profileDropdownResources.setAttribute('style', 'display: block !important;');
            } else {
                console.log("RESOURCES_SCRIPT: Setting to 'none'.");
                profileDropdownResources.setAttribute('style', 'display: none !important;');
            }
            console.log("RESOURCES_SCRIPT: Dropdown display style AFTER toggle is now:", profileDropdownResources.style.display);
            setTimeout(function() {
                console.log("RESOURCES_SCRIPT: Dropdown computed style 50ms AFTER toggle is:", window.getComputedStyle(profileDropdownResources).display);
                console.log("RESOURCES_SCRIPT: Dropdown inline style 50ms AFTER toggle is:", profileDropdownResources.getAttribute('style'));
            }, 50); // 50ms delay
        });

        // Click outside to close logic
        
        document.addEventListener('click', function(docEvent) {
            // Check if the dropdown is currently visible AND the click was not on the icon AND not on the dropdown itself
            if (window.getComputedStyle(profileDropdownResources).display === 'block' &&
                profileIconResources && 
                !profileIconResources.contains(docEvent.target) &&
                !profileDropdownResources.contains(docEvent.target)) {
                
                console.log("RESOURCES_SCRIPT: Clicked outside profile dropdown. Hiding using setAttribute.");
                profileDropdownResources.setAttribute('style', 'display: none !important;');
            }
        });
        
        console.log("RESOURCES_SCRIPT: All profile dropdown listeners attached.");

    } else {
        if(!profileIconResources) console.error("RESOURCES_SCRIPT: Element with ID 'profileIconLinkResources' NOT FOUND.");
        if(!profileDropdownResources) console.error("RESOURCES_SCRIPT: Element with ID 'profileDropdownMenuResources' NOT FOUND.");
    }
});
