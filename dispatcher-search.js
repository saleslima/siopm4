import { formatDateTimeLocal } from './search.js';
import { getData } from './database.js';

export function setupDispatcherSearch() {
    if (document.getElementById('dispatcherSearchSection')) {
        return;
    }

    const dispatcherHeader = document.querySelector('.dispatcher-header');

    const searchSection = document.createElement('div');
    searchSection.id = 'dispatcherSearchSection';
    searchSection.style.cssText = 'margin-top: 15px; padding: 15px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 4px;';
    searchSection.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <h3 style="margin: 0; font-size: 16px;">Pesquisar Ocorrências</h3>
            <button id="btnToggleDispatcherSearch" class="btn-secondary" style="padding: 8px 16px; font-size: 14px;">+ Expandir</button>
        </div>
        <div id="dispatcherSearchFormContainer" style="display: none;">
            <input type="text" id="searchOcorrenciasDispatcherInput" placeholder="Digite endereço ou natureza..." style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; margin-bottom: 10px;">

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                <div>
                    <label style="display: block; margin-bottom: 5px; font-size: 14px; font-weight: 600;">Data/Hora Início</label>
                    <input type="datetime-local" id="searchDataInicioDispatcher" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 5px; font-size: 14px; font-weight: 600;">Data/Hora Fim</label>
                    <input type="datetime-local" id="searchDataFimDispatcher" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                </div>
            </div>

            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                <button id="btnFiltroHojeDispatcher" class="btn-secondary" style="flex: 1; padding: 8px; font-size: 13px;">Hoje</button>
                <button id="btnFiltroOntemDispatcher" class="btn-secondary" style="flex: 1; padding: 8px; font-size: 13px;">Ontem</button>
                <button id="btnFiltroSemanaDispatcher" class="btn-secondary" style="flex: 1; padding: 8px; font-size: 13px;">Última Semana</button>
                <button id="btnFiltroMesDispatcher" class="btn-secondary" style="flex: 1; padding: 8px; font-size: 13px;">Último Mês</button>
            </div>

            <div style="display: flex; gap: 10px;">
                <button id="btnExecutarPesquisaDispatcher" class="btn-cadastro" style="flex: 1; padding: 10px; font-size: 14px;">Pesquisar</button>
                <button id="btnLimparPesquisaDispatcher" class="btn-secondary" style="flex: 1; padding: 10px; font-size: 14px;">Limpar</button>
            </div>
        </div>

        <div id="ocorrenciasSearchContentDispatcher" style="margin-top: 15px;"></div>
    `;

    dispatcherHeader.appendChild(searchSection);

    const btnToggleDispatcherSearch = document.getElementById('btnToggleDispatcherSearch');
    const dispatcherSearchFormContainer = document.getElementById('dispatcherSearchFormContainer');

    btnToggleDispatcherSearch.addEventListener('click', () => {
        if (dispatcherSearchFormContainer.style.display === 'none') {
            dispatcherSearchFormContainer.style.display = 'block';
            btnToggleDispatcherSearch.textContent = '- Ocultar';
        } else {
            dispatcherSearchFormContainer.style.display = 'none';
            btnToggleDispatcherSearch.textContent = '+ Expandir';
        }
    });

    const searchInput = document.getElementById('searchOcorrenciasDispatcherInput');
    searchInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });

    document.getElementById('btnFiltroHojeDispatcher').addEventListener('click', () => {
        const hoje = new Date();
        const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0);
        const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59);

        document.getElementById('searchDataInicioDispatcher').value = formatDateTimeLocal(inicioHoje);
        document.getElementById('searchDataFimDispatcher').value = formatDateTimeLocal(fimHoje);
    });

    document.getElementById('btnFiltroOntemDispatcher').addEventListener('click', () => {
        const hoje = new Date();
        const ontem = new Date(hoje);
        ontem.setDate(ontem.getDate() - 1);
        const inicioOntem = new Date(ontem.getFullYear(), ontem.getMonth(), ontem.getDate(), 0, 0);
        const fimOntem = new Date(ontem.getFullYear(), ontem.getMonth(), ontem.getDate(), 23, 59);

        document.getElementById('searchDataInicioDispatcher').value = formatDateTimeLocal(inicioOntem);
        document.getElementById('searchDataFimDispatcher').value = formatDateTimeLocal(fimOntem);
    });

    document.getElementById('btnFiltroSemanaDispatcher').addEventListener('click', () => {
        const hoje = new Date();
        const semanaAtras = new Date(hoje);
        semanaAtras.setDate(semanaAtras.getDate() - 7);

        document.getElementById('searchDataInicioDispatcher').value = formatDateTimeLocal(semanaAtras);
        document.getElementById('searchDataFimDispatcher').value = formatDateTimeLocal(hoje);
    });

    document.getElementById('btnFiltroMesDispatcher').addEventListener('click', () => {
        const hoje = new Date();
        const mesAtras = new Date(hoje);
        mesAtras.setMonth(mesAtras.getMonth() - 1);

        document.getElementById('searchDataInicioDispatcher').value = formatDateTimeLocal(mesAtras);
        document.getElementById('searchDataFimDispatcher').value = formatDateTimeLocal(hoje);
    });

    // Execute search
    document.getElementById('btnExecutarPesquisaDispatcher').addEventListener('click', async () => {
        const searchTerm = searchInput.value.trim();
        const dataInicio = document.getElementById('searchDataInicioDispatcher').value;
        const dataFim = document.getElementById('searchDataFimDispatcher').value;

        await executeDispatcherSearch(searchTerm, dataInicio, dataFim);
    });

    // Clear search
    document.getElementById('btnLimparPesquisaDispatcher').addEventListener('click', () => {
        searchInput.value = '';
        document.getElementById('searchDataInicioDispatcher').value = '';
        document.getElementById('searchDataFimDispatcher').value = '';
        document.getElementById('ocorrenciasSearchContentDispatcher').innerHTML = '';
    });

    // Enter key to search
    searchInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const searchTerm = searchInput.value.trim();
            const dataInicio = document.getElementById('searchDataInicioDispatcher').value;
            const dataFim = document.getElementById('searchDataFimDispatcher').value;
            await executeDispatcherSearch(searchTerm, dataInicio, dataFim);
        }
    });
}

async function executeDispatcherSearch(searchTerm, dataInicio, dataFim) {
    const ocorrenciasSearchContentDispatcher = document.getElementById('ocorrenciasSearchContentDispatcher');

    try {
        const atendimentos = await getData('atendimentos');

        if (!atendimentos) {
            ocorrenciasSearchContentDispatcher.innerHTML = '<p style="padding: 20px; text-align: center; color: #999;">Nenhuma ocorrência encontrada.</p>';
            return;
        }

        const vtrAssignments = await getData('vtrAssignments') || {};
        const assignedOcorrencias = new Map();
        Object.values(vtrAssignments).forEach(v => {
            assignedOcorrencias.set(v.ocorrenciaId, v.vtrNumber);
        });

        let timestampInicio = null;
        let timestampFim = null;

        if (dataInicio) {
            timestampInicio = new Date(dataInicio).getTime();
        }

        if (dataFim) {
            timestampFim = new Date(dataFim).getTime();
        }

        const matchingOcorrencias = Object.entries(atendimentos)
            .filter(([key, ocorrencia]) => {
                if (timestampInicio && ocorrencia.timestamp < timestampInicio) {
                    return false;
                }
                if (timestampFim && ocorrencia.timestamp > timestampFim) {
                    return false;
                }

                if (searchTerm) {
                    const rua = ocorrencia.rua.toUpperCase();
                    const naturezaCodigo = ocorrencia.natureza.split(' - ')[0];
                    const numeroRegistro = String(ocorrencia.numeroRegistro);
                    const searchClean = searchTerm.replace(/^#+/, '');

                    return rua.includes(searchTerm) || naturezaCodigo.includes(searchTerm) || numeroRegistro.includes(searchClean);
                }

                return true;
            })
            .sort((a, b) => b[1].timestamp - a[1].timestamp);

        if (matchingOcorrencias.length === 0) {
            ocorrenciasSearchContentDispatcher.innerHTML = '<p style="padding: 20px; text-align: center; color: #999;">Nenhuma ocorrência encontrada com esses critérios.</p>';
        } else {
            let html = '<div style="display: flex; flex-direction: column; gap: 15px; margin-top: 15px;">';
            matchingOcorrencias.forEach(([key, ocorrencia]) => {
                let statusBadge = '';
                let statusColor = '';
                
                if (ocorrencia.encerrado) {
                    statusBadge = 'ENCERRADO';
                    statusColor = '#d32f2f';
                } else if (assignedOcorrencias.has(key)) {
                    const vtrNumber = assignedOcorrencias.get(key);
                    statusBadge = `EM ATENDIMENTO - VTR ${vtrNumber}`;
                    statusColor = '#1976d2';
                } else {
                    statusBadge = 'PENDENTE';
                    statusColor = '#ff9800';
                }

                html += `
                    <div style="background: #f9f9f9; padding: 15px; border: 1px solid #ddd; border-radius: 4px; border-left: 4px solid ${statusColor};">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <h3 style="margin: 0; font-size: 16px;">Registro #${ocorrencia.numeroRegistro}</h3>
                            <span style="color: ${statusColor}; font-weight: 600; font-size: 13px;">${statusBadge}</span>
                        </div>
                        <p style="margin: 3px 0; font-size: 13px;"><strong>Data/Hora:</strong> ${ocorrencia.dataHora}</p>
                        <p style="margin: 3px 0; font-size: 13px;"><strong>Nome:</strong> ${ocorrencia.nome}</p>
                        <p style="margin: 3px 0; font-size: 13px;"><strong>Telefone:</strong> ${ocorrencia.telefone}</p>
                        <p style="margin: 3px 0; font-size: 13px;"><strong>Endereço:</strong> ${ocorrencia.rua}, ${ocorrencia.numero} - ${ocorrencia.bairro}</p>
                        <p style="margin: 3px 0; font-size: 13px;"><strong>Município:</strong> ${ocorrencia.municipio} - ${ocorrencia.estado}</p>
                        <p style="margin: 3px 0; font-size: 13px;"><strong>BTL:</strong> ${ocorrencia.btl}</p>
                        <p style="margin: 3px 0; font-size: 13px;"><strong>Natureza:</strong> ${ocorrencia.natureza}</p>
                        <p style="margin: 3px 0; font-size: 13px;"><strong>Gravidade:</strong> ${ocorrencia.gravidade}</p>
                        <p style="margin: 3px 0; font-size: 13px;"><strong>Histórico:</strong> ${ocorrencia.historico}</p>
                        ${ocorrencia.encerrado ? `<p style="margin: 3px 0; font-size: 13px;"><strong>Resultado:</strong> ${ocorrencia.resultado || 'N/A'}</p>` : ''}
                    </div>
                `;
            });
            html += '</div>';
            ocorrenciasSearchContentDispatcher.innerHTML = html;
        }
    } catch (error) {
        ocorrenciasSearchContentDispatcher.innerHTML = `<p style="padding: 20px; text-align: center; color: #d32f2f;">Erro ao pesquisar ocorrências: ${error.message}</p>`;
    }
}

