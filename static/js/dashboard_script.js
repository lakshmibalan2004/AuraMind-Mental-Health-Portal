// static/js/dashboard_script.js
document.addEventListener('DOMContentLoaded', function () {
    console.log("Dashboard SCRIPT: DOMContentLoaded - Script is starting."); // <<< DEBUG

    const ctx = document.getElementById('moodChart');
    const logMoodButton = document.getElementById('logMoodQuickActionBtn'); // This ID must match your button in HTML
    const exploreResourcesButton = document.getElementById('exploreResourcesBtn');
    const profileIconLinkDashboard = document.getElementById('profileIconLinkDashboard');
    const profileDropdownMenuDashboard = document.getElementById('profileDropdownMenuDashboard');
    

    console.log("Dashboard SCRIPT: profileIconLinkDashboard element:", profileIconLinkDashboard);
    console.log("Dashboard SCRIPT: profileDropdownMenuDashboard element:", profileDropdownMenuDashboard);

    console.log("Dashboard SCRIPT: logMoodButton element:", logMoodButton); // <<< DEBUG - Check if button is found
    

    if (profileIconLinkDashboard && profileDropdownMenuDashboard) {
        console.log("Dashboard SCRIPT: Dashboard Profile icon and dropdown FOUND. Attaching click listener.");
        profileIconLinkDashboard.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            
            console.log("Dashboard SCRIPT: Dashboard Profile icon CLICKED.");
            
            const isShown = profileDropdownMenuDashboard.classList.toggle('show');
            console.log("Dashboard SCRIPT: Dashboard Dropdown 'show' class toggled. Is now shown?", isShown);
            
            if (isShown) {
                profileIconLinkDashboard.classList.add('active'); // Optional
            } else {
                profileIconLinkDashboard.classList.remove('active'); // Optional
            }
        });

        // Optional: Close dropdown if clicked outside - specific to this dropdown
        document.addEventListener('click', function (event) {
            if (profileDropdownMenuDashboard.classList.contains('show') && 
                !profileDropdownMenuDashboard.contains(event.target) && 
                event.target !== profileIconLinkDashboard && !profileIconLinkDashboard.contains(event.target)) {
                
                console.log("Dashboard SCRIPT: Clicked outside dashboard dropdown. Closing it.");
                profileDropdownMenuDashboard.classList.remove('show');
                profileIconLinkDashboard.classList.remove('active'); // Optional
            }
        });
        console.log("Dashboard SCRIPT: Dashboard 'Click outside' listener for dropdown attached.");
    } else {
        if (!profileIconLinkDashboard) console.error("Dashboard SCRIPT: Dashboard Profile icon link (id='profileIconLinkDashboard') NOT FOUND.");
        if (!profileDropdownMenuDashboard) console.error("Dashboard SCRIPT: Dashboard Profile dropdown menu (id='profileDropdownMenuDashboard') NOT FOUND.");
    }
    // --- END: Profile Dropdown Logic for Dashboard ---
    
    if (ctx) {
        console.log("Dashboard SCRIPT: moodChart canvas FOUND."); // <<< DEBUG
        // Check if chart data is available (passed from Flask)
        if (typeof moodChartLabels !== 'undefined' && typeof moodChartValues !== 'undefined' && moodChartLabels.length > 0 && !(moodChartLabels.length === 1 && moodChartLabels[0] === "No Data")) {
            console.log("Dashboard SCRIPT: Chart data IS available. Initializing chart."); // <<< DEBUG
            new Chart(ctx, {
                type: 'bar', // Or 'line'
                data: {
                    labels: moodChartLabels, // Passed from Flask via <script> block in HTML
                    datasets: [{
                        label: 'Mood Level',
                        data: moodChartValues, // Passed from Flask
                        backgroundColor: 'rgba(26, 188, 156, 0.7)', // Teal color with opacity
                        borderColor: 'rgba(26, 188, 156, 1)',
                        borderWidth: 1,
                        borderRadius: 4, // Rounded bars
                        barThickness: 'flex', // Or a fixed number like 20
                        maxBarThickness: 30, // Max thickness
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false, // Important for card layout
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 5, // Assuming mood is 0-5
                            ticks: {
                                stepSize: 1
                            }
                        },
                        x: {
                            grid: {
                                display: false // Hide vertical grid lines for a cleaner look
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false // Hide legend if only one dataset
                        },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed.y !== null) {
                                        label += context.parsed.y;
                                    }
                                    return label;
                                }
                            }
                        }
                    }
                }
            });
        } else {
            // Optional: Display a message if no chart data is available
            const chartContainer = ctx.parentElement;
            if (chartContainer) {
                chartContainer.innerHTML = '<p style="text-align:center; color:#777; margin-top:50px;">No mood data available yet to display the chart.</p>';
            }
            console.warn("Dashboard SCRIPT: Mood chart data (moodChartLabels or moodChartValues) is missing or empty."); // <<< DEBUG
        }
    } else {
        console.warn("Dashboard SCRIPT: Canvas element with ID 'moodChart' NOT found."); // <<< DEBUG
    }

    if (logMoodButton) {
        console.log("Dashboard SCRIPT: logMoodButton FOUND. Attaching click listener."); // <<< DEBUG
        logMoodButton.addEventListener('click', function() {
            console.log('Dashboard SCRIPT: Log Mood quick action button was CLICKED.'); // <<< DEBUG
            
            console.log("Dashboard SCRIPT: Attempting to redirect to /mood-tracker"); // <<< DEBUG
            window.location.href = '/mood-tracker'; 
        });
    } else {
        console.error("Dashboard SCRIPT: Log Mood button (id='logMoodQuickActionBtn') NOT FOUND in the DOM."); // <<< DEBUG
    }
    if (exploreResourcesButton) {
        console.log("Dashboard SCRIPT: exploreResourcesButton FOUND. Attaching click listener.");
        exploreResourcesButton.addEventListener('click', function() {
            console.log('Dashboard SCRIPT: Explore Resources button was CLICKED.');
            console.log("Dashboard SCRIPT: Attempting to redirect to /resources");
            window.location.href = '/resources'; // Assumes /resources is the correct URL
        });
    } else {
        console.error("Dashboard SCRIPT: Explore Resources button (id='exploreResourcesBtn') NOT FOUND in the DOM.");
    }
       setTimeout(function() {
        console.log("Dashboard SCRIPT: Inside setTimeout for chatSupportButton."); // New log
        const chatSupportButton = document.getElementById('chatWithSupportBtn');
        console.log("Dashboard SCRIPT (after timeout): chatSupportButton element:", chatSupportButton);

        if (chatSupportButton) {
            console.log("Dashboard SCRIPT (after timeout): chatSupportButton FOUND. Attaching click listener.");
            chatSupportButton.addEventListener('click', function() {
                console.log('Dashboard SCRIPT (after timeout): Chat with Support button was CLICKED.');
                console.log("Dashboard SCRIPT (after timeout): Attempting to redirect to /chat-support");
                window.location.href = '/chat-support';
            });
        } else {
            console.error("Dashboard SCRIPT (after timeout): Chat with Support button (id='chatWithSupportBtn') NOT FOUND in the DOM.");
        }
    }, 0);
    // Add more dashboard specific JS here if needed
    // e.g., event listeners for quick action buttons, menu toggles, etc.
});