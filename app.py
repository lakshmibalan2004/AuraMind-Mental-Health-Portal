# app.py
import os
from dotenv import load_dotenv
import random
import json 

load_dotenv() # <<< --- VERY IMPORTANT: Call this first

from flask import Flask, render_template, url_for, request, jsonify, session ,redirect,flash
from flask_bcrypt import Bcrypt
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import desc,func
from flask_socketio import SocketIO, emit, join_room, leave_room
from textblob import TextBlob # Assuming you use this for JournalEntry sentiment
from dateutil import tz # Assuming you use this for JournalEntry timezone display
from datetime import datetime, timezone,timedelta
import uuid
import google.generativeai as genai

app = Flask(__name__)
# --- Configuration ---
app.secret_key = os.urandom(24)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///auramind.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)

# --- Global flag to track if GenAI was configured ---
GENAI_CONFIGURED_SUCCESSFULLY = False # Initialize flag

# --- Configure Google Generative AI SDK ---
GOOGLE_API_KEY_FROM_ENV = os.getenv('GOOGLE_API_KEY')
if GOOGLE_API_KEY_FROM_ENV:
    try:
        genai.configure(api_key=GOOGLE_API_KEY_FROM_ENV)
        print(">>> Google Generative AI SDK configured successfully with API Key.")
        GENAI_CONFIGURED_SUCCESSFULLY = True # Set flag on success
    except Exception as e:
        print(f"!!! ERROR configuring Google Generative AI SDK: {e}")
        # GENAI_CONFIGURED_SUCCESSFULLY remains False
else:
    print("!!! WARNING: GOOGLE_API_KEY not found in environment variables. AI Chat will not function correctly.")
    # GENAI_CONFIGURED_SUCCESSFULLY remains False
# --- End Google Generative AI SDK Configuration ---

socketio = SocketIO(app, async_mode='eventlet', cors_allowed_origins="*")

# --- User Model ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(60), nullable=False)
    is_guest = db.Column(db.Boolean, default=False, nullable=False)
    reset_token = db.Column(db.String(100), unique=True, nullable=True)
    reset_token_expiration = db.Column(db.DateTime(timezone=True), nullable=True)
    def __repr__(self): return f"<User {self.email}>"
    def get_reset_token(self, expires_sec=1800): # Token expires in 30 minutes
        """Generates a password reset token."""
        token = os.urandom(32).hex() # Secure random token
        self.reset_token = token
        self.reset_token_expiration = datetime.now(timezone.utc) + timedelta(seconds=expires_sec)
        return token

    @staticmethod
    def verify_reset_token(token):
        """Verifies a password reset token."""
        if not token:
            return None
        user = User.query.filter_by(reset_token=token).first()

        if user and user.reset_token_expiration:
            # Make sure the stored token expiration is treated as UTC (if it came out naive from DB)
            # And compare it with the current time, also in UTC and aware.
            
            # Get current UTC time (aware)
            now_utc = datetime.now(timezone.utc)
            
            # Get token expiration time from DB.
            # If it's naive, make it aware by assuming it's UTC.
            token_exp_from_db = user.reset_token_expiration
            if token_exp_from_db.tzinfo is None or token_exp_from_db.tzinfo.utcoffset(token_exp_from_db) is None:
                # It's naive, assume it was stored as UTC
                token_exp_utc_aware = token_exp_from_db.replace(tzinfo=timezone.utc)
            else:
                # It's already aware, ensure it's converted to UTC for fair comparison if it wasn't already
                token_exp_utc_aware = token_exp_from_db.astimezone(timezone.utc)

            print(f"--- DEBUG verify_reset_token: Now UTC: {now_utc}, Token Expires (UTC aware): {token_exp_utc_aware} ---") # Debug
            if token_exp_utc_aware > now_utc:
                print(f"--- DEBUG verify_reset_token: Token is VALID for user {user.email} ---") # Debug
                return user # Token is valid and not expired
            else:
                print(f"--- DEBUG verify_reset_token: Token EXPIRED for user {user.email} ---") # Debug
        
        print(f"--- DEBUG verify_reset_token: Token NOT found or user/expiration missing ---") # Debug
        return None # Token invalid, expired, or user/expiration missing
# --- MoodEntry Model ---
class MoodEntry(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    mood_value = db.Column(db.String(50), nullable=False)
    note = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    user = db.relationship('User', backref=db.backref('mood_entries', lazy=True))
    def __repr__(self): return f"<MoodEntry {self.id} - User {self.user_id} - Mood {self.mood_value}>"

# --- JournalEntry Model ---
class JournalEntry(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(200), nullable=True)
    content = db.Column(db.Text, nullable=False)
    entry_date = db.Column(db.Date, nullable=False)
    is_draft = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    sentiment_label = db.Column(db.String(20), nullable=True)
    sentiment_score = db.Column(db.Float, nullable=True)
    user = db.relationship('User', backref=db.backref('journal_entries', lazy='dynamic'))
    def __repr__(self): return f"<JournalEntry {self.id} for User {self.user_id} on {self.entry_date}>"


# --- SAMPLE RESOURCES DATA (Can be moved to a separate data.py file later) ---
RESOURCES_DATA = [
    {
        "id": 1, "title": "Coping with Chronic Stress", 
        "description": "Practical strategies and techniques to manage long-term stress effectively.",
        "image_filename": "images/resource_stress_chronic.jpeg", "tags": ["Stress", "Self-Care"], 
        "category_slug": "stress", "url": "https://www.pfizer.com/news/articles/chronic_stress_and_how_to_manage_it", "featured": True
    },
    {
        "id": 2, "title": "Mindfulness Meditation Guide",
        "description": "A beginner's guide to practicing mindfulness daily for stress reduction.",
        "image_filename": "images/resource_mindfulness_guide.jpg", "tags": ["Mindfulness", "Self-Care", "Stress"],
        "category_slug": "self-care", "url": "https://news.harvard.edu/gazette/story/2018/04/less-stress-clearer-thoughts-with-mindfulness-meditation/", "featured": True
    },
    {
        "id": 3, "title": "Understanding Depression",
        "description": "Learn about the symptoms, causes, and treatment options for depression.",
        "image_filename": "images/resource_depression_understanding.jpg", "tags": ["Depression", "Mental Health"],
        "category_slug": "depression", "url": "https://www.nimh.nih.gov/health/topics/depression", "featured": True
    },
    {
        "id": 4, "title": "Boosting Your Motivation",
        "description": "Tips and tricks to find and maintain motivation for your goals.",
        "image_filename": "images/resource_motivation_boost.jpeg", "tags": ["Motivation"],
        "category_slug": "motivation", "url": "https://www.coursera.org/in/articles/how-to-motivate-yourself", "featured": True
    },
    {
        "id": 5, "title": "Emergency Helplines & Support",
        "description": "Quick access to helplines for immediate support in a crisis.",
        "image_filename": "images/resource_helplines.jpg", "tags": ["Helplines", "Support"],
        "category_slug": "helplines", "url": "https://www.nimh.nih.gov/health/find-help", "featured": True
    },
    {
        "id": 6, "title": "The Importance of Self-Care",
        "description": "Why self-care is crucial and how to practice it.",
        "image_filename": "images/resource_selfcare_importance.jpeg", "tags": ["Self-Care"],
        "category_slug": "self-care", "url": "https://www.layahealthcare.ie/thrive/lifestyle/whyisself-careimportant/#:~:text=Self%2Dcare%20is%20a%20crucial,tending%20to%20your%20own%20needs.", "featured": True
    }
]

CATEGORIES_DATA = [
    {"name": "All", "slug": "all"}, {"name": "Self-Care", "slug": "self-care"},
    {"name": "Depression", "slug": "depression"}, {"name": "Stress", "slug": "stress"},
    {"name": "Motivation", "slug": "motivation"}, {"name": "Helplines", "slug": "helplines"}
]
EMOJI_TO_VALUE_MAP = {
    "🥰": 5.0, "😊": 4.5, "🙂": 4.0, "😐": 3.0, 
    "😟": 2.0, "😢": 1.5, "😠": 1.0, "😥": 2.5, 
    "🤯": 1.0, "😴": 2.0 
}
VALUE_TO_EMOJI_MAP = {v: k for k, v in EMOJI_TO_VALUE_MAP.items()}


# --- Flask CLI Commands ---
@app.cli.command("init-db") 
def init_db_command():
    with app.app_context(): db.create_all()
    print("Initialized the database.")

# --- Helper Function to Get User (to avoid repetition) ---
def get_current_user():
    if 'user_id' in session:
        return User.query.get(session['user_id'])
    return None

# --- Routes ---
@app.route('/')
@app.route('/login', methods=['GET'])
def login_page():
    if 'user_id' in session: 
        return redirect(url_for('dashboard_page'))
    return render_template('login.html')

@app.route('/login-action', methods=['POST'])
def login_action():
    if request.method == 'POST':
        data = request.get_json()
        email = data.get('email')
        password_attempt = data.get('password')
        print(f"--- LOGIN ACTION: Received email: {email} ---")
        user = User.query.filter_by(email=email, is_guest=False).first()
        if user and bcrypt.check_password_hash(user.password_hash, password_attempt):
            session['user_id'] = user.id
            session['user_name'] = user.name
            session['is_guest'] = user.is_guest
            print(f"--- LOGIN ACTION: Successful login for {user.name}. Redirecting. ---")
            return jsonify({'success': True, 'message': 'Login successful! Redirecting...', 'redirect_url': url_for('dashboard_page')})
        else:
            print(f"--- LOGIN ACTION: Invalid credentials for {email}. ---")
            return jsonify({'success': False, 'message': 'Invalid email or password.'}), 401
    return jsonify({'success': False, 'message': 'Method not allowed.'}), 405

def send_password_reset_email_simulation(user_obj, token):
    """Simulates sending a password reset email by printing to console."""
    reset_url = url_for('reset_password_page_with_token', token=token, _external=True)
    print("\n" + "="*50)
    print(f"  PASSWORD RESET SIMULATION FOR: {user_obj.email}")
    print(f"  Reset Link: {reset_url}")
    print("  (This link would normally be emailed to the user)")
    print("  The token will expire in 30 minutes.")
    print("="*50 + "\n")

@app.route('/request-password-reset', methods=['GET', 'POST']) # Allow GET for page display
def request_password_reset_page():
    if request.method == 'POST': # This handles the form submission via fetch from the same URL
        data = request.get_json()
        email = data.get('email')
        if not email:
            return jsonify({'success': False, 'message': 'Email is required.'}), 400

        user = User.query.filter_by(email=email, is_guest=False).first()
        message = "If an account with that email exists, instructions to reset your password have been simulated (check your Flask console)."
        
        if user:
            token = user.get_reset_token() 
            db.session.commit() 
            send_password_reset_email_simulation(user, token)
            # Even if user not found, we send a generic success message to prevent email enumeration
        
        return jsonify({'success': True, 'message': message})
    
    # For GET request, just render the page
    return render_template('request_reset.html')


@app.route('/reset-password/<token>', methods=['GET', 'POST']) # Allow GET for page, POST for action from JS
def reset_password_page_with_token(token):
    # For GET request, verify token and render form
    if request.method == 'GET':
        user = User.verify_reset_token(token)
        if not user:
            flash('That is an invalid or expired password reset token.', 'warning')
            return redirect(url_for('request_password_reset_page'))
        return render_template('reset_password.html', token=token) # Pass token to pre-fill hidden input

    # For POST request (from JavaScript on reset_password.html)
    if request.method == 'POST':
        user = User.verify_reset_token(token) # Verify token again on POST
        if not user:
            return jsonify({'success': False, 'message': 'Invalid or expired token. Please request a new reset link.'}), 400

        data = request.get_json()
        new_password = data.get('password')

        if not new_password or len(new_password) < 6: # Add your password validation here
            return jsonify({'success': False, 'message': 'Password must be at least 6 characters.'}), 400

        hashed_password = bcrypt.generate_password_hash(new_password).decode('utf-8')
        user.password_hash = hashed_password
        user.reset_token = None # Crucial: Invalidate the token after use
        user.reset_token_expiration = None
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Your password has been successfully reset! Redirecting to login...'})


@app.route('/register', methods=['GET'])
def register_page_route():
    return render_template('register.html')

@app.route('/register-action', methods=['POST'])
def register_action():
    if request.method == 'POST':
        data = request.get_json()
        if not data: return jsonify({'success': False, 'message': 'No data provided.'}), 400
        name = data.get('name')
        email = data.get('email')
        password_attempt = data.get('password')
        if not name or not email or not password_attempt:
            return jsonify({'success': False, 'message': 'All fields are required.'}), 400
        existing_user = User.query.filter_by(email=email, is_guest=False).first()
        if existing_user:
            return jsonify({'success': False, 'message': 'Email already registered.'}), 409
        hashed_password = bcrypt.generate_password_hash(password_attempt).decode('utf-8')
        new_user = User(name=name, email=email, password_hash=hashed_password, is_guest=False)
        try:
            db.session.add(new_user)
            db.session.commit()
            print(f"--- REGISTER ACTION: Registered new user: {email} ---")
            return jsonify({'success': True, 'message': 'Registration successful! Please log in.','redirect_url': url_for('login_page')})
        except Exception as e:
            db.session.rollback(); print(f"Error during registration: {e}")
            return jsonify({'success': False, 'message': 'Registration failed due to a server error.'}), 500
    return jsonify({'success': False, 'message': 'Method not allowed.'}), 405

@app.route('/guest-login', methods=['POST'])
def guest_login_action():
    guest_email = f"guest_{uuid.uuid4().hex[:12]}@auramind.guest"
    guest_name = "Guest User"
    dummy_password_for_hash = str(uuid.uuid4()) 
    hashed_guest_password = bcrypt.generate_password_hash(dummy_password_for_hash).decode('utf-8')
    new_guest_user = User(name=guest_name, email=guest_email, password_hash=hashed_guest_password, is_guest=True)
    try:
        db.session.add(new_guest_user); db.session.commit()
        session['user_id'] = new_guest_user.id; session['user_name'] = new_guest_user.name; session['is_guest'] = True
        print(f"--- GUEST LOGIN ACTION: Created guest user ID: {new_guest_user.id}. Redirecting. ---")
        return jsonify({'success': True, 'message': 'Continuing as guest...', 'redirect_url': url_for('dashboard_page')})
    except Exception as e:
        db.session.rollback(); print(f"Error during guest login creation: {e}")
        return jsonify({'success': False, 'message': 'Could not continue as guest.'}), 500

@app.route('/dashboard')
def dashboard_page():
    if 'user_id' not in session:
        flash('Please log in to access the dashboard.', 'warning'); return redirect(url_for('login_page'))
    user = User.query.get(session['user_id'])
    if not user:
        session.clear(); flash('User not found. Please log in again.', 'error'); return redirect(url_for('login_page'))
    user_email_to_pass = user.email if not user.is_guest else None
    mood_chart_labels = []
    mood_chart_values = []
    recent_moods_for_chart = MoodEntry.query.filter_by(user_id=user.id)\
                                      .order_by(MoodEntry.timestamp.asc())\
                                      .limit(14)\
                                      .all()
    if recent_moods_for_chart:
        for entry in recent_moods_for_chart:
            label_date = entry.timestamp.replace(tzinfo=timezone.utc).astimezone(tz.tzlocal()) # Convert to local
            mood_chart_labels.append(label_date.strftime('%b %d'))
            try:
                # If mood_value is already a number (e.g., from slider)
                mood_value_numeric = float(entry.mood_value) 
                mood_chart_values.append(mood_value_numeric)
            except ValueError:
                # If mood_value is an emoji string, map it to a number
                # This mapping needs to be defined by you.
                emoji_to_value_map = {
                    "🥰": 5.0, "😊": 4.5, "🙂": 4.0, "😐": 3.0, 
                    "😟": 2.0, "😢": 1.5, "😠": 1.0, "😥": 2.5, 
                    "🤯": 1.0, "😴": 2.0 
                    # Add all your emojis from mood_tracker.html and assign numeric values
                }
                mood_value_numeric = emoji_to_value_map.get(entry.mood_value, 0) # Default to 0 if emoji not found
                mood_chart_values.append(mood_value_numeric)
    else:
        # Provide default empty data or a message if no moods are logged
        mood_chart_labels = ["No Data"]
        mood_chart_values = [0]
        print(f"--- DASHBOARD: No mood entries found for user {user.name} to display in chart. ---")

    featured_resources = [r for r in RESOURCES_DATA if r.get("featured")]
    spotlight_resource = None
    if featured_resources:
        spotlight_resource = random.choice(featured_resources) # Select one randomly
        # Or, to always show the first one:
        # spotlight_resource = featured_resources[0] 
    print(f"--- DASHBOARD: Spotlight resource: {spotlight_resource['title'] if spotlight_resource else 'None'} ---")
    print(f"--- DASHBOARD: Rendering for user: {user.name}, is_guest: {user.is_guest} ---")
    return render_template('dashboard_main.html', user_name=user.name, is_guest=user.is_guest, user_email=user_email_to_pass,active_page='dashboard',mood_labels=mood_chart_labels, mood_values=mood_chart_values,spotlight_resource=spotlight_resource)

@app.route('/mood-tracker')
def mood_tracker_page():
    if 'user_id' not in session:
        flash('Please log in.', 'warning'); return redirect(url_for('login_page'))
    user = User.query.get(session['user_id'])
    if not user:
        session.clear(); flash('User not found.', 'error'); return redirect(url_for('login_page'))
    recent_entries_db = MoodEntry.query.filter_by(user_id=user.id).order_by(desc(MoodEntry.timestamp)).limit(5).all()
    recent_mood_entries = [{'mood_value': entry.mood_value, 'note': entry.note, 'formatted_timestamp': entry.timestamp.replace(tzinfo=timezone.utc).astimezone(None).strftime('%b %d, %Y at %I:%M %p')} for entry in recent_entries_db]
    user_email_to_pass = user.email if not user.is_guest else None
    return render_template('mood_tracker.html', user_name=user.name, is_guest=user.is_guest, user_email=user_email_to_pass, recent_mood_entries=recent_mood_entries)

@app.route('/save-mood-entry', methods=['POST'])
def save_mood_entry():
    if 'user_id' not in session: return jsonify({'success': False, 'message': 'User not logged in.'}), 401
    data = request.get_json()
    if not data: return jsonify({'success': False, 'message': 'No data received.'}), 400
    mood_value, note = data.get('mood'), data.get('note')
    if not mood_value: return jsonify({'success': False, 'message': 'Mood value is required.'}), 400
    try:
        new_entry = MoodEntry(user_id=session['user_id'], mood_value=str(mood_value), note=note if note else None)
        db.session.add(new_entry); db.session.commit()
        print(f"--- Mood entry saved for user {session['user_id']}: Mood - {mood_value} ---")
        return jsonify({'success': True, 'message': 'Mood entry saved successfully!'})
    except Exception as e:
        db.session.rollback(); print(f"Error saving mood entry: {e}")
        return jsonify({'success': False, 'message': 'Failed to save mood entry.'}), 500

@app.route('/journal')
def journal_page():
    if 'user_id' not in session: flash('Please log in.', 'warning'); return redirect(url_for('login_page'))
    user = User.query.get(session['user_id'])
    if not user: session.clear(); flash('User not found.', 'error'); return redirect(url_for('login_page'))
    user_email_to_pass = user.email if not user.is_guest else None
    entries_db = user.journal_entries.order_by(desc(JournalEntry.entry_date), desc(JournalEntry.created_at)).limit(5).all()
    recent_journal_entries = [{'id': e.id, 'title': e.title or "Entry for " + e.entry_date.strftime('%b %d'), 'content_snippet': (e.content[:70] + '...') if e.content and len(e.content) > 70 else e.content, 'entry_date_formatted': e.entry_date.strftime('%b %d, %Y'), 'created_at_formatted': e.created_at.astimezone(tz.tzlocal()).strftime('%b %d, %Y at %I:%M %p')} for e in entries_db]
    current_dt = datetime.now(timezone.utc)
    return render_template('journal_screen.html', user_name=user.name, is_guest=user.is_guest, user_email=user_email_to_pass, active_page='journal_entries', current_month=current_dt.month, current_year=current_dt.year, recent_journal_entries=recent_journal_entries)

@app.route('/save-journal-entry', methods=['POST'])
def save_journal_entry():
    if 'user_id' not in session: return jsonify({'success': False, 'message': 'User not logged in.'}), 401
    data = request.get_json(); print(f"--- /save-journal-entry: Received data: {data} ---")
    if not data: return jsonify({'success': False, 'message': 'No data received.'}), 400
    entry_text, entry_date_str, is_draft = data.get('text'), data.get('date'), data.get('is_draft', True)
    if not entry_text or not entry_date_str: return jsonify({'success': False, 'message': 'Entry text and date are required.'}), 400
    try: entry_date_obj = datetime.strptime(entry_date_str, '%Y-%m-%d').date()
    except ValueError as ve: return jsonify({'success': False, 'message': f'Invalid date format: {ve}'}), 400
    sentiment_label, sentiment_score = "neutral", 0.0
    if entry_text.strip():
        try: 
            blob = TextBlob(entry_text); 
            sentiment_score = blob.sentiment.polarity
            if sentiment_score > 0.1: sentiment_label = "positive"
            elif sentiment_score < -0.1: sentiment_label = "negative"
        except Exception as sentiment_e: 
            print(f"--- Error during sentiment analysis: {sentiment_e} ---")
    try:
        entry = JournalEntry.query.filter_by(user_id=session['user_id'], entry_date=entry_date_obj).first()
        action = "updated" if entry else "saved"
        if entry: entry.content, entry.is_draft, entry.sentiment_label, entry.sentiment_score, entry.updated_at = entry_text, is_draft, sentiment_label, sentiment_score, datetime.now(timezone.utc)
        else: entry = JournalEntry(user_id=session['user_id'], content=entry_text, entry_date=entry_date_obj, is_draft=is_draft, sentiment_label=sentiment_label, sentiment_score=sentiment_score); db.session.add(entry)
        db.session.commit()
        print(f"--- Journal entry {action} (ID: {entry.id}) for user {session['user_id']} on {entry_date_str} ---")
        return jsonify({'success': True, 'message': f"Journal entry {action} successfully!", 'entry_id': entry.id,'sentiment': sentiment_label})
    except Exception as e:
        db.session.rollback(); print(f"--- EXCEPTION DURING DB OP: {e} ---"); import traceback; traceback.print_exc()
        return jsonify({'success': False, 'message': 'Failed to save journal entry.'}), 500

@app.route('/get-journal-entry/<int:entry_id>', methods=['GET'])
def get_journal_entry(entry_id):
    if 'user_id' not in session: return jsonify({'success': False, 'message': 'User not logged in.'}), 401
    entry = JournalEntry.query.filter_by(id=entry_id, user_id=session['user_id']).first()
    if entry: return jsonify({'success': True, 'entry': {'id': entry.id, 'text': entry.content, 'date': entry.entry_date.strftime('%Y-%m-%d'), 'is_draft': entry.is_draft, 'sentiment': entry.sentiment_label or "neutral"}})
    else: return jsonify({'success': False, 'message': 'Entry not found or access denied.'}), 404


@app.route('/resources')
def resources_page():
    user = get_current_user()
    if not user:
        flash('Please log in to access resources.', 'warning')
        return redirect(url_for('login_page'))

    user_email_to_pass = user.email if not user.is_guest else None
    
    featured_resources = [r for r in RESOURCES_DATA if r.get("featured")]
    
    print("--- DEBUG: RESOURCES_DATA passed to template ---")
    for res_data_item in RESOURCES_DATA:
        print(f"  AllRes: Title: {res_data_item.get('title')}, URL: {res_data_item.get('url')}")

    print("--- DEBUG: featured_resources being passed to template ---")
    for featured_res_item in featured_resources:
        print(f"  Featured: Title: {featured_res_item.get('title')}, URL: {featured_res_item.get('url')}")
    # --- End Debug Prints ---

    return render_template('resources.html',
                           user_name=user.name,
                           is_guest=user.is_guest,
                           user_email=user_email_to_pass,
                           active_page='resources', 
                           categories=CATEGORIES_DATA,
                           featured_resources=featured_resources,
                           all_resources=RESOURCES_DATA) # Keep passing all for JS if needed later

@app.route('/chat-support')
def chat_support_page():
    if 'user_id' not in session: flash('Please log in.', 'warning'); return redirect(url_for('login_page'))
    user = User.query.get(session['user_id'])
    user_email_to_pass, current_user_name = (user.email if not user.is_guest else None) if user else None, user.name if user else "User"
    return render_template('chat_support.html', user_name=current_user_name, is_guest=session.get('is_guest', False), user_email=user_email_to_pass)

@socketio.on('connect')
def handle_connect():
    user_id = session.get('user_id')
    if user_id: join_room(str(user_id)); print(f"Client connected: {request.sid}, User ID: {user_id}, joined room: {user_id}")
    else: print(f"Anonymous client connected: {request.sid}")
    emit('connection_response', {'message': 'Successfully connected to AuraMind Chat!'})

@socketio.on('disconnect')
def handle_disconnect():
    user_id = session.get('user_id'); print(f"Client disconnected: {request.sid}, User ID: {user_id}")
    if user_id: leave_room(str(user_id))

@socketio.on('user_message')
def handle_user_message(data):
    user_id, user_name, message_text = session.get('user_id'), session.get('user_name', 'User'), data.get('message')
    ai_companion_name = "Dr. Empathy" # Default or get from client if multiple AIs
    if not message_text: emit('ai_response', {'text': "Message empty.", 'sender': ai_companion_name}); return
    print(f"Received from User {user_id} ({user_name}): '{message_text}'")

    global GENAI_CONFIGURED_SUCCESSFULLY # Use the global flag
    if not GENAI_CONFIGURED_SUCCESSFULLY:
        print("ERROR: GenAI SDK not configured. Cannot process message.")
        emit('ai_response', {'text': "Sorry, I'm having connection issues. Please try later.", 'sender': ai_companion_name})
        return 
    try:
        #model = genai.GenerativeModel('gemini-pro', system_instruction=f"You are {ai_companion_name}, a caring AI from AuraMind for emotional support on topics like anxiety, stress, mindfulness. Keep responses concise, empathetic. Address user as {user_name}.")
        model_name_to_use = 'models/gemini-1.5-flash-latest'
        print(f"--- Attempting to use GenAI model: {model_name_to_use} ---")
        model = genai.GenerativeModel(
        model_name_to_use,
        system_instruction=f"You are {ai_companion_name}, a caring AI from AuraMind for emotional support on topics like anxiety, stress, mindfulness. Keep responses concise, empathetic. Address user as {user_name}."
    )
        chat_history_from_session = session.get('chat_history', [])
        
        # --- CORRECTED HISTORY CONSTRUCTION ---
        api_history = []
        for entry in chat_history_from_session:
            # 'parts' should be a list of strings for simple text.
            # The model.start_chat expects this structure.
            if entry.get('role') and isinstance(entry.get('parts'), list):
                # Ensure parts are just strings
                string_parts = [p if isinstance(p, str) else (p.get('text') if isinstance(p, dict) else '') for p in entry['parts']]
                string_parts = [p for p in string_parts if p] # Filter out empty strings
                if string_parts: # Only add if there are non-empty parts
                    api_history.append({'role': entry['role'], 'parts': string_parts})
            else:
                print(f"Skipping malformed history entry: {entry}")
        # --- END CORRECTED HISTORY CONSTRUCTION ---

        print(f"API History (len {len(api_history)}): {api_history}")
        chat = model.start_chat(history=api_history) # Pass the structured history

        print(f"Sending to GenAI for user '{user_name}': '{message_text}'")
        # Sending a simple string for the user's current message is usually fine.
        # The SDK wraps it into the necessary Content/Part structure.
        response = chat.send_message(message_text)

        ai_response_text = ""
        if hasattr(response, 'text') and response.text:
            ai_response_text = response.text
        else: # Fallback if response.text isn't directly available or for multi-part
            for part in response.parts: # response.parts should exist
                if hasattr(part, 'text'):
                    ai_response_text += part.text
        
        if not ai_response_text.strip(): 
            ai_response_text = "I'm reflecting on that. Could you tell me a bit more?"
            print("GenAI returned an empty or whitespace-only response.")
        else:
            print(f"Raw GenAI Response Text: '{ai_response_text}'")
        
        # Update session history (store parts as a list of simple strings)
        current_chat_history = session.get('chat_history', []) # Get fresh copy
        current_chat_history.append({'role': 'user', 'parts': [message_text]})
        current_chat_history.append({'role': 'model', 'parts': [ai_response_text]})
        
        MAX_HISTORY_TURNS = 10 
        session['chat_history'] = current_chat_history[-MAX_HISTORY_TURNS:]
        session.modified = True

        emit('ai_response', {'text': ai_response_text, 'sender': ai_companion_name})

    except Exception as e:
        print(f"ERROR calling Google Generative AI or processing response: {e}")
        import traceback
        traceback.print_exc()
        emit('ai_response', {'text': "Sorry, an error occurred while thinking. Try again.", 'sender': ai_companion_name})

@app.route('/logout')
def logout_action():
    session.clear(); print("--- LOGGED OUT & Session Cleared ---")
    return redirect(url_for('login_page'))

if __name__ == '__main__':
    print("Starting Flask-SocketIO server...")
    print("-----------------------------------------------------") # Optional separator
    print("AuraMind is running! Access it at:")
    print("  Local:   http://127.0.0.1:5000")
    # If you want to remind about access from other devices on the same network (due to host='0.0.0.0')
    # You'd need to find your machine's local IP address (e.g., 192.168.1.X)
    # print("  Network: http://<YOUR_LOCAL_IP_ADDRESS>:5000") 
    print("-----------------------------------------------------")
    print("Press CTRL+C to quit.")

    try: 
        socketio.run(app, debug=True, host='0.0.0.0', port=5000)
    except ImportError: 
        print("WARN: eventlet/gevent not installed. SocketIO may be less efficient (using Flask's default Werkzeug server).")
        app.run(debug=True, host='0.0.0.0', port=5000)
    except Exception as e:
        print(f"!!! An error occurred while trying to start the server: {e}")