import { getData, getRef } from './database.js';
import { getCurrentUser } from './auth.js';
import { update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { loadDispatcherOcorrencias } from './dispatcher.js';
import { GBS } from './constants.js';

/*
  Changes:
  - When service BOMBEIRO is selected, showGBDialog will present GB options (from constants.GBS).
  - When redirection is confirmed, we store who redirected (redirecionadoPor) and the timestamp,
    so the occurrence record keeps attribution.
  - After redirecting we refresh the original dispatcher's view so the occurrence will disappear
    from their pending list (because its btl/servico changed).
*/

export async function showRedirecionarDialog(key, ocorrencia) {
    const modal = document.getElementById('ocorrenciaModal');
    const modalContent = document.getElementById('ocorrenciaModalContent');

    const servicosOptions = [
        'RADIO PATRULHA',
        'BOMBEIRO',
        'TRANSITO',
        'CHOQUE',
        'AMBIENTAL',
        'SAMU/192',
        'BAEP',
        'ESPECIALIDADES'
    ];

    let servicosHTML = '';
    servicosOptions.forEach(servico => {
        servicosHTML += `<option value="${servico}">${servico}</option>`;
    });

    let html = `
        <h2>Redirecionar Ocorrência #${ocorrencia.numeroRegistro}</h2>
        <div class="modal-details">
            <p><strong>BTL/Serviço Atual:</strong> ${ocorrencia.btl}</p>
        </div>
        <div class="vtr-assignment-form">
            <label for="servicoRedirecionarSelect">Selecione o Serviço de destino:</label>
            <select id="servicoRedirecionarSelect" class="vtr-select">
                <option value="">Selecione...</option>
                ${servicosHTML}
            </select>
            <button id="btnProximoRedirecionar" class="btn-cadastro" style="width: 100%; margin-top: 10px;">Próximo</button>
            <button id="btnCancelarRedirecionar" class="btn-secondary" style="width: 100%; margin-top: 10px;">Cancelar</button>
        </div>
    `;

    modalContent.innerHTML = html;

    document.getElementById('btnProximoRedirecionar').addEventListener('click', () => {
        const servicoSelecionado = document.getElementById('servicoRedirecionarSelect').value;

        if (!servicoSelecionado) {
            alert('Por favor, selecione um serviço');
            return;
        }

        if (servicoSelecionado === 'RADIO PATRULHA') {
            showBTLDialog(key, ocorrencia, servicoSelecionado);
        } else if (servicoSelecionado === 'BOMBEIRO') {
            showGBDialog(key, ocorrencia, servicoSelecionado);
        } else {
            showObservacaoDialog(key, ocorrencia, servicoSelecionado);
        }
    });

    document.getElementById('btnCancelarRedirecionar').addEventListener('click', async () => {
        const atendimentos = await getData('atendimentos');
        const { showOcorrenciaDetails } = await import('./occurrence-modal.js');
        await showOcorrenciaDetails(key, atendimentos[key]);
    });
}

async function showBTLDialog(key, ocorrencia, servico) {
    const modal = document.getElementById('ocorrenciaModal');
    const modalContent = document.getElementById('ocorrenciaModalContent');

    let btlOptionsHTML = '';
    for (let i = 1; i <= 49; i++) {
        if (i === 34 || i === 40 || i === 41 || i === 42 || i === 44 || i === 45 || i === 47) continue;
        
        const btlValue = `${String(i).padStart(2, '0')}º BPM/M`;
        if (btlValue !== ocorrencia.btl) {
            btlOptionsHTML += `<option value="${btlValue}">${btlValue}</option>`;
        }
    }

    let html = `
        <h2>Redirecionar Ocorrência #${ocorrencia.numeroRegistro}</h2>
        <div class="modal-details">
            <p><strong>BTL Atual:</strong> ${ocorrencia.btl}</p>
            <p><strong>Serviço Selecionado:</strong> ${servico}</p>
        </div>
        <div class="vtr-assignment-form">
            <label for="btlRedirecionarSelect">Selecione o BTL de destino:</label>
            <select id="btlRedirecionarSelect" class="vtr-select">
                <option value="">Selecione...</option>
                ${btlOptionsHTML}
            </select>
            <button id="btnProximoBTL" class="btn-cadastro" style="width: 100%; margin-top: 10px;">Próximo</button>
            <button id="btnVoltarServico" class="btn-secondary" style="width: 100%; margin-top: 10px;">Voltar</button>
        </div>
    `;

    modalContent.innerHTML = html;

    document.getElementById('btnProximoBTL').addEventListener('click', () => {
        const btlSelecionado = document.getElementById('btlRedirecionarSelect').value;

        if (!btlSelecionado) {
            alert('Por favor, selecione um BTL');
            return;
        }

        showObservacaoDialog(key, ocorrencia, btlSelecionado);
    });

    document.getElementById('btnVoltarServico').addEventListener('click', () => {
        showRedirecionarDialog(key, ocorrencia);
    });
}

async function showGBDialog(key, ocorrencia, servico) {
    // Show GB (Grupos/Batalhões específicos) options for BOMBEIRO service
    const modal = document.getElementById('ocorrenciaModal');
    const modalContent = document.getElementById('ocorrenciaModalContent');

    let gbOptionsHTML = '';
    // Use GBS from constants; fallback to a few defaults if missing
    const gbList = (Array.isArray(GBS) && GBS.length > 0) ? GBS : ['1ºGB','2ºGB','3ºGB','4ºGB','8ºGB','5º/17º'];
    gbList.forEach(gb => {
        if (gb !== ocorrencia.btl) {
            gbOptionsHTML += `<option value="${gb}">${gb}</option>`;
        }
    });

    let html = `
        <h2>Redirecionar Ocorrência #${ocorrencia.numeroRegistro} (BOMBEIRO)</h2>
        <div class="modal-details">
            <p><strong>BTL/Serviço Atual:</strong> ${ocorrencia.btl}</p>
            <p><strong>Serviço Selecionado:</strong> ${servico}</p>
        </div>
        <div class="vtr-assignment-form">
            <label for="gbRedirecionarSelect">Selecione o GB de destino:</label>
            <select id="gbRedirecionarSelect" class="vtr-select">
                <option value="">Selecione...</option>
                ${gbOptionsHTML}
            </select>
            <button id="btnProximoGB" class="btn-cadastro" style="width: 100%; margin-top: 10px;">Próximo</button>
            <button id="btnVoltarServicoGB" class="btn-secondary" style="width: 100%; margin-top: 10px;">Voltar</button>
        </div>
    `;

    modalContent.innerHTML = html;

    document.getElementById('btnProximoGB').addEventListener('click', () => {
        const gbSelecionado = document.getElementById('gbRedirecionarSelect').value;
        if (!gbSelecionado) {
            alert('Por favor, selecione um GB');
            return;
        }
        // Use the GB label as destinoSelecionado so downstream logic stores it in btl field
        showObservacaoDialog(key, ocorrencia, gbSelecionado);
    });

    document.getElementById('btnVoltarServicoGB').addEventListener('click', () => {
        showRedirecionarDialog(key, ocorrencia);
    });
}

async function showObservacaoDialog(key, ocorrencia, destinoSelecionado) {
    const modal = document.getElementById('ocorrenciaModal');
    const modalContent = document.getElementById('ocorrenciaModalContent');

    let html = `
        <h2>Redirecionar Ocorrência #${ocorrencia.numeroRegistro}</h2>
        <div class="modal-details">
            <p><strong>BTL/Serviço Atual:</strong> ${ocorrencia.btl}</p>
            <p><strong>Destino:</strong> ${destinoSelecionado}</p>
        </div>
        <div class="vtr-assignment-form">
            <label for="observacaoRedirecionar">Observação:</label>
            <textarea id="observacaoRedirecionar" rows="4" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 10px;"></textarea>
            <button id="btnConfirmarRedirecionar" class="btn-cadastro" style="width: 100%; margin-top: 10px;">Confirmar</button>
            <button id="btnVoltarRedirecionar" class="btn-secondary" style="width: 100%; margin-top: 10px;">Voltar</button>
        </div>
    `;

    modalContent.innerHTML = html;

    const observacaoInput = document.getElementById('observacaoRedirecionar');
    observacaoInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });

    document.getElementById('btnConfirmarRedirecionar').addEventListener('click', async () => {
        const observacao = document.getElementById('observacaoRedirecionar').value.trim();

        if (!observacao) {
            alert('Por favor, insira uma observação');
            return;
        }

        try {
            const atendimentoRef = getRef(`atendimentos/${key}`);
            const currentUser = getCurrentUser();
            // Build a readable "who" string
            let redirecionadoPor = '';
            if (currentUser) {
                if (currentUser.tipo === 'MILITAR') {
                    redirecionadoPor = `${currentUser.graduacao ? currentUser.graduacao + ' ' : ''}${currentUser.nomeGuerra} (${currentUser.re || ''})`.trim();
                } else {
                    redirecionadoPor = `${currentUser.nomeCompleto || ''} (${currentUser.cpf ? currentUser.cpf.replace(/\D/g,'') : ''})`.trim();
                }
            }

            const nowLocale = new Date().toLocaleString('pt-BR');

            await update(atendimentoRef, {
                btl: destinoSelecionado,
                btlOriginal: ocorrencia.btl,
                observacaoRedirecionamento: observacao,
                dataHoraRedirecionamento: nowLocale,
                redirecionadoPor: redirecionadoPor
            });

            alert(`Ocorrência redirecionada para ${destinoSelecionado} com sucesso!`);
            modal.style.display = 'none';

            // Refresh the dispatcher's list so the occurrence no longer appears for the original user
            if (currentUser) {
                await loadDispatcherOcorrencias(currentUser.paValue, document.getElementById('dispatcherContent'));
            }
        } catch (error) {
            alert('Erro ao redirecionar ocorrência: ' + error.message);
        }
    });

    document.getElementById('btnVoltarRedirecionar').addEventListener('click', () => {
        showRedirecionarDialog(key, ocorrencia);
    });
}

