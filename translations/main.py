import argparse
import json
import random
import re
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

import psutil
from selenium import webdriver
from selenium.common.exceptions import (
    ElementClickInterceptedException,
    JavascriptException,
    NoSuchElementException,
    StaleElementReferenceException,
    TimeoutException,
)
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

import config


JSON_CODEBLOCK_RE = re.compile(r"```json\s*(.*?)\s*```", re.IGNORECASE | re.DOTALL)
GENERIC_CODEBLOCK_RE = re.compile(r"```\s*(.*?)\s*```", re.DOTALL)


@dataclass
class TranslationResult:
    lang: str
    status: str  # OK / SKIP / ERROR
    message: str = ""
    out_path: Optional[Path] = None


def ensure_dirs():
    config.CHROME_PROFILE_DIR.mkdir(parents=True, exist_ok=True)


def check_chrome_running_debug() -> bool:
    for proc in psutil.process_iter(["name"]):
        name = (proc.info.get("name") or "").lower()
        if "chrome" not in name:
            continue
        try:
            cmdline = proc.cmdline()
            if any("--remote-debugging-port=9222" in arg for arg in cmdline):
                return True
        except Exception:
            continue
    return False


def setup_driver_for_existing_chrome() -> webdriver.Chrome:
    from selenium.webdriver.chrome.options import Options

    opts = Options()
    opts.add_experimental_option("debuggerAddress", config.REMOTE_DEBUGGING_ADDRESS)

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=opts)
    time.sleep(1.5)
    return driver


def wait_for_chat_ready(driver: webdriver.Chrome):
    WebDriverWait(driver, config.WAIT_FOR_CHAT_READY_SECONDS).until(
        EC.presence_of_element_located(
            (By.CSS_SELECTOR, "#prompt-textarea, textarea, div[contenteditable='true']")
        )
    )


def open_fresh_chat_tab(driver: webdriver.Chrome):
    driver.execute_script(f"window.open('{config.CHATGPT_URL}', '_blank');")
    driver.switch_to.window(driver.window_handles[-1])
    time.sleep(3)
    wait_for_chat_ready(driver)


def close_current_tab_if_possible(driver: webdriver.Chrome):
    try:
        if len(driver.window_handles) > 1:
            current = driver.current_window_handle
            driver.close()
            remaining = [h for h in driver.window_handles if h != current]
            if remaining:
                driver.switch_to.window(remaining[-1])
    except Exception:
        pass


def safe_sleep(seconds: float):
    time.sleep(max(0.0, seconds))


def get_composer(driver: webdriver.Chrome):
    selectors = [
        "#prompt-textarea",
        "div[contenteditable='true']",
        "textarea",
    ]
    for sel in selectors:
        try:
            elements = driver.find_elements(By.CSS_SELECTOR, sel)
            for el in elements:
                if el.is_displayed() and el.is_enabled():
                    return el
        except Exception:
            pass
    return None


def clear_composer_fallback(el: WebElement):
    try:
        el.click()
    except Exception:
        pass

    try:
        el.send_keys(Keys.CONTROL, "a")
        el.send_keys(Keys.DELETE)
    except Exception:
        pass


def set_composer_text(driver: webdriver.Chrome, text: str) -> bool:
    el = get_composer(driver)
    if not el:
        return False

    try:
        driver.execute_script("arguments[0].focus();", el)
        safe_sleep(0.2)
    except Exception:
        pass

    try:
        if el.tag_name.lower() == "textarea":
            driver.execute_script(
                """
                const el = arguments[0];
                const value = arguments[1];
                const proto = window.HTMLTextAreaElement.prototype;
                const desc = Object.getOwnPropertyDescriptor(proto, "value");
                if (desc && desc.set) {
                    desc.set.call(el, value);
                } else {
                    el.value = value;
                }
                el.dispatchEvent(new Event("input", { bubbles: true }));
                el.dispatchEvent(new Event("change", { bubbles: true }));
                """,
                el,
                text,
            )
        else:
            driver.execute_script(
                r"""
                const el = arguments[0];
                const value = arguments[1];
                el.focus();
                el.innerHTML = "";
                el.textContent = value;
                el.dispatchEvent(new InputEvent("input", {
                    bubbles: true,
                    cancelable: true,
                    data: value,
                    inputType: "insertText"
                }));
                el.dispatchEvent(new Event("change", { bubbles: true }));
                """,
                el,
                text,
            )

        safe_sleep(0.3)
        return True
    except Exception:
        pass

    try:
        clear_composer_fallback(el)
        el.send_keys(text)
        safe_sleep(0.3)
        return True
    except Exception:
        return False


def click_element_js(driver: webdriver.Chrome, el: WebElement) -> bool:
    try:
        driver.execute_script("arguments[0].click();", el)
        return True
    except Exception:
        return False


def click_send(driver: webdriver.Chrome) -> bool:
    selectors = [
        "button[data-testid='send-button']",
        "button[aria-label*='Send']",
        "button[aria-label*='Wyślij']",
        "button[aria-label*='Wyslij']",
        "button[aria-label*='Enviar']",
    ]
    for sel in selectors:
        try:
            btns = driver.find_elements(By.CSS_SELECTOR, sel)
            for btn in btns:
                if btn.is_displayed() and btn.is_enabled():
                    try:
                        btn.click()
                        return True
                    except Exception:
                        if click_element_js(driver, btn):
                            return True
        except Exception:
            pass
    return False


def send_message(driver: webdriver.Chrome, text: str) -> bool:
    if not set_composer_text(driver, text):
        return False
    return click_send(driver)


def load_prompt_file() -> dict:
    return json.loads(config.PROMPT_FILE.read_text(encoding="utf-8"))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Translate one EN JSON file into all configured target languages using ChatGPT."
    )
    parser.add_argument(
        "input_file",
        type=str,
        help=r"Path to source EN JSON file, e.g. C:\...\locales\en\locations.json",
    )
    return parser.parse_args()


def validate_input_file(path_str: str) -> Path:
    p = Path(path_str)

    if not p.exists():
        raise FileNotFoundError(f"Input file does not exist: {p}")

    if not p.is_file():
        raise ValueError(f"Input path is not a file: {p}")

    if p.suffix.lower() != ".json":
        raise ValueError(f"Input file must be a .json file: {p}")

    if config.REQUIRE_SOURCE_LANG_SEGMENT:
        parts = [part.lower() for part in p.parts]
        if config.SOURCE_LANG.lower() not in parts:
            raise ValueError(
                f"Input path must contain a '{config.SOURCE_LANG}' path segment, got: {p}"
            )

    return p


def read_json_file(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def is_valid_json_file(path: Path) -> bool:
    try:
        if not path.exists() or path.stat().st_size == 0:
            return False
        json.loads(path.read_text(encoding="utf-8"))
        return True
    except Exception:
        return False


def derive_output_path(source_en_path: Path, target_lang: str) -> Path:
    parts = list(source_en_path.parts)
    replaced = False

    for i, part in enumerate(parts):
        if part.lower() == config.SOURCE_LANG.lower():
            parts[i] = target_lang
            replaced = True
            break

    if not replaced:
        raise ValueError(
            f"Could not derive output path because '{config.SOURCE_LANG}' segment was not found in: {source_en_path}"
        )

    return Path(*parts)


def count_assistant_messages(driver: webdriver.Chrome) -> int:
    return len(driver.find_elements(By.CSS_SELECTOR, "div[data-message-author-role='assistant']"))


def is_generation_in_progress(driver: webdriver.Chrome) -> bool:
    selectors = [
        "button[aria-label*='Stop']",
        "button[data-testid*='stop']",
        "button[aria-label*='Zatrzymaj']",
        "button[aria-label*='Detener']",
        "button[aria-label*='Arrêter']",
    ]
    for sel in selectors:
        try:
            btns = driver.find_elements(By.CSS_SELECTOR, sel)
            if any(b.is_displayed() for b in btns):
                return True
        except Exception:
            pass
    return False


def get_last_assistant_message(driver: webdriver.Chrome) -> Optional[WebElement]:
    try:
        msgs = driver.find_elements(By.CSS_SELECTOR, "div[data-message-author-role='assistant']")
        if not msgs:
            return None
        return msgs[-1]
    except Exception:
        return None


def get_assistant_messages_after_index(driver: webdriver.Chrome, prev_count: int) -> list[WebElement]:
    try:
        msgs = driver.find_elements(By.CSS_SELECTOR, "div[data-message-author-role='assistant']")
        return msgs[prev_count:]
    except Exception:
        return []


def normalize_text(text: str) -> str:
    return (text or "").replace("\r\n", "\n").replace("\r", "\n").strip()


def extract_json_codeblock_from_text(text: str) -> Optional[str]:
    text = normalize_text(text)
    if not text:
        return None

    m = JSON_CODEBLOCK_RE.search(text)
    if m:
        return m.group(1).strip()

    m = GENERIC_CODEBLOCK_RE.search(text)
    if m:
        candidate = m.group(1).strip()
        try:
            json.loads(candidate)
            return candidate
        except Exception:
            pass

    try:
        json.loads(text)
        return text
    except Exception:
        pass

    start_obj = text.find("{")
    end_obj = text.rfind("}")
    if start_obj != -1 and end_obj != -1 and end_obj > start_obj:
        candidate = text[start_obj : end_obj + 1].strip()
        try:
            json.loads(candidate)
            return candidate
        except Exception:
            pass

    start_arr = text.find("[")
    end_arr = text.rfind("]")
    if start_arr != -1 and end_arr != -1 and end_arr > start_arr:
        candidate = text[start_arr : end_arr + 1].strip()
        try:
            json.loads(candidate)
            return candidate
        except Exception:
            pass

    return None


def extract_json_codeblock_from_last_assistant(driver: webdriver.Chrome) -> Optional[str]:
    msg = get_last_assistant_message(driver)
    if not msg:
        return None

    raw_text_candidates: list[str] = []

    try:
        text = msg.text or ""
        if text.strip():
            raw_text_candidates.append(text)
    except Exception:
        pass

    css_candidates = [
        "pre code",
        "code",
        "[data-testid*='markdown']",
        ".markdown",
        ".prose",
    ]

    for css in css_candidates:
        try:
            nodes = msg.find_elements(By.CSS_SELECTOR, css)
            for node in nodes:
                try:
                    txt = node.text or ""
                    if txt.strip():
                        raw_text_candidates.append(txt)
                except Exception:
                    pass
        except Exception:
            pass

    for candidate in raw_text_candidates:
        extracted = extract_json_codeblock_from_text(candidate)
        if extracted:
            return extracted

    return None


def wait_for_new_assistant_message(
    driver: webdriver.Chrome,
    prev_assistant_count: int,
    timeout_s: int,
    poll_s: float = 0.7,
) -> bool:
    deadline = time.time() + timeout_s

    while time.time() < deadline:
        current = count_assistant_messages(driver)
        if current > prev_assistant_count:
            return True
        time.sleep(poll_s)

    return False


def wait_for_response_finish(
    driver: webdriver.Chrome,
    prev_assistant_count: int,
    timeout_s: int,
    poll_s: float = 0.8,
) -> bool:
    deadline = time.time() + timeout_s
    saw_new = False
    stable_loops = 0

    while time.time() < deadline:
        current = count_assistant_messages(driver)
        if current > prev_assistant_count:
            saw_new = True

        if saw_new:
            if is_generation_in_progress(driver):
                stable_loops = 0
            else:
                stable_loops += 1
                if stable_loops >= 2:
                    return True

        time.sleep(poll_s)

    return False


def scroll_into_view(driver: webdriver.Chrome, el: WebElement):
    try:
        driver.execute_script(
            "arguments[0].scrollIntoView({block:'center', inline:'nearest'});", el
        )
        safe_sleep(0.2)
    except Exception:
        pass


def find_copy_buttons_within_message(msg: WebElement) -> list[WebElement]:
    selectors = [
        "button[aria-label='Copy response']",
        "button[aria-label*='Copy response']",
        "button[aria-label*='Copy']",
        "button[data-testid*='copy']",
    ]

    found: list[WebElement] = []

    for sel in selectors:
        try:
            btns = msg.find_elements(By.CSS_SELECTOR, sel)
            for btn in btns:
                try:
                    if btn.is_displayed() and btn.is_enabled():
                        found.append(btn)
                except StaleElementReferenceException:
                    continue
        except Exception:
            pass

    return found


def find_global_copy_buttons(driver: webdriver.Chrome) -> list[WebElement]:
    selectors = [
        "button[aria-label='Copy response']",
        "button[aria-label*='Copy response']",
        "button[aria-label*='Copy']",
        "button[data-testid*='copy']",
    ]

    found: list[WebElement] = []

    for sel in selectors:
        try:
            btns = driver.find_elements(By.CSS_SELECTOR, sel)
            for btn in btns:
                try:
                    if btn.is_displayed() and btn.is_enabled():
                        found.append(btn)
                except StaleElementReferenceException:
                    continue
        except Exception:
            pass

    return found


def click_best_copy_response_button(driver: webdriver.Chrome) -> bool:
    msg = get_last_assistant_message(driver)
    candidate_buttons: list[WebElement] = []

    if msg is not None:
        try:
            scroll_into_view(driver, msg)
            candidate_buttons.extend(find_copy_buttons_within_message(msg))
        except Exception:
            pass

    candidate_buttons.extend(find_global_copy_buttons(driver))

    if not candidate_buttons:
        return False

    unique_candidates: list[WebElement] = []
    seen_ids = set()

    for btn in candidate_buttons:
        try:
            key = btn.id
        except Exception:
            key = str(id(btn))
        if key not in seen_ids:
            seen_ids.add(key)
            unique_candidates.append(btn)

    for btn in reversed(unique_candidates):
        try:
            scroll_into_view(driver, btn)
            btn.click()
            return True
        except (ElementClickInterceptedException, StaleElementReferenceException):
            try:
                if click_element_js(driver, btn):
                    return True
            except Exception:
                pass
        except Exception:
            try:
                if click_element_js(driver, btn):
                    return True
            except Exception:
                pass

    return False


def read_clipboard_text_via_browser(driver: webdriver.Chrome, timeout_s: int = 6) -> Optional[str]:
    script = """
        const done = arguments[0];
        (async () => {
            try {
                const text = await navigator.clipboard.readText();
                done(text || "");
            } catch (e) {
                done("__CLIPBOARD_ERROR__:" + (e && e.message ? e.message : String(e)));
            }
        })();
    """

    end = time.time() + timeout_s
    last_text = ""

    while time.time() < end:
        try:
            result = driver.execute_async_script(script)
            if isinstance(result, str):
                if result.startswith("__CLIPBOARD_ERROR__:"):
                    last_text = result
                elif result.strip():
                    return result
        except JavascriptException:
            pass
        except Exception:
            pass

        time.sleep(0.4)

    if last_text and not last_text.startswith("__CLIPBOARD_ERROR__:"):
        return last_text

    return None


def extract_response_via_copy_button(driver: webdriver.Chrome) -> Optional[str]:
    if not click_best_copy_response_button(driver):
        return None

    safe_sleep(0.8)
    clipboard_text = read_clipboard_text_via_browser(driver, timeout_s=5)
    if not clipboard_text:
        return None

    extracted = extract_json_codeblock_from_text(clipboard_text)
    if extracted:
        return extracted

    return None


def save_raw_error_payload(out_path: Path, raw_text: str):
    try:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.with_suffix(".raw.txt").write_text(raw_text or "", encoding="utf-8")
    except Exception:
        pass


def wait_for_json_response(
    driver: webdriver.Chrome,
    prev_assistant_count: int,
    timeout_s: int,
    poll_s: float = 0.8,
) -> Optional[str]:
    deadline = time.time() + timeout_s
    saw_new = False
    copy_attempted = False
    last_dom_candidate = None

    while time.time() < deadline:
        current = count_assistant_messages(driver)
        if current > prev_assistant_count:
            saw_new = True

        if saw_new:
            dom_candidate = extract_json_codeblock_from_last_assistant(driver)
            if dom_candidate:
                last_dom_candidate = dom_candidate

            if not is_generation_in_progress(driver):
                if not copy_attempted:
                    copied = extract_response_via_copy_button(driver)
                    copy_attempted = True
                    if copied:
                        return copied

                if last_dom_candidate:
                    return last_dom_candidate

                copied = extract_response_via_copy_button(driver)
                if copied:
                    return copied

        time.sleep(poll_s)

    if last_dom_candidate:
        return last_dom_candidate

    copied = extract_response_via_copy_button(driver)
    if copied:
        return copied

    return None


def parse_json_strict(text: str) -> Any:
    return json.loads(text)


def structures_match(source: Any, translated: Any) -> bool:
    if type(source) is not type(translated):
        return False

    if isinstance(source, dict):
        if list(source.keys()) != list(translated.keys()):
            return False
        return all(structures_match(source[k], translated[k]) for k in source.keys())

    if isinstance(source, list):
        if len(source) != len(translated):
            return False
        return all(structures_match(s, t) for s, t in zip(source, translated))

    return True


def build_translation_prompt(prompt_cfg: dict, source_json_text: str, target_lang: str) -> str:
    target_lang_name = config.LANGUAGE_NAMES.get(target_lang, target_lang)

    template = prompt_cfg["per_translation_template"]
    return template.format(
        source_lang=config.SOURCE_LANG,
        source_lang_name=config.LANGUAGE_NAMES.get(config.SOURCE_LANG, config.SOURCE_LANG),
        target_lang=target_lang,
        target_lang_name=target_lang_name,
        json_input=source_json_text,
    )


def ensure_chat_is_idle(driver: webdriver.Chrome, timeout_s: int = 20):
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        if not is_generation_in_progress(driver):
            return
        time.sleep(0.5)


def maybe_send_initial_prompt_in_tab(driver: webdriver.Chrome, prompt_cfg: dict):
    initial_prompt = (prompt_cfg.get("initial_prompt") or "").strip()
    if not initial_prompt:
        return

    prev_count = count_assistant_messages(driver)
    if send_message(driver, initial_prompt):
        wait_for_new_assistant_message(
            driver,
            prev_assistant_count=prev_count,
            timeout_s=int(config.INITIAL_PROMPT_WAIT_SECONDS),
            poll_s=0.8,
        )
        ensure_chat_is_idle(driver, timeout_s=int(config.INITIAL_PROMPT_WAIT_SECONDS))


def process_one_language(
    driver: webdriver.Chrome,
    prompt_cfg: dict,
    source_en_path: Path,
    source_data: Any,
    source_json_text: str,
    target_lang: str,
) -> TranslationResult:
    out_path = derive_output_path(source_en_path, target_lang)

    if config.SKIP_IF_OUTPUT_EXISTS and is_valid_json_file(out_path):
        return TranslationResult(
            lang=target_lang,
            status="SKIP",
            message="Output exists (valid JSON)",
            out_path=out_path,
        )

    prompt = build_translation_prompt(prompt_cfg, source_json_text, target_lang)

    prev_count = count_assistant_messages(driver)

    if not send_message(driver, prompt):
        return TranslationResult(
            lang=target_lang,
            status="ERROR",
            message="Failed to send message",
            out_path=out_path,
        )

    raw = wait_for_json_response(
        driver,
        prev_assistant_count=prev_count,
        timeout_s=int(config.WAIT_FOR_RESPONSE_SECONDS),
    )

    if not raw:
        return TranslationResult(
            lang=target_lang,
            status="ERROR",
            message="No JSON found in response or clipboard copy",
            out_path=out_path,
        )

    try:
        parsed = parse_json_strict(raw)
    except Exception as e:
        if config.SAVE_RAW_ON_ERROR:
            save_raw_error_payload(out_path, raw)
        return TranslationResult(
            lang=target_lang,
            status="ERROR",
            message=f"JSON parse failed: {str(e)[:160]}",
            out_path=out_path,
        )

    if not structures_match(source_data, parsed):
        if config.SAVE_RAW_ON_ERROR:
            save_raw_error_payload(out_path, raw)
        return TranslationResult(
            lang=target_lang,
            status="ERROR",
            message="Translated JSON structure/keys do not match source EN file",
            out_path=out_path,
        )

    try:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(
            json.dumps(parsed, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    except Exception as e:
        return TranslationResult(
            lang=target_lang,
            status="ERROR",
            message=f"Save failed: {str(e)[:160]}",
            out_path=out_path,
        )

    return TranslationResult(
        lang=target_lang,
        status="OK",
        message="Saved",
        out_path=out_path,
    )


def main():
    args = parse_args()
    ensure_dirs()

    try:
        source_en_path = validate_input_file(args.input_file)
        source_data = read_json_file(source_en_path)
    except Exception as e:
        print(f"INPUT ERROR: {e}")
        return

    source_json_text = json.dumps(source_data, ensure_ascii=False, indent=2)
    prompt_cfg = load_prompt_file()

    print(f"Source EN file: {source_en_path}")
    print(f"Target languages: {', '.join(config.TARGET_LANGS)}")

    if not check_chrome_running_debug():
        print("Chrome not running in debug mode.")
        print("Run manual_chrome_launcher.bat and log into ChatGPT.")
        return

    driver = setup_driver_for_existing_chrome()

    try:
        ok = 0
        skip = 0
        err = 0

        for i, lang in enumerate(config.TARGET_LANGS, 1):
            print(f"[{i}/{len(config.TARGET_LANGS)}] Translating to {lang}")

            open_fresh_chat_tab(driver)
            maybe_send_initial_prompt_in_tab(driver, prompt_cfg)

            result = process_one_language(
                driver=driver,
                prompt_cfg=prompt_cfg,
                source_en_path=source_en_path,
                source_data=source_data,
                source_json_text=source_json_text,
                target_lang=lang,
            )

            close_current_tab_if_possible(driver)

            print(f"  {result.lang}: {result.status} - {result.message}")
            if result.out_path:
                print(f"  -> {result.out_path}")

            if result.status == "OK":
                ok += 1
            elif result.status == "SKIP":
                skip += 1
            else:
                err += 1

            time.sleep(random.randint(config.JITTER_MIN_SECONDS, config.JITTER_MAX_SECONDS))

        print(f"DONE -> OK={ok}, SKIP={skip}, ERROR={err}")

    finally:
        pass


if __name__ == "__main__":
    main()