from pathlib import Path

BASE_DIR = Path(__file__).parent

# Chrome profile dir (matches your .bat launcher)
CHROME_PROFILE_DIR = BASE_DIR / "ChromeProfile"

# Prompt file
PROMPT_FILE = BASE_DIR / "prompt_translate.json"

# Base/source language
SOURCE_LANG = "en"

# All supported languages
LANGS = ["en", "pl", "de", "it", "fr", "es", "pt", "ar", "hi", "zh", "ja", "ko"]

# Translate to all except SOURCE_LANG
TARGET_LANGS = [lang for lang in LANGS if lang != SOURCE_LANG]

# Human-readable names used in prompt
LANGUAGE_NAMES = {
    "en": "English",
    "pl": "Polish",
    "de": "German",
    "it": "Italian",
    "fr": "French",
    "es": "Spanish",
    "pt": "Portuguese",
    "ar": "Arabic",
    "hi": "Hindi",
    "zh": "Chinese",
    "ja": "Japanese",
    "ko": "Korean",
}

# Runtime
WAIT_FOR_CHAT_READY_SECONDS = 20
INITIAL_PROMPT_WAIT_SECONDS = 20
WAIT_FOR_RESPONSE_SECONDS = 240

JITTER_MIN_SECONDS = 2
JITTER_MAX_SECONDS = 5

# Output handling
SKIP_IF_OUTPUT_EXISTS = False   # False = always overwrite
SAVE_RAW_ON_ERROR = True

# Selenium / ChatGPT
CHATGPT_URL = "https://chatgpt.com"
REMOTE_DEBUGGING_ADDRESS = "127.0.0.1:9222"

# Optional extra safety
REQUIRE_SOURCE_LANG_SEGMENT = True  # require input path to contain /en/