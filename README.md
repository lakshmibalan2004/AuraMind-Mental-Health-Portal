# AuraMind - Your Simple Mental Health Portal

AuraMind is a web application designed to be a safe space for users to reflect, track their moods, journal their thoughts, find helpful resources, and engage with an AI companion for support.
## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Setup & Installation](#project-setup--installation)
    - [Prerequisites](#prerequisites)
    - [Installation Steps](#installation-steps)
    - [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Folder Structure](#folder-structure)
- [Usage](#usage)
- [Acknowledgements](#acknowledgements)
## Features

*   **User Authentication:** Secure registration, login, and guest access. Includes "Forgot Password" functionality.
*   **Dashboard:** A personalized overview for the user, including a mood chart and resource spotlight.
*   **Mood Tracker:**
    *   Log daily moods using emojis or a slider.
    *   Add optional notes to mood entries.
    *   View recent mood entries.
*   **Journaling:**
    *   Create, view (and potentially edit/delete) dated journal entries.
    *   Automatic sentiment analysis of journal entries using TextBlob.
    *   (Describe any other specific journal features like calendar view, draft saving, etc.)
*   **Chat Support:**
    *   Real-time chat interface using Flask-SocketIO.
    *   Integration with Google Generative AI (Gemini model) for AI-powered responses.
    *   Conversation history management (if implemented).
*   **Resources:**
    *   Curated list of mental health resources.
    *   Filterable by category and searchable.
    *   Featured resources section.
*   **User Profile Management:** (Implied by login/logout, can be expanded)

## Tech Stack

*   **Backend:** Python, Flask
*   **Database:** SQLite (with SQLAlchemy ORM)
*   **Frontend:** HTML, CSS, JavaScript
*   **Real-time Communication:** Flask-SocketIO (with python-eventlet or gevent)
*   **Password Hashing:** Flask-Bcrypt
*   **Sentiment Analysis:** TextBlob
*   **AI Chat:** Google Generative AI SDK (Gemini)
*   **Environment Variables:** python-dotenv
*   **Date/Time Handling:** `datetime`, `dateutil`
*   **Frontend Libraries (if any, like Chart.js, FullCalendar via CDN):**
    *   Chart.js (for mood graphs)
    *   FullCalendar (for mood history calendar)
    *   Font Awesome (for icons)

## Project Setup & Installation

### Prerequisites

*   Python 3.9+
*   pip (Python package installer)
*   (Optional but recommended) A virtual environment (`venv`)

### Installation Steps

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/lakshmibalan2004/AuraMind-Mental-Health-Portal.git 
    cd AuraMind
    ```

2.  **Create and activate a virtual environment (recommended):**
    ```bash
    python -m venv venv
    # On Windows:
    venv\Scripts\activate
    # On macOS/Linux:
    source venv/bin/activate
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

### Environment Variables

This project uses environment variables for sensitive information like API keys.
1.  Create a file named `.env` in the root directory of the project.
2.  Add the following variables to your `.env` file:

    ```env
    # .env file
    # FLASK_APP=app.py # Flask CLI needs this (or set it in your terminal)
    # FLASK_DEBUG=1    # For development mode (or set in app.run)
    
    # Required for AI Chat functionality
    GOOGLE_API_KEY="YOUR_GOOGLE_GEMINI_API_KEY" 
    
    # SECRET_KEY is set by os.urandom(24) in app.py, but if you want to override:
    # FLASK_SECRET_KEY="your_strong_random_secret_key_for_sessions" 
    ```
    **Note:** Ensure the `.env` file is listed in your `.gitignore` file to prevent committing sensitive keys to GitHub.

    Running the Application
1. Initialize/Update the Database:
If this is the first time or if you've made changes to the database models (User, MoodEntry, JournalEntry), initialize the database:
# Ensure FLASK_APP=app.py is set in your environment or .env file
flask init-db
2.Start the Flask development server:
python app.py
3.Open your web browser and navigate to:
http://127.0.0.1:5000

## Folder Structure

*   **AuraMind/** (Root Project Folder)
    *   `app.py` - Main Flask application
    *   **static/**
        *   **css/**
            *   `style.css`
            *   `dashboard.css`
            *   `mood_tracker.css`
            *   `mood_history.css`
            *   `journal_screen.css`
            *   `resources.css`
            *   `chat_support.css`
        *   **js/**
            *   `script.js` (for login/register)
            *   `dashboard_script.js`
            *   `mood_tracker_script.js`
            *   `mood_history_script.js`
            *   `journal_script.js`
            *   `resources_script.js`
            *   `chat_support_script.js`
        *   **images/**
            *   `logo.png`
            *   `default-profile.jpg`
            *   *(List other key images)*
    *   **templates/**
        *   `login.html`
        *   `register.html`
        *   `request_reset.html`
        *   `reset_password.html`
        *   `dashboard_main.html`
        *   `mood_tracker.html`
        *   `mood_history.html`
        *   `journal_screen.html`
        *   `resources.html`
        *   `chat_support.html`
    *   `.env` - Environment variables (GITIGNORED!)
    *   `.gitignore`
    *   `auramind.db` - SQLite database file (GITIGNORED!)
    *   `requirements.txt` - Python dependencies
    *   `README.md` - This file


# Usage
* 1.Register: Create a new account or use the "Continue as Guest" option.
* 2.Login: Access your account.
* 3.Dashboard: Get an overview of your well-being.
* 4.Mood Tracker: Log your daily moods and notes.
* 5.Journal: Write and review your journal entries. Sentiment is analyzed automatically.
* 6.Resources: Browse curated mental health resources. Filter and search for relevant information.
* 7.Chat Support: Engage with an AI companion for support.

# Acknowledgements
* Flask, SQLAlchemy, and other Python libraries used.
* Font Awesome for icons.
* Google Generative AI for the AI chat feature.
