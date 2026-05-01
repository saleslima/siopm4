// Utilities for modal interactions

import { getData, getRef } from './database.js';
import { update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getCurrentUser } from './auth.js';

export function setupModalClose(modal) {
    const closeBtn = modal.querySelector('.close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
}

export function showModal(modal) {
    modal.style.display = 'block';
}

export function hideModal(modal) {
    modal.style.display = 'none';
}

export async function addVeiculoToOcorrencia(key, veiculo) {
    const atendimentoRef = getRef(`atendimentos/${key}`);
    const atendimentos = await getData('atendimentos');
    const ocorrenciaAtual = atendimentos[key];

    const veiculos = ocorrenciaAtual.veiculos || [];
    veiculos.push(veiculo);

    await update(atendimentoRef, { veiculos });

    const atendimentosAtualizados = await getData('atendimentos');
    return atendimentosAtualizados[key];
}

export async function addPessoaToOcorrencia(key, pessoa) {
    const atendimentoRef = getRef(`atendimentos/${key}`);
    const atendimentos = await getData('atendimentos');
    const ocorrenciaAtual = atendimentos[key];

    const pessoas = ocorrenciaAtual.pessoas || [];
    pessoas.push(pessoa);

    await update(atendimentoRef, { pessoas });

    const atendimentosAtualizados = await getData('atendimentos');
    return atendimentosAtualizados[key];
}

export async function addComplementoToOcorrencia(key, complementoTexto) {
    const now = new Date();
    const atendimentoRef = getRef(`atendimentos/${key}`);

    const atendimentos = await getData('atendimentos');
    const ocorrenciaAtual = atendimentos[key];

    const complementos = ocorrenciaAtual.complementos || [];

    const currentUser = getCurrentUser();
    let usuarioNome = '';
    let usuarioRE = '';
    
    if (currentUser) {
        if (currentUser.tipo === 'MILITAR') {
            usuarioNome = currentUser.graduacao ? `${currentUser.graduacao} ${currentUser.nomeGuerra}` : currentUser.nomeGuerra;
            usuarioRE = currentUser.re || '';
        } else {
            usuarioNome = currentUser.nomeCompleto || '';
            usuarioRE = currentUser.cpf ? currentUser.cpf.replace(/\D/g, '') : '';
        }
    }

    complementos.push({
        dataHora: now.toLocaleString('pt-BR'),
        texto: complementoTexto,
        usuario: usuarioNome,
        re: usuarioRE
    });

    await update(atendimentoRef, { complementos });

    const atendimentosAtualizados = await getData('atendimentos');
    return atendimentosAtualizados[key];
}