/*
  Keyboard shortcuts module
  - Usage: Press Tab, then a letter (A-Z) to trigger the first element with data-shortcut matching that letter.
  - Prevents duplicate activation and times out after 1.8s if no letter pressed.
  - Will ignore inputs, textareas and contenteditable areas.
*/

let awaitingShortcut = false;
let awaitingTimeout = null;

function isEditableElement(el) {
    if (!el) return false;
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable) return true;
    // allow shortcuts if focused element is body
    return false;
}

function clearAwaiting() {
    awaitingShortcut = false;
    if (awaitingTimeout) {
        clearTimeout(awaitingTimeout);
        awaitingTimeout = null;
    }
    document.body.classList.remove('awaiting-shortcut');
}

function triggerShortcut(letter) {
    if (!letter) return;
    const key = letter.toUpperCase();
    // Find elements with matching data-shortcut attribute (first wins)
    const selector = `[data-shortcut="${key}"], [data-shortcut="${key.toLowerCase()}"]`;
    const el = document.querySelector(selector);
    if (el) {
        // Do not trigger if element is disabled or not visible
        if (el.disabled) return;
        const style = window.getComputedStyle(el);
        if (style && (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0')) {
            return;
        }
        // Try to focus then click to emulate activation
        try { el.focus && el.focus(); } catch (e) {}
        el.click && el.click();
    } else {
        // fallback: try buttons whose innerHTML contains bold letter (not required)
        const buttons = Array.from(document.querySelectorAll('button, a'));
        const found = buttons.find(b => {
            const ds = b.getAttribute('data-shortcut');
            return ds && ds.toUpperCase() === key;
        });
        if (found) {
            try { found.focus && found.focus(); } catch (e) {}
            found.click && found.click();
        }
    }
}

window.addEventListener('keydown', (e) => {
    // If focus is in editable field, ignore shortcuts to avoid disrupting typing
    const active = document.activeElement;
    if (isEditableElement(active) && active !== document.body) {
        // allow Tab to move focus normally
        if (e.key === 'Tab') return;
        // but don't intercept other keys
        return;
    }

    // If user presses Tab to start a shortcut sequence
    if (e.key === 'Tab') {
        // Prevent default tab focus change only when we intend to use it as a prefix
        e.preventDefault();
        awaitingShortcut = true;
        document.body.classList.add('awaiting-shortcut');
        if (awaitingTimeout) clearTimeout(awaitingTimeout);
        awaitingTimeout = setTimeout(() => {
            clearAwaiting();
        }, 1800); // 1.8s to press the letter
        return;
    }

    if (awaitingShortcut) {
        // Accept single letter A-Z or digit 0-9
        const key = e.key;
        if (/^[a-z0-9]$/i.test(key)) {
            triggerShortcut(key);
            clearAwaiting();
            e.preventDefault();
            return;
        } else {
            // any other key cancels the awaiting state
            clearAwaiting();
        }
    }
});

// Clean up awaiting state on blur or mouse click outside
window.addEventListener('click', () => clearAwaiting());
window.addEventListener('blur', () => clearAwaiting());

// Expose helper for tests/debug
export const keyboardShortcuts = {
    triggerShortcut,
    isAwaiting: () => awaitingShortcut,
    clearAwaiting
};