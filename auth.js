import { getData } from './database.js';
import { showMessage, showScreen } from './utils.js';

// internal state variable to avoid duplicate identifier collisions in some environments
let currentUserState = null;

export function setCurrentUser(user) {
    currentUserState = user;
}

export function getCurrentUser() {
    return currentUserState;
}

export async function loadUserProfiles(loginPerfilSelect) {
    loginPerfilSelect.innerHTML = '<option value="">Selecione...</option>';
    
    const profiles = ['ATENDENTE', 'DESPACHADOR', 'SUPERVISOR', 'ATENDENTE COBOM', 'DESPACHADOR COBOM', 'SUPERVISOR COBOM'];
    
    profiles.forEach(profile => {
        const option = document.createElement('option');
        option.value = profile;
        option.textContent = profile;
        loginPerfilSelect.appendChild(option);
    });
}

export function updateFunctionOptions(servico, perfilSelect) {
    perfilSelect.innerHTML = '<option value="">Selecione...</option>';
    
    if (servico === 'RADIO PATRULHA') {
        const functions = ['ATENDENTE', 'DESPACHADOR', 'SUPERVISOR'];
        functions.forEach(func => {
            const option = document.createElement('option');
            option.value = func;
            option.textContent = func;
            perfilSelect.appendChild(option);
        });
    } else if (servico === 'TRANSITO') {
        const functions = ['DESPACHADOR'];
        functions.forEach(func => {
            const option = document.createElement('option');
            option.value = func;
            option.textContent = func;
            perfilSelect.appendChild(option);
        });
    } else if (servico === 'CHOQUE') {
        const functions = ['DESPACHADOR'];
        functions.forEach(func => {
            const option = document.createElement('option');
            option.value = func;
            option.textContent = func;
            perfilSelect.appendChild(option);
        });
    } else {
        // For other services, show COBOM functions
        const functions = ['ATENDENTE COBOM', 'DESPACHADOR COBOM', 'SUPERVISOR COBOM'];
        functions.forEach(func => {
            const option = document.createElement('option');
            option.value = func;
            option.textContent = func;
            perfilSelect.appendChild(option);
        });
    }
}

export function updatePAOptions(perfil, paSelect, paLabel) {
    paSelect.innerHTML = '<option value="">Selecione...</option>';
    
    if (perfil === 'ATENDENTE') {
        paLabel.textContent = 'P.A';
        const excludedRanges = [
            121, 122, 123, 124, 125, 126, 127,
            140, 141, 142, 143, 144, 145, 146,
            159, 160, 161, 162, 163, 164, 165,
            178, 179, 180, 182, 183, 184
        ];
        
        for (let i = 1; i <= 208; i++) {
            if (!excludedRanges.includes(i)) {
                const option = document.createElement('option');
                const value = String(i).padStart(3, '0');
                option.value = value;
                option.textContent = value;
                paSelect.appendChild(option);
            }
        }
    } else if (perfil === 'ATENDENTE COBOM') {
        paLabel.textContent = 'P.A';
        const includedRanges = [
            121, 122, 123, 124, 125, 126, 127,
            140, 141, 142, 143, 144, 145, 146,
            159, 160, 161, 162, 163, 164, 165,
            178, 179, 180, 182, 183, 184
        ];
        
        includedRanges.forEach(pa => {
            const option = document.createElement('option');
            const value = String(pa).padStart(3, '0');
            option.value = value;
            option.textContent = value;
            paSelect.appendChild(option);
        });
    } else if (perfil === 'DESPACHADOR COBOM') {
        paLabel.textContent = 'GB';
        const gbOptions = ['1ºGB', '2ºGB', '3ºGB', '4ºGB', '8ºGB', '5º/17º'];
        gbOptions.forEach(gb => {
            const option = document.createElement('option');
            option.value = gb;
            option.textContent = gb;
            paSelect.appendChild(option);
        });
    } else if (perfil === 'SUPERVISOR COBOM') {
        paLabel.textContent = 'Tipo';
        const tipoOptions = ['A', 'B'];
        tipoOptions.forEach(tipo => {
            const option = document.createElement('option');
            option.value = tipo;
            option.textContent = `SUPERVISOR COBOM ${tipo}`;
            paSelect.appendChild(option);
        });
    } else if (perfil === 'DESPACHADOR') {
        // Check servico to determine if it's Trânsito, Choque, or Radio Patrulha
        const servico = document.getElementById('loginServico').value;
        
        if (servico === 'TRANSITO') {
            paLabel.textContent = 'BPTRAN';
            const bptranOptions = ['1ºBPTRAN', '2ºBPTRAN'];
            bptranOptions.forEach(bptran => {
                const option = document.createElement('option');
                option.value = bptran;
                option.textContent = bptran;
                paSelect.appendChild(option);
            });
        } else if (servico === 'CHOQUE') {
            paLabel.textContent = 'BTL';
            const option = document.createElement('option');
            option.value = 'CHOQUE';
            option.textContent = 'CHOQUE';
            paSelect.appendChild(option);
        } else {
            paLabel.textContent = 'BTL';
            for (let i = 1; i <= 49; i++) {
                // Skip numbers that don't exist
                if (i === 34 || i === 40 || i === 41 || i === 42 || i === 44 || i === 45 || i === 47) continue;
                
                const option = document.createElement('option');
                const value = `${String(i).padStart(2, '0')}º BPM/M`;
                option.value = value;
                option.textContent = value;
                paSelect.appendChild(option);
            }
        }
    } else if (perfil === 'SUPERVISOR') {
        paLabel.textContent = 'CPA';
        for (let i = 1; i <= 12; i++) {
            const option = document.createElement('option');
            const value = 'M' + String(i).padStart(2, '0');
            option.value = value;
            option.textContent = value;
            paSelect.appendChild(option);
        }
    }
}

export async function authenticateUser(cpfRe, servico, perfil, paValue, userLoginMessage) {
    try {
        const cadastros = await getData('cadastros');
        
        if (!cadastros) {
            showMessage(userLoginMessage, 'Nenhum usuário cadastrado!', 'error');
            return null;
        }
        
        let userFound = false;
        let userData = null;
        
        Object.values(cadastros).forEach(cadastro => {
            const cleanCpfRe = cpfRe.replace(/\D/g, '');
            const cadastroCpf = cadastro.cpf ? cadastro.cpf.replace(/\D/g, '') : '';
            const cadastroRe = cadastro.re ? cadastro.re : '';
            
            // Check if user matches and has the selected function (either in 'funcao' or 'funcoes' array)
            const hasFuncao = cadastro.funcao === perfil || (cadastro.funcoes && cadastro.funcoes.includes(perfil));
            
            if ((cadastroCpf === cleanCpfRe || cadastroRe === cpfRe) && hasFuncao && cadastro.servico === servico) {
                userFound = true;
                userData = { ...cadastro, funcao: perfil, paValue };
            }
        });
        
        if (userFound) {
            return userData;
        } else {
            showMessage(userLoginMessage, 'Usuário não encontrado ou credenciais incorretas!', 'error');
            return null;
        }
    } catch (error) {
        showMessage(userLoginMessage, 'Erro ao fazer login: ' + error.message, 'error');
        return null;
    }
}

