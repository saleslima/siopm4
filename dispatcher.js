import { getData, pushData, removeData, updateData, getRef } from './database.js';
import { getCurrentUser } from './auth.js';
import { update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { formatDateTimeLocal } from './search.js';

export async function loadDispatcherOcorrencias(btlNumber, dispatcherContent) {
    try {
        const atendimentos = await getData('atendimentos');

        if (!atendimentos) {
            dispatcherContent.innerHTML = '<p>Nenhuma ocorrência encontrada.</p>';
            const { loadVTRPanels } = await import('./vtr-management.js');
            await loadVTRPanels(btlNumber);
            return;
        }

        const vtrAssignments = await getData('vtrAssignments') || {};
        const assignedOcorrencias = new Map();
        Object.values(vtrAssignments).forEach(v => {
            assignedOcorrencias.set(v.ocorrenciaId, v.vtrNumber);
        });

        const currentUser = getCurrentUser();
        
        // Load naturezas configuration
        const naturezas = await getData('naturezas') || [];
        
        const btlOcorrencias = Object.entries(atendimentos)
            .filter(([key, atendimento]) => {
                if (atendimento.encerrado) return false;
                
                // Check if this is the primary BTL
                if (atendimento.btl === btlNumber) return true;
                
                // Check if natureza is configured to be shown to this service type
                const naturezaConfig = naturezas.find(n => n.valor === atendimento.natureza);
                if (naturezaConfig && naturezaConfig.servicos && naturezaConfig.servicos.includes(currentUser.servico)) {
                    // If dispatcher, only show if no VTR assigned yet
                    if (currentUser.funcao === 'DESPACHADOR' || currentUser.funcao === 'DESPACHADOR COBOM') {
                        return !assignedOcorrencias.has(key);
                    }
                    // If supervisor, always show
                    if (currentUser.funcao === 'SUPERVISOR' || currentUser.funcao === 'SUPERVISOR COBOM') {
                        return true;
                    }
                }
                
                // Check if apoio was requested for this service
                if (atendimento.apoiosSolicitados && atendimento.apoiosSolicitados.length > 0) {
                    // Check if user's service matches any requested apoio
                    const userServico = currentUser.servico;
                    const hasApoioForService = atendimento.apoiosSolicitados.some(apoio => apoio.servico === userServico);
                    
                    if (hasApoioForService) {
                        // If dispatcher, only show if no VTR assigned yet to primary BTL
                        if (currentUser.funcao === 'DESPACHADOR' || currentUser.funcao === 'DESPACHADOR COBOM') {
                            return !assignedOcorrencias.has(key);
                        }
                        // If supervisor, always show
                        if (currentUser.funcao === 'SUPERVISOR' || currentUser.funcao === 'SUPERVISOR COBOM') {
                            return true;
                        }
                    }
                }
                
                return false;
            })
            .sort((a, b) => b[1].timestamp - a[1].timestamp);

        if (btlOcorrencias.length === 0) {
            dispatcherContent.innerHTML = '<p>Nenhuma ocorrência pendente para este BTL.</p>';
        } else {
            const now = Date.now();
            let html = '<div style="margin-bottom: 15px; display: flex; gap: 10px; align-items: center;">';
            // Mark the shortcut letter (O) in bold for "Observar Todas"
            html += '<button id="btnObservarTodas" class="btn-secondary" data-shortcut="O" style="padding: 8px 16px; font-size: 14px;">👁️ <strong>O</strong>bservar Todas</button>';
            
            html += '</div>';
            html += '<div class="ocorrencias-list-dispatcher">';
            
            // Filter and count hidden occurrences
            const currentUser = getCurrentUser();
            const isSupervisor = currentUser && (currentUser.funcao === 'SUPERVISOR' || currentUser.funcao === 'SUPERVISOR COBOM');
            
            const hiddenNatures = isSupervisor ? [] : JSON.parse(localStorage.getItem('hiddenNatures') || '[]');
            const hiddenOcorrencias = btlOcorrencias.filter(([key, ocorrencia]) => {
                const naturezaCodigo = ocorrencia.natureza.split(' - ')[0];
                return hiddenNatures.includes(naturezaCodigo);
            });
            
            const hiddenC01Count = hiddenOcorrencias.filter(([k, o]) => o.natureza.split(' - ')[0] === 'C01').length;
            const hiddenC99Count = hiddenOcorrencias.filter(([k, o]) => o.natureza.split(' - ')[0] === 'C99').length;
            const hasHiddenOccurrences = hiddenOcorrencias.length > 0;

            // Show button with count or config option
            let hiddenCountText = '';
            if (hiddenC01Count > 0 && hiddenC99Count > 0) {
                hiddenCountText = ` (C01: ${hiddenC01Count}, C99: ${hiddenC99Count})`;
            } else if (hiddenC01Count > 0) {
                hiddenCountText = ` (C01: ${hiddenC01Count})`;
            } else if (hiddenC99Count > 0) {
                hiddenCountText = ` (C99: ${hiddenC99Count})`;
            }

            if (hasHiddenOccurrences) {
                html += `<button id="btnOcultarOcorrencias" class="btn-secondary" style="padding: 8px 16px; font-size: 14px;">👁️ Exibir Ocorrências${hiddenCountText}</button>`;
            } else {
                html += '<button id="btnOcultarOcorrencias" class="btn-secondary" style="padding: 8px 16px; font-size: 14px;">🙈 Ocultar Ocorrências</button>';
            }

            if (hasHiddenOccurrences) {
                const lastAlertTime = parseInt(localStorage.getItem('lastHiddenOccurrencesAlert') || '0');
                const currentTime = Date.now();
                
                if (currentTime - lastAlertTime > 60 * 60 * 1000) {
                    setTimeout(() => {
                        alert('vc tem ocorrência ocultas');
                        localStorage.setItem('lastHiddenOccurrencesAlert', Date.now().toString());
                    }, 500);
                }
            }

            const filteredBtlOcorrencias = btlOcorrencias.filter(([key, ocorrencia]) => {
                const naturezaCodigo = ocorrencia.natureza.split(' - ')[0];
                return !hiddenNatures.includes(naturezaCodigo);
            });

            filteredBtlOcorrencias.forEach(([key, ocorrencia]) => {
                const tempoMs = now - ocorrencia.timestamp;
                const dias = Math.floor(tempoMs / (1000 * 60 * 60 * 24));
                const horas = Math.floor((tempoMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutos = Math.floor((tempoMs % (1000 * 60 * 60)) / (1000 * 60));
                
                let tempoFormatado;
                if (dias > 0) {
                    tempoFormatado = `${dias}d ${horas}h`;
                } else {
                    tempoFormatado = `${horas}h ${minutos}min`;
                }

                const naturezaCodigo = ocorrencia.natureza.split(' - ')[0];

                let corNatureza = '';
                if (ocorrencia.gravidade === 'URGENTE') {
                    corNatureza = 'color: #d32f2f;';
                } else if (ocorrencia.gravidade === 'NORMAL') {
                    corNatureza = 'color: #1976d2;';
                } else if (ocorrencia.gravidade === 'SOP') {
                    corNatureza = 'color: #388e3c;';
                }

                const numReiteracoes = ocorrencia.reiteracoes ? ocorrencia.reiteracoes.length : 0;
                const hasVTR = assignedOcorrencias.has(key);

                const isReiteradaNaoLida = ocorrencia.ultimaReiteracao && !ocorrencia.reiteracaoLida;
                const isObservada = ocorrencia.observada || false;
                
                // Check if any observation was made by a supervisor
                const hasSupervisorObservation = ocorrencia.observacoes && ocorrencia.observacoes.some(obs => {
                    // Check if usuario string contains supervisor keywords
                    const usuario = (obs.usuario || '').toUpperCase();
                    return usuario.includes('SUPERVISOR');
                });

                let itemClass = 'ocorrencia-item-dispatcher';
                let itemStyle = '';
                if (hasSupervisorObservation) {
                    itemStyle = 'background: #ffebee !important; border-color: #d32f2f !important;';
                } else if (isReiteradaNaoLida) {
                    itemClass += ' ocorrencia-reiterada-nao-lida';
                } else if (!isObservada) {
                    itemClass += ' ocorrencia-nao-observada';
                }

                const showInPendencias = !hasVTR || isReiteradaNaoLida;

                // Check if this is an apoio request
                const isApoio = ocorrencia.btl !== btlNumber;
                let apoioLabel = '';
                if (isApoio) {
                    apoioLabel = '<span style="background: #ff9800; color: white; padding: 3px 8px; border-radius: 3px; font-size: 12px; margin-left: 5px;">APOIO</span>';
                }
                
                const checkIcon = isObservada ? '<span style="color: #1976d2; font-size: 18px; margin-right: 5px;">✓</span>' : '';

                if (showInPendencias) {
                    html += `
                        <div class="${itemClass}" data-key="${key}" style="display: flex; align-items: center; gap: 10px; padding: 10px 15px; ${itemStyle}">
                            ${checkIcon}
                            <span style="font-weight: 600; font-size: 16px; min-width: 50px;">#${ocorrencia.numeroRegistro}${apoioLabel}</span>
                            <span style="flex: 1; font-size: 14px;">${ocorrencia.rua}, ${ocorrencia.numero}</span>
                            <span style="font-weight: 600; font-size: 14px; ${corNatureza} min-width: 60px;">${naturezaCodigo}</span>
                            <span style="font-size: 14px; color: #666; min-width: 80px;">${tempoFormatado}</span>
                            <span style="font-size: 14px; font-weight: 600; color: ${numReiteracoes > 0 ? '#d32f2f' : '#999'}; min-width: 40px; text-align: center;">${numReiteracoes}</span>
                        </div>
                    `;
                }
            });
            html += '</div>';
            dispatcherContent.innerHTML = html;

            // Setup "Observar Todas" button
            const btnObservarTodas = document.getElementById('btnObservarTodas');
            if (btnObservarTodas) {
                btnObservarTodas.addEventListener('click', async () => {
                    await showObservarTodasDialog(btlOcorrencias, btlNumber);
                });
            }

            // Setup "Ocultar Ocorrências" button
            const btnOcultarOcorrencias = document.getElementById('btnOcultarOcorrencias');
            if (btnOcultarOcorrencias) {
                // Hide button for supervisors
                if (isSupervisor) {
                    btnOcultarOcorrencias.style.display = 'none';
                } else {
                    btnOcultarOcorrencias.addEventListener('click', () => {
                        if (hasHiddenOccurrences) {
                            // Show hidden occurrences list
                            showHiddenOcorrenciasList(hiddenOcorrencias, btlNumber);
                        } else {
                            // Show dialog to select what to hide
                            showOcultarOcorrenciasDialog(btlNumber);
                        }
                    });
                }
            }

            document.querySelectorAll('.ocorrencia-item-dispatcher').forEach(item => {
                item.addEventListener('click', async () => {
                    const key = item.getAttribute('data-key');
                    const atendimentos = await getData('atendimentos');
                    const ocorrencia = atendimentos[key];

                    // Always append observed flag and mark reiteracao as read if present,
                    // plus record timestamps and create an automatic observation entry when first opened.
                    const atendimentoRef = getRef(`atendimentos/${key}`);

                    const updates = {};
                    const now = new Date();
                    const nowLocale = now.toLocaleString('pt-BR');
                    const nowTs = now.getTime();

                    // If not observed, set opened timestamp (only once) but DO NOT create a synthetic system observation.
                    if (!ocorrencia.observada) {
                        updates.observada = true;
                        updates.abriuTimestamp = nowTs;
                        updates.abriuDataHora = nowLocale;
                    }

                    // If there is an ultima reiteração not read, mark as read and record read timestamp
                    if (ocorrencia.ultimaReiteracao && !ocorrencia.reiteracaoLida) {
                        updates.reiteracaoLida = true;
                        updates.reiteracaoLidaTimestamp = nowTs;
                        updates.reiteracaoLidaDataHora = nowLocale;
                    }

                    // Apply updates if any
                    if (Object.keys(updates).length > 0) {
                        await update(atendimentoRef, updates);
                    }

                    // Reload latest ocorrencia data and open details modal so user sees all observations
                    const updatedAtendimentos = await getData('atendimentos');
                    const updatedOcorrencia = updatedAtendimentos[key];

                    // Open the occurrence details modal
                    const { showOcorrenciaDetails } = await import('./occurrence-modal.js');
                    await showOcorrenciaDetails(key, updatedOcorrencia);
                });

                item.addEventListener('dblclick', async () => {
                    const key = item.getAttribute('data-key');
                    const atendimentos = await getData('atendimentos');
                    const { showOcorrenciaDetails } = await import('./occurrence-modal.js');
                    showOcorrenciaDetails(key, atendimentos[key]);
                });
            });
        }

        const { loadVTRPanels } = await import('./vtr-management.js');
        await loadVTRPanels(btlNumber);

        const { setupDispatcherSearch } = await import('./dispatcher-search.js');
        setupDispatcherSearch();
        
        // Setup VTR cadastro button
        const btnCadastrarVTR = document.getElementById('btnCadastrarVTR');
        if (btnCadastrarVTR) {
            // Remove any existing listeners
            const newBtn = btnCadastrarVTR.cloneNode(true);
            btnCadastrarVTR.parentNode.replaceChild(newBtn, btnCadastrarVTR);
            
            newBtn.addEventListener('click', async () => {
                const vtrNumber = document.getElementById('vtrCadastroInput').value.trim().toUpperCase();

                if (!vtrNumber) {
                    alert('Por favor, digite o número da VTR');
                    return;
                }

                const success = await registerVTR(vtrNumber);

                if (success) {
                    document.getElementById('vtrCadastroInput').value = '';
                }
            });
        }
    } catch (error) {
        dispatcherContent.innerHTML = '<p>Erro ao carregar ocorrências: ' + error.message + '</p>';
    }
}

function showOcultarOcorrenciasDialog(btlNumber) {
    const modal = document.getElementById('ocorrenciaModal');
    const modalContent = document.getElementById('ocorrenciaModalContent');

    const hiddenNatures = JSON.parse(localStorage.getItem('hiddenNatures') || '[]');

    let html = `
        <h2>Ocultar Ocorrências</h2>
        <div style="margin: 20px 0;">
            <p style="margin-bottom: 15px;">Selecione as naturezas que deseja ocultar:</p>
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" id="hideC01" value="C01" ${hiddenNatures.includes('C01') ? 'checked' : ''} style="cursor: pointer;">
                    <span>C01</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" id="hideC99" value="C99" ${hiddenNatures.includes('C99') ? 'checked' : ''} style="cursor: pointer;">
                    <span>C99</span>
                </label>
            </div>
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button id="btnSalvarOcultar" class="btn-cadastro" style="flex: 1;">Salvar</button>
                <button id="btnCancelarOcultar" class="btn-secondary" style="flex: 1;">Cancelar</button>
            </div>
        </div>
    `;

    modalContent.innerHTML = html;
    modal.style.display = 'block';

    const handleCheckboxChange = async () => {
        const selectedNatures = [];
        
        if (document.getElementById('hideC01').checked) {
            selectedNatures.push('C01');
        }
        if (document.getElementById('hideC99').checked) {
            selectedNatures.push('C99');
        }

        localStorage.setItem('hiddenNatures', JSON.stringify(selectedNatures));
        
        // Reset alert timer when changing hidden natures
        if (selectedNatures.length > 0) {
            localStorage.setItem('lastHiddenOccurrencesAlert', Date.now().toString());
        }

        modal.style.display = 'none';
        await loadDispatcherOcorrencias(btlNumber, document.getElementById('dispatcherContent'));
    };

    document.getElementById('hideC01').addEventListener('change', handleCheckboxChange);
    document.getElementById('hideC99').addEventListener('change', handleCheckboxChange);

    document.getElementById('btnSalvarOcultar').addEventListener('click', handleCheckboxChange);

    document.getElementById('btnCancelarOcultar').addEventListener('click', async () => {
        modal.style.display = 'none';
        await loadDispatcherOcorrencias(btlNumber, document.getElementById('dispatcherContent'));
    });
}

function showHiddenOcorrenciasList(hiddenOcorrencias, btlNumber) {
    const modal = document.getElementById('ocorrenciaModal');
    const modalContent = document.getElementById('ocorrenciaModalContent');

    let html = `
        <h2>Ocorrências Ocultas (${hiddenOcorrencias.length})</h2>
        <div style="margin: 20px 0;">
            <div style="max-height: 400px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px;">
    `;

    hiddenOcorrencias.forEach(([key, ocorrencia]) => {
        const naturezaCodigo = ocorrencia.natureza.split(' - ')[0];
        html += `
            <div style="background: #f9f9f9; padding: 12px; border-left: 4px solid #999; border-radius: 4px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-weight: 600; font-size: 16px;">#${ocorrencia.numeroRegistro}</span>
                    <span style="font-weight: 600; color: #666;">${naturezaCodigo}</span>
                </div>
                <p style="margin: 3px 0; font-size: 13px;"><strong>Endereço:</strong> ${ocorrencia.rua}, ${ocorrencia.numero} - ${ocorrencia.bairro}</p>
                <p style="margin: 3px 0; font-size: 13px;"><strong>Data/Hora:</strong> ${ocorrencia.dataHora}</p>
                <p style="margin: 3px 0; font-size: 13px;"><strong>Natureza:</strong> ${ocorrencia.natureza}</p>
            </div>
        `;
    });

    html += `
            </div>
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button id="btnConfigHidden" class="btn-secondary" style="flex: 1;">Configurar Ocultas</button>
                <button id="btnCloseHidden" class="btn-cadastro" style="flex: 1;">Fechar</button>
            </div>
        </div>
    `;

    modalContent.innerHTML = html;
    modal.style.display = 'block';

    document.getElementById('btnConfigHidden').addEventListener('click', () => {
        showOcultarOcorrenciasDialog(btlNumber);
    });

    document.getElementById('btnCloseHidden').addEventListener('click', () => {
        modal.style.display = 'none';
    });
}

async function showObservarTodasDialog(btlOcorrencias, btlNumber) {
    // NOTE: now this will append the same observation to ALL matching ocorrencias
    const modal = document.getElementById('ocorrenciaModal');
    const modalContent = document.getElementById('ocorrenciaModalContent');

    // Use all btlOcorrencias (not only previously unobserved)
    const ocorrenciasParaObservar = btlOcorrencias;

    let html = `
        <h2>Observar Todas as Ocorrências (${ocorrenciasParaObservar.length})</h2>
        <div style="margin: 20px 0;">
            <label style="display: block; margin-bottom: 8px; font-weight: 600;">Digite sua observação (mínimo 10 caracteres):</label>
            <textarea id="observacaoTextoTodas" rows="4" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-family: inherit; font-size: 14px;"></textarea>
            <div style="display: flex; gap: 10px; margin-top: 15px;">
                <button id="btnConfirmarObservacaoTodas" class="btn-cadastro" style="flex: 1;">OK</button>
                <button id="btnCancelarObservacaoTodas" class="btn-secondary" style="flex: 1;">Cancelar</button>
            </div>
        </div>
    `;

    modalContent.innerHTML = html;
    modal.style.display = 'block';

    const observacaoTexto = document.getElementById('observacaoTextoTodas');
    observacaoTexto.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });

    document.getElementById('btnConfirmarObservacaoTodas').addEventListener('click', async () => {
        const texto = observacaoTexto.value.trim();

        if (texto.length < 10) {
            alert('A observação deve ter no mínimo 10 caracteres');
            return;
        }

        try {
            const dataHora = new Date().toLocaleString('pt-BR');
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
            let count = 0;
            
            // For each matching occurrence, append the new observation (even if it already had observations)
            for (const [key] of ocorrenciasParaObservar) {
                const atendimentoRef = getRef(`atendimentos/${key}`);
                const atendimentos = await getData('atendimentos');
                const ocorrenciaAtual = atendimentos[key];

                const observacoes = ocorrenciaAtual.observacoes || [];
                observacoes.push({
                    dataHora: dataHora,
                    texto: texto,
                    usuario: usuarioNome,
                    re: usuarioRE
                });

                await update(atendimentoRef, {
                    observacoes: observacoes,
                    observada: true
                });

                count++;
            }

            alert(`${count} ocorrência(s) atualizada(s) com a observação!`);
            modal.style.display = 'none';

            await loadDispatcherOcorrencias(btlNumber, document.getElementById('dispatcherContent'));
        } catch (error) {
            alert('Erro ao registrar observações: ' + error.message);
        }
    });

    document.getElementById('btnCancelarObservacaoTodas').addEventListener('click', () => {
        modal.style.display = 'none';
    });
}

export async function registerVTR(vtrNumber) {
    try {
        const leadingDigits = vtrNumber.match(/^\d+/);
        if (!leadingDigits || leadingDigits[0].length < 5) {
            alert('VTR inválida! Deve iniciar com pelo menos 5 números.');
            return false;
        }
        
        // Check for duplicates
        const vtrsDisponiveis = await getData('vtrsDisponiveis') || {};
        const existingVTR = Object.values(vtrsDisponiveis).find(vtr => vtr.vtrNumber === vtrNumber);
        
        if (existingVTR) {
            alert(`VTR ${vtrNumber} já está cadastrada no sistema!`);
            return false;
        }
        
        await pushData('vtrsDisponiveis', {
            vtrNumber: vtrNumber,
            timestamp: Date.now(),
            status: 'DISPONIVEL'
        });

        const currentUser = getCurrentUser();
        await loadDispatcherOcorrencias(currentUser.paValue, document.getElementById('dispatcherContent'));
        return true;
    } catch (error) {
        alert('Erro ao cadastrar VTR: ' + error.message);
        return false;
    }
}