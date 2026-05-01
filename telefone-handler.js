import { showMultipleOcorrenciasAlert, checkAndDisplayExistingOcorrencias } from './telefone-alert.js';
import { getData } from './database.js';

export function setupTelefoneHandler() {
    const telefoneInput = document.getElementById('telefone');

    telefoneInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');

        if (value.length > 0) {
            if (value.length <= 2) {
                value = `(${value}`;
            } else if (value.length <= 6) {
                value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
            } else if (value.length <= 10) {
                value = `(${value.slice(0, 2)}) ${value.slice(2, 6)}-${value.slice(6)}`;
            } else {
                value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7, 11)}`;
            }
        }

        e.target.value = value;
    });

    telefoneInput.addEventListener('blur', async (e) => {
        const telefone = e.target.value.trim();

        if (!telefone) return;

        const digitsOnly = telefone.replace(/\D/g, '');

        if (digitsOnly.length >= 3) {
            const firstDigitAfterDDD = digitsOnly.charAt(2);

            if (firstDigitAfterDDD === '9') {
                if (digitsOnly.length !== 11) {
                    alert('Telefone com DDD deve ter 11 dígitos quando começar com 9 (DDD + 9 dígitos)');
                    e.target.focus();
                    return;
                }
            }
        }

        await checkAndDisplayExistingOcorrencias(telefone);
    });
}

export async function checkByAddress(rua, numero, bairro) {
    try {
        const atendimentos = await getData('atendimentos');
        
        if (!atendimentos) {
            return;
        }
        
        const now = Date.now();
        const sixMonthsAgo = now - (6 * 30 * 24 * 60 * 60 * 1000);
        
        const ruaUpper = rua.toUpperCase().trim();
        const numeroUpper = numero.toUpperCase().trim();
        const bairroUpper = bairro.toUpperCase().trim();
        
        const matchingOcorrencias = Object.entries(atendimentos)
            .filter(([key, atendimento]) => {
                return atendimento.rua.toUpperCase().trim() === ruaUpper &&
                       atendimento.numero.toUpperCase().trim() === numeroUpper &&
                       atendimento.bairro.toUpperCase().trim() === bairroUpper &&
                       atendimento.timestamp >= sixMonthsAgo;
            })
            .sort((a, b) => b[1].timestamp - a[1].timestamp);
        
        if (matchingOcorrencias.length > 0) {
            await showMultipleOcorrenciasAlert(matchingOcorrencias);
        }
    } catch (error) {
        console.error('Erro ao verificar ocorrências:', error);
    }
}