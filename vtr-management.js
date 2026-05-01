import { getData } from './database.js';
import { getCurrentUser } from './auth.js';

export async function loadVTRPanels(btlNumber) {
    try {
        const vtrsDisponiveis = await getData('vtrsDisponiveis') || {};
        const vtrAssignments = await getData('vtrAssignments') || {};
        const atendimentos = await getData('atendimentos') || {};

        // Only consider VTRs as "assigned" if they have active (non-closed) occurrences
        const assignedVTRNumbers = new Set();
        Object.values(vtrAssignments).forEach(assignment => {
            const ocorrencia = atendimentos[assignment.ocorrenciaId];
            if (ocorrencia && !ocorrencia.encerrado) {
                assignedVTRNumbers.add(assignment.vtrNumber);
            }
        });

        // Normalize to two-digit numeric prefix when possible (handles "1º BPM/M" -> "01")
        function extractBtlPrefix(name) {
            if (!name) return '';
            const m = name.match(/^(\d{1,2})/);
            if (m && m[1]) return String(m[1]).padStart(2, '0');
            return name.substring(0, 2);
        }

        let btlPrefix = extractBtlPrefix(btlNumber);

        if (window.selectedBTL) {
            btlPrefix = extractBtlPrefix(window.selectedBTL);
        }

        const availableVTRs = Object.entries(vtrsDisponiveis)
            .filter(([key, vtr]) => {
                if (assignedVTRNumbers.has(vtr.vtrNumber)) return false;

                const vtrPrefix = vtr.vtrNumber.substring(0, 2);
                return vtrPrefix === btlPrefix;
            })
            .sort((a, b) => {
                const statusA = a[1].status || 'DISPONIVEL';
                const statusB = b[1].status || 'DISPONIVEL';
                
                // Priority: DISPONIVEL and RONDA ESCOLAR first
                const priorityA = (statusA === 'DISPONIVEL' || statusA === 'RONDA ESCOLAR') ? 0 : 1;
                const priorityB = (statusB === 'DISPONIVEL' || statusB === 'RONDA ESCOLAR') ? 0 : 1;
                
                if (priorityA !== priorityB) return priorityA - priorityB;
                
                return a[1].vtrNumber.localeCompare(b[1].vtrNumber);
            });

        const vtrDisponiveisContent = document.getElementById('vtrDisponiveisContent');
        
        // Instead of placing a filter/dropdown in the dispatcher header, expose a single "Status" button
        // directly above the VTR list in the VTRs Disponíveis panel so users can open the status-options modal.
        const vtrPanelRight = document.getElementById('vtrDisponiveis');
        let existingStatusBtn = document.getElementById('btnConfigVTRStatus');
        if (!existingStatusBtn && vtrPanelRight) {
            existingStatusBtn = document.createElement('button');
            existingStatusBtn.id = 'btnConfigVTRStatus';
            existingStatusBtn.className = 'btn-secondary';
            existingStatusBtn.textContent = 'Status';
            existingStatusBtn.style.cssText = 'display:block; width:100%; margin-bottom:10px; padding:10px; font-size:14px;';
            vtrPanelRight.insertBefore(existingStatusBtn, vtrDisponiveisContent);

            existingStatusBtn.addEventListener('click', () => {
                // Build modal if not exists
                let existing = document.getElementById('vtrStatusConfigModal');
                if (existing) {
                    existing.style.display = 'block';
                    return;
                }

                const modal = document.createElement('div');
                modal.id = 'vtrStatusConfigModal';
                modal.className = 'modal';
                modal.innerHTML = `
                    <div class="modal-content" style="max-width:360px;">
                        <span class="close" id="closeVtrStatusModal">&times;</span>
                        <h3>Mostrar VTRs com status</h3>
                        <div id="vtrStatusOptions" style="display:flex;flex-direction:column;gap:8px;margin-top:12px;">
                            <label><input type="checkbox" value="DISPONIVEL"> DISPONÍVEL</label>
                            <label><input type="checkbox" value="RONDA ESCOLAR"> RONDA ESCOLAR</label>
                            <label><input type="checkbox" value="OPERACAO ESPECIAL"> OPERAÇÃO ESPECIAL</label>
                            <label><input type="checkbox" value="ALIMENTACAO"> ALIMENTAÇÃO</label>
                            <label><input type="checkbox" value="BAIXA MECANICA"> BAIXA MECÂNICA</label>
                        </div>
                        <div style="display:flex;gap:8px;margin-top:16px;">
                            <button id="btnSaveVtrStatusConfig" class="btn-cadastro" style="flex:1;">Salvar</button>
                            <button id="btnCancelVtrStatusConfig" class="btn-secondary" style="flex:1;">Cancelar</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);

                const saved = JSON.parse(localStorage.getItem('vtrStatusFilterSet') || 'null');
                const checkboxes = modal.querySelectorAll('#vtrStatusOptions input[type="checkbox"]');
                if (saved && Array.isArray(saved)) {
                    checkboxes.forEach(cb => cb.checked = saved.includes(cb.value));
                } else {
                    // default: show available and ronda escolar
                    checkboxes.forEach(cb => {
                        cb.checked = (cb.value === 'DISPONIVEL' || cb.value === 'RONDA ESCOLAR');
                    });
                }

                // close handlers
                modal.querySelector('#closeVtrStatusModal').addEventListener('click', () => modal.style.display = 'none');
                modal.querySelector('#btnCancelVtrStatusConfig').addEventListener('click', () => modal.style.display = 'none');
                modal.addEventListener('click', (ev) => { if (ev.target === modal) modal.style.display = 'none'; });

                modal.querySelector('#btnSaveVtrStatusConfig').addEventListener('click', async () => {
                    const selected = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
                    localStorage.setItem('vtrStatusFilterSet', JSON.stringify(selected));
                    modal.style.display = 'none';
                    await loadVTRPanels(btlNumber);
                });

                modal.style.display = 'block';
            });
        }
        
        const savedSet = JSON.parse(localStorage.getItem('vtrStatusFilterSet') || 'null');
        const allowedStatuses = Array.isArray(savedSet) && savedSet.length > 0 ? savedSet : ['DISPONIVEL', 'RONDA ESCOLAR'];

        // Apply only the allowed statuses saved by the user (default: DISPONIVEL + RONDA ESCOLAR)
        let filteredVTRs = availableVTRs.filter(([key, vtr]) => {
            const status = (vtr.status || 'DISPONIVEL');
            return allowedStatuses.includes(status);
        });

        if (filteredVTRs.length === 0) {
            vtrDisponiveisContent.innerHTML = '<p class="no-vtrs">Nenhuma VTR disponível</p>';
        } else {
            let html = '';
            filteredVTRs.forEach(([key, vtr]) => {
                const status = vtr.status || 'DISPONIVEL';
                const statusClass = `vtr-status-${status.toLowerCase().replace(/\s+/g, '-')}`;
                const isAvailable = status === 'DISPONIVEL' || status === 'RONDA ESCOLAR';
                const dimClass = isAvailable ? '' : 'dimmed';
                
                let icon = '';
                switch(status) {
                    case 'DISPONIVEL':
                        icon = '🫡';
                        break;
                    case 'RONDA ESCOLAR':
                        icon = '📚';
                        break;
                    case 'OPERACAO ESPECIAL':
                        icon = '⚔️';
                        break;
                    case 'ALIMENTACAO':
                        icon = '🍴';
                        break;
                    case 'BAIXA MECANICA':
                        icon = '👎';
                        break;
                    default:
                        icon = '';
                }
                
                html += `
                    <div class="vtr-disponivel-item ${statusClass} ${dimClass}" data-vtr="${vtr.vtrNumber}" data-vtr-key="${key}" style="cursor: pointer; position: relative;">
                        <span class="vtr-icon">${icon}</span>
                        <span class="vtr-label" style="margin-left:8px; font-weight:600;">${vtr.vtrNumber}</span>
                    </div>
                `;
            });
            vtrDisponiveisContent.innerHTML = html;
            
            // Add click handlers to change status (both right-click and double-click)
            document.querySelectorAll('.vtr-disponivel-item').forEach(item => {
                item.addEventListener('contextmenu', async (e) => {
                    e.preventDefault();
                    const vtrKey = item.getAttribute('data-vtr-key');
                    const vtrNum = item.getAttribute('data-vtr');
                    await showStatusChangeMenu(vtrKey, vtrNum, btlNumber);
                });
                
                item.addEventListener('dblclick', async (e) => {
                    const vtrKey = item.getAttribute('data-vtr-key');
                    const vtrNum = item.getAttribute('data-vtr');
                    await showStatusChangeMenu(vtrKey, vtrNum, btlNumber);
                });
            });
        }

        // Group assignments by VTR number so each VTR appears only once
        const empenhadasForBTL = Object.entries(vtrAssignments)
            .filter(([key, assignment]) => {
                const m = assignment.vtrNumber.match(/^(\d{1,2})/);
                const vtrPrefix = m && m[1] ? String(m[1]).padStart(2, '0') : assignment.vtrNumber.substring(0,2);
                return vtrPrefix === btlPrefix;
            });

        const groupedByVTR = {};
        empenhadasForBTL.forEach(([assignKey, assignment]) => {
            const vtrNum = assignment.vtrNumber;
            if (!groupedByVTR[vtrNum]) groupedByVTR[vtrNum] = [];
            const ocorrencia = atendimentos[assignment.ocorrenciaId];
            // Only include non-closed occurrences
            if (ocorrencia && !ocorrencia.encerrado) {
                groupedByVTR[vtrNum].push({
                    assignKey,
                    ocorrenciaKey: assignment.ocorrenciaId,
                    ocorrencia
                });
            }
        });

        const vtrEmpenhadasContent = document.getElementById('vtrEmpenhadasContent');
        const vtrIds = Object.keys(groupedByVTR).sort();

        if (vtrIds.length === 0) {
            vtrEmpenhadasContent.innerHTML = '<p class="no-vtrs">Nenhuma VTR empenhada</p>';
        } else {
            let html = '<div class="vtr-list">';
            vtrIds.forEach(vtrNum => {
                const list = groupedByVTR[vtrNum];
                const exampleOcc = list[0].ocorrencia;
                const gravidadeClass = exampleOcc ? `gravidade-${exampleOcc.gravidade.toLowerCase()}` : '';
                html += `
                    <div class="vtr-item" data-vtr="${vtrNum}" style="display: flex; align-items: center; justify-content: space-between; padding: 12px;">
                        <div>
                            <div class="vtr-number" style="font-weight:600">VTR ${vtrNum}</div>
                            <div class="vtr-occurrence" style="font-size:13px; color:#666;">${list.length} ocorrência(s) atribuída(s)</div>
                        </div>
                        <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
                            <div class="${gravidadeClass}" style="font-size:12px;">${exampleOcc ? exampleOcc.gravidade : ''}</div>
                            <button class="btn-secondary btn-vtr-open" data-vtr="${vtrNum}" style="padding:6px 10px; font-size:13px;">Ver Ocorrências</button>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            vtrEmpenhadasContent.innerHTML = html;

            // Attach handler: when user clicks "Ver Ocorrências" show a selection of occurrences for that VTR
            document.querySelectorAll('.btn-vtr-open').forEach(btn => {
                btn.addEventListener('click', async (ev) => {
                    const vtrNumber = btn.getAttribute('data-vtr');
                    const list = groupedByVTR[vtrNumber] || [];
                    if (list.length === 0) return;

                    // Build modal content listing occurrences for this VTR
                    const modal = document.getElementById('ocorrenciaModal');
                    const modalContent = document.getElementById('ocorrenciaModalContent');

                    let html = `<h2>VTR ${vtrNumber} — Ocorrências (${list.length})</h2><div style="display:flex;flex-direction:column;gap:10px;">`;
                    list.forEach(item => {
                        const o = item.ocorrencia;
                        html += `
                            <div style="padding:10px; background:#fff; border:1px solid #ddd; border-radius:4px; display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <div style="font-weight:700;">#${o.numeroRegistro} — ${o.rua}, ${o.numero} - ${o.bairro}</div>
                                    <div style="font-size:13px; color:#666;">${o.dataHora} — ${o.natureza}</div>
                                </div>
                                <div style="display:flex; flex-direction:column; gap:6px;">
                                    <button class="btn-cadastro btn-open-occ" data-key="${item.ocorrenciaKey}">Abrir</button>
                                </div>
                            </div>
                        `;
                    });
                    html += `<div style="margin-top:12px;"><button id="btnCloseVtrList" class="btn-secondary" style="width:100%;">Fechar</button></div></div>`;

                    modalContent.innerHTML = html;
                    modal.style.display = 'block';

                    // Attach handlers for each "Abrir" button to open the detailed VTR occurrence modal
                    modalContent.querySelectorAll('.btn-open-occ').forEach(openBtn => {
                        openBtn.addEventListener('click', async () => {
                            const ocorrenciaKey = openBtn.getAttribute('data-key');
                            const ocorrencia = atendimentos[ocorrenciaKey];
                            modal.style.display = 'none';
                            const { showVTROcorrenciaDetails } = await import('./vtr-occurrence-modal.js');
                            showVTROcorrenciaDetails(ocorrenciaKey, ocorrencia, vtrNumber);
                        });
                    });

                    // close button
                    const closeBtn = document.getElementById('btnCloseVtrList');
                    if (closeBtn) {
                        closeBtn.addEventListener('click', () => {
                            modal.style.display = 'none';
                        });
                    }

                });
            });
        }
    } catch (error) {
        console.error('Erro ao carregar VTRs:', error);
    }
}

async function showStatusChangeMenu(vtrKey, vtrNum, btlNumber) {
    const currentVTR = await getData(`vtrsDisponiveis/${vtrKey}`);
    const currentStatus = currentVTR?.status || 'DISPONIVEL';
    
    const modal = document.getElementById('ocorrenciaModal');
    const modalContent = document.getElementById('ocorrenciaModalContent');
    
    let html = `
        <h2>Alterar Status - VTR ${vtrNum}</h2>
        <div style="margin: 20px 0;">
            <p style="margin-bottom: 15px;"><strong>Status Atual:</strong> ${currentStatus}</p>
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <button class="btn-status" data-status="DISPONIVEL" style="background: #4caf50; color: white; padding: 12px; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">DISPONÍVEL</button>
                <button class="btn-status" data-status="RONDA ESCOLAR" style="background: #4caf50; color: white; padding: 12px; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">📚 RONDA ESCOLAR</button>
                <button class="btn-status" data-status="OPERACAO ESPECIAL" style="background: #ffc107; color: black; padding: 12px; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">OPERAÇÃO ESPECIAL</button>
                <button class="btn-status" data-status="ALIMENTACAO" style="background: #ff9800; color: white; padding: 12px; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">ALIMENTAÇÃO</button>
                <button class="btn-status" data-status="BAIXA MECANICA" style="background: #f44336; color: white; padding: 12px; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">BAIXA MECÂNICA</button>
            </div>
            <button id="btnCancelarStatus" class="btn-secondary" style="width: 100%; margin-top: 15px;">Cancelar</button>
        </div>
    `;
    
    modalContent.innerHTML = html;
    modal.style.display = 'block';
    
    document.querySelectorAll('.btn-status').forEach(btn => {
        btn.addEventListener('click', async () => {
            const newStatus = btn.getAttribute('data-status');
            const { updateData } = await import('./database.js');
            
            await updateData(`vtrsDisponiveis/${vtrKey}`, {
                status: newStatus
            });
            
            modal.style.display = 'none';
            await loadVTRPanels(btlNumber);
        });
    });
    
    document.getElementById('btnCancelarStatus').addEventListener('click', () => {
        modal.style.display = 'none';
    });
}