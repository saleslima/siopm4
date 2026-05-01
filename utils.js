// Utility functions

export function showMessage(element, text, type) {
    element.textContent = text;
    element.className = `message ${type}`;
    element.style.display = 'block';

    setTimeout(() => {
        element.style.display = 'none';
        element.className = 'message';
    }, 3000);
}

export function showScreen(screenToShow, allScreens) {
    allScreens.forEach(screen => {
        screen.style.display = 'none';
    });
    screenToShow.style.display = 'block';
}

export function formatCPF(value) {
    let cleaned = value.replace(/\D/g, '');
    if (cleaned.length > 11) {
        cleaned = cleaned.substring(0, 11);
    }
    if (cleaned.length <= 11) {
        cleaned = cleaned.replace(/(\d{3})(\d)/, '$1.$2');
        cleaned = cleaned.replace(/(\d{3})(\d)/, '$1.$2');
        cleaned = cleaned.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return cleaned;
}

export function formatCEP(value) {
    let cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 8) {
        cleaned = cleaned.replace(/(\d{5})(\d)/, '$1-$2');
    }
    return cleaned;
}

export function setupAutoUppercase(elements) {
    elements.forEach(element => {
        element.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });
    });
}

