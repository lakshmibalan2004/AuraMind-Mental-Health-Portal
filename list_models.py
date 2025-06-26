# list_models.py
import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv() # Load your .env file

GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')

if GOOGLE_API_KEY:
    try:
        genai.configure(api_key=GOOGLE_API_KEY)
        print("Available models for your API key:")
        for m in genai.list_models():
            # Check if the model supports the 'generateContent' method (used for non-streaming chat)
            # or 'streamGenerateContent' if you were planning to stream
            if 'generateContent' in m.supported_generation_methods:
                print(f"  Model Name: {m.name}")
                print(f"    Display Name: {m.display_name}")
                print(f"    Description: {m.description[:100]}...") # First 100 chars
                print(f"    Supported Methods: {m.supported_generation_methods}\n")
    except Exception as e:
        print(f"An error occurred: {e}")
else:
    print("GOOGLE_API_KEY not found in environment variables.")