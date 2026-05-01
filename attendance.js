import { pushData, getData, getNextSequentialNumber, getRef, updateData } from './database.js';
import { showMessage } from './utils.js';
import { getCurrentUser } from './auth.js';
import { update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

export let veiculos = [];
export let pessoas = [];
export let imeis = [];

export function addVeiculo(veiculo) {
    veiculos.push(veiculo);
}

export function removePessoaById(id) {
    pessoas = pessoas.filter(p => p.id !== id);
}

export function removeVeiculoById(id) {
    veiculos = veiculos.filter(v => v.id !== id);
}

export function addPessoa(pessoa) {
    pessoas.push(pessoa);
}

export function addImei(imei) {
    imeis.push(imei);
}

export function removeImeiById(id) {
    imeis = imeis.filter(i => i.id !== id);
}

export function clearVeiculos() {
    veiculos = [];
}

export function clearPessoas() {
    pessoas = [];
}

export function clearImeis() {
    imeis = [];
}

export function getVeiculos() {
    return veiculos;
}

export function getPessoas() {
    return pessoas;
}

export function getImeis() {
    return imeis;
}

export async function setupPauseSystem() {
    const pauseButtons = document.querySelectorAll('.btn-pause');
    const pauseStatus = document.getElementById('pauseStatus');
    const pauseTimer = document.getElementById('pauseTimer');
    
    let currentPause = null;
    let pauseStartTime = null;
    let pauseInterval = null;
    let currentSessionKey = null;

    // Load pause time limits from database
    const pauseLimits = await getData('pauseTimeLimits');
    const timeLimits = {
        BANHEIRO: (pauseLimits?.banheiro || 10) * 60 * 1000,
        'COFFEE BREAK': (pauseLimits?.alimentacao || 30) * 60 * 1000,
        'JANTA/ALMOÇO': (pauseLimits?.janta || 60) * 60 * 1000
    };
    
    const attendanceFormElement = document.getElementById('attendanceForm');

    // Restore active pause if exists
    const activePause = localStorage.getItem('activePause');
    if (activePause) {
        const pauseData = JSON.parse(activePause);
        currentPause = pauseData.type;
        pauseStartTime = pauseData.startTime;
        currentSessionKey = pauseData.sessionKey;
        startPauseTimer();
    } else {
        // Start in OPERANDO by default
        await startPause('OPERANDO');
    }

    pauseButtons.forEach(btn => {
        btn.addEventListener('click', async () => {
            const pauseType = btn.getAttribute('data-pause');
            
            // Don't allow clicking on OPERANDO
            if (pauseType === 'OPERANDO') {
                return;
            }
            
            if (currentPause === pauseType) {
                // End current pause and return to OPERANDO
                await endPause();
                await startPause('OPERANDO');
            } else {
                // End previous pause if any
                if (currentPause && currentPause !== 'OPERANDO') {
                    await endPause();
                }
                // Start new pause
                await startPause(pauseType);
            }
        });
    });

    async function startPause(type) {
        const currentUser = getCurrentUser();
        if (!currentUser) return;

        currentPause = type;
        pauseStartTime = Date.now();

        // Create pause session in database
        const sessionData = {
            userId: currentUser.cpf ? currentUser.cpf.replace(/\D/g, '') : currentUser.re,
            userName: currentUser.tipo === 'MILITAR' 
                ? `${currentUser.graduacao} ${currentUser.nomeGuerra}` 
                : currentUser.nomeCompleto,
            pa: currentUser.paValue || 'N/A',
            tipo: type,
            inicio: new Date(pauseStartTime).toLocaleString('pt-BR'),
            inicioTimestamp: pauseStartTime
        };

        const session = await pushData('pauseSessions', sessionData);
        currentSessionKey = session.key;

        localStorage.setItem('activePause', JSON.stringify({
            type: type,
            startTime: pauseStartTime,
            sessionKey: currentSessionKey
        }));

        updatePauseButtons();
        startPauseTimer();
        updateFormState();
    }

    async function endPause() {
        if (!currentPause || !currentSessionKey) return;

        const endTime = Date.now();
        const duration = endTime - pauseStartTime;

        // Update session in database
        await updateData(`pauseSessions/${currentSessionKey}`, {
            fim: new Date(endTime).toLocaleString('pt-BR'),
            fimTimestamp: endTime,
            duracao: duration
        });

        currentPause = null;
        pauseStartTime = null;
        currentSessionKey = null;

        if (pauseInterval) {
            clearInterval(pauseInterval);
            pauseInterval = null;
        }

        localStorage.removeItem('activePause');
        updatePauseButtons();
        pauseStatus.textContent = '';
        pauseTimer.textContent = '';
        updateFormState();
    }

    function startPauseTimer() {
        updatePauseButtons();
        updateTimer();
        
        if (pauseInterval) {
            clearInterval(pauseInterval);
        }
        
        pauseInterval = setInterval(updateTimer, 1000);
    }

    function updateTimer() {
        if (!currentPause || !pauseStartTime) return;

        const elapsed = Date.now() - pauseStartTime;
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        const displayMinutes = minutes % 60;
        const displaySeconds = seconds % 60;

        pauseTimer.textContent = `${String(hours).padStart(2, '0')}:${String(displayMinutes).padStart(2, '0')}:${String(displaySeconds).padStart(2, '0')}`;

        // Check time limits and update color
        if (currentPause === 'BANHEIRO' || currentPause === 'ALIMENTACAO' || currentPause === 'JANTA/ALMOÇO') {
            const limit = timeLimits[currentPause];
            const warningThreshold = limit * 1.2; // 20% over

            if (elapsed > warningThreshold) {
                pauseTimer.style.color = '#d32f2f';
                pauseTimer.classList.add('pause-warning');
            } else if (elapsed > limit) {
                pauseTimer.style.color = '#ff9800';
                pauseTimer.classList.remove('pause-warning');
            } else {
                pauseTimer.style.color = '#333';
                pauseTimer.classList.remove('pause-warning');
            }
        }
    }

    function updatePauseButtons() {
        const operandoBtn = document.getElementById('btnPausaOperando');
        
        pauseButtons.forEach(btn => {
            const type = btn.getAttribute('data-pause');
            if (type === currentPause) {
                if (type === 'OPERANDO') {
                    btn.style.background = '#388e3c'; // Green for OPERANDO
                    btn.style.opacity = '1';
                    btn.style.cursor = 'default';
                } else {
                    btn.style.background = '#d32f2f'; // Red for active pauses
                    btn.style.opacity = '1';
                    btn.style.cursor = 'pointer';
                }
                pauseStatus.textContent = `Status: ${type}`;
                pauseStatus.style.color = type === 'OPERANDO' ? '#388e3c' : '#d32f2f';
            } else {
                if (type === 'OPERANDO') {
                    btn.style.background = '#388e3c';
                    btn.style.opacity = currentPause !== 'OPERANDO' ? '0.4' : '1';
                    btn.style.cursor = 'default';
                } else {
                    btn.style.background = '#2c3e50';
                    btn.style.opacity = (currentPause && currentPause !== 'OPERANDO') ? '0.4' : '1';
                    btn.style.cursor = (currentPause && currentPause !== 'OPERANDO') ? 'not-allowed' : 'pointer';
                    btn.style.pointerEvents = (currentPause && currentPause !== 'OPERANDO') ? 'none' : 'auto';
                }
            }
        });

        if (!currentPause) {
            pauseStatus.textContent = 'Nenhuma pausa ativa';
            pauseStatus.style.color = '#999';
        }
    }
    
    function updateFormState() {
        if (!attendanceFormElement) return;
        
        // Disable form if not OPERANDO
        if (currentPause && currentPause !== 'OPERANDO') {
            attendanceFormElement.style.opacity = '0.4';
            attendanceFormElement.style.pointerEvents = 'none';
            
            // Disable all inputs
            const inputs = attendanceFormElement.querySelectorAll('input, select, textarea, button');
            inputs.forEach(input => {
                input.disabled = true;
            });
        } else {
            attendanceFormElement.style.opacity = '1';
            attendanceFormElement.style.pointerEvents = 'auto';
            
            // Enable all inputs
            const inputs = attendanceFormElement.querySelectorAll('input, select, textarea, button');
            inputs.forEach(input => {
                input.disabled = false;
            });
        }
    }
}

export function restoreFormFields() {
    const btnVeiculos = document.getElementById('btnVeiculos');
    const btnPessoas = document.getElementById('btnPessoas');
    const btnImei = document.getElementById('btnImei');
    const attendanceForm = document.getElementById('attendanceForm');
    const btnBackFromAttendance = document.getElementById('btnBackFromAttendance');
    
    if (!attendanceForm) return;

    document.querySelectorAll('#attendanceForm > .form-row, #attendanceForm > .form-group').forEach(el => {
        el.style.display = '';
    });
    
    // Hide aux sections
    document.getElementById('veiculosSection').style.display = 'none';
    document.getElementById('pessoasSection').style.display = 'none';
    document.getElementById('imeiSection').style.display = 'none';
    
    // Restore button visibility
    if (btnVeiculos) btnVeiculos.style.display = '';
    if (btnPessoas) btnPessoas.style.display = '';
    if (btnImei) btnImei.style.display = '';
    
    const buttonGroup = attendanceForm.querySelector('.button-group');
    if (buttonGroup) buttonGroup.style.display = 'flex';
    
    const btnMinhasOcorrencias = document.getElementById('btnMinhasOcorrencias');
    const btnPesquisarOcorrencias = document.getElementById('btnPesquisarOcorrencias');
    const btnSalvarAtendimento = attendanceForm.querySelector('.btn-cadastro[type="submit"]');

    if (btnMinhasOcorrencias) btnMinhasOcorrencias.style.display = '';
    if (btnPesquisarOcorrencias) btnPesquisarOcorrencias.style.display = '';
    if (btnSalvarAtendimento) btnSalvarAtendimento.style.display = '';

    // Hide the dedicated save button for reiteration
    const btnSalvarHistorico = document.getElementById('btnSalvarHistoricoReiteracao');
    if (btnSalvarHistorico) {
        btnSalvarHistorico.style.display = 'none';
    }
    
    // Hide the simple complement save button section (which is injected by the alert)
    const reiteracaoComplementoSection = document.getElementById('reiteracaoComplementoSection');
    if (reiteracaoComplementoSection) {
        reiteracaoComplementoSection.style.display = 'none';
    }

    if (btnBackFromAttendance) btnBackFromAttendance.style.display = '';

    const historico = document.getElementById('historico');
    if (historico) {
        historico.readOnly = false;
        historico.style.backgroundColor = '';
    }
    
    // Remove append fields if they exist
    const appendField = document.getElementById('historicoAppend');
    if (appendField) {
        appendField.closest('div').remove();
    }
    const appendFieldReiterar = document.getElementById('historicoAppendReiterar');
    if (appendFieldReiterar) {
        appendFieldReiterar.closest('div').remove();
    }
    
    window.resgatandoOcorrenciaKey = null;
    window.resgatandoOcorrenciaHistoricoOriginal = null;
    
    // Clear last occurrence display
    const lastOccurrenceDisplay = document.getElementById('lastOccurrenceDisplay');
    if (lastOccurrenceDisplay) {
        lastOccurrenceDisplay.style.display = 'none';
    }
    
    // Also remove the alert div if it exists
    const existingAlert = document.querySelector('.telefone-alert');
    if (existingAlert) {
        existingAlert.remove();
    }
}

export function renderVeiculos(container) {
    if (!container) return;
    
    if (veiculos.length === 0) {
        container.innerHTML = '';
        return;
    }

    let html = '<h4>Veículos Adicionados:</h4>';
    veiculos.forEach(veiculo => {
        html += `
            <div class="veiculo-item">
                <button class="btn-remove" onclick="window.removeVeiculo(${veiculo.id})">×</button>
                <p><strong>Placa:</strong> ${veiculo.placa}</p>
                ${veiculo.modelo ? `<p><strong>Modelo:</strong> ${veiculo.modelo}</p>` : ''}
                ${veiculo.ano ? `<p><strong>Ano:</strong> ${veiculo.ano}</p>` : ''}
                ${veiculo.cor ? `<p><strong>Cor:</strong> ${veiculo.cor}</p>` : ''}
                ${veiculo.tipo ? `<p><strong>Tipo:</strong> ${veiculo.tipo}</p>` : ''}
                ${veiculo.estado ? `<p><strong>Estado:</strong> ${veiculo.estado}</p>` : ''}
                <p><strong>Situação:</strong> ${veiculo.situacao}</p>
            </div>
        `;
    });
    container.innerHTML = html;
}

export function renderPessoas(container) {
    if (!container) return;
    
    if (pessoas.length === 0) {
        container.innerHTML = '';
        return;
    }

    let html = '<h4>Pessoas Adicionadas:</h4>';
    pessoas.forEach(pessoa => {
        html += `
            <div class="pessoa-item">
                <button class="btn-remove" onclick="window.removePessoa(${pessoa.id})">×</button>
                <p><strong>Nome:</strong> ${pessoa.nome}</p>
                ${pessoa.cpf ? `<p><strong>CPF:</strong> ${pessoa.cpf}</p>` : ''}
                ${pessoa.dataNascimento ? `<p><strong>Data Nascimento:</strong> ${new Date(pessoa.dataNascimento).toLocaleDateString('pt-BR')}</p>` : ''}
                ${pessoa.telefone ? `<p><strong>Telefone:</strong> ${pessoa.telefone}</p>` : ''}
                <p><strong>Envolvimento:</strong> ${pessoa.envolvimento}</p>
            </div>
        `;
    });
    container.innerHTML = html;
}

export function renderImeis(container) {
    if (!container) return;
    
    if (imeis.length === 0) {
        container.innerHTML = '';
        return;
    }

    let html = '<h4>IMEIs Adicionados:</h4>';
    imeis.forEach(imei => {
        html += `
            <div class="imei-item veiculo-item">
                <button class="btn-remove" onclick="window.removeImei(${imei.id})">×</button>
                <p><strong>IMEI:</strong> ${imei.numero}</p>
                <p><strong>Situação:</strong> ${imei.situacao}</p>
            </div>
        `;
    });
    container.innerHTML = html;
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

export async function saveAttendance(formData, attendanceMessage) {
    try {
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        const sequentialNumber = await getNextSequentialNumber(today);
        const currentUser = getCurrentUser();

        const attendanceData = {
            numeroRegistro: sequentialNumber,
            dataHora: now.toLocaleString('pt-BR'),
            timestamp: now.getTime(),
            userId: currentUser ? (currentUser.cpf ? currentUser.cpf.replace(/\D/g, '') : currentUser.re) : null,
            ...formData,
            data: today,
            veiculos: veiculos.length > 0 ? veiculos : null,
            pessoas: pessoas.length > 0 ? pessoas : null,
            imeis: imeis.length > 0 ? imeis : null
        };
        
        // If resgatando, add reference to original occurrence and append historico
        if (window.resgatandoOcorrenciaKey) {
            const atendimentos = await getData('atendimentos');
            const ocorrenciaOriginal = atendimentos[window.resgatandoOcorrenciaKey];
            attendanceData.ocorrenciaResgatadaDe = ocorrenciaOriginal.numeroRegistro;
            attendanceData.ocorrenciaResgatadaKey = window.resgatandoOcorrenciaKey;
            
            // Append new content to original historico if append field exists
            const appendField = document.getElementById('historicoAppend');
            if (appendField && appendField.value.trim()) {
                attendanceData.historico = `${window.resgatandoOcorrenciaHistoricoOriginal}\n\n${appendField.value.trim()}`;
            }
            
            delete window.resgatandoOcorrenciaKey;
            delete window.resgatandoOcorrenciaHistoricoOriginal;
        }

        await pushData('atendimentos', attendanceData);
        showMessage(attendanceMessage, `Atendimento salvo com sucesso! Número do registro: ${sequentialNumber}`, 'success');

        const lastOccurrenceDisplay = document.getElementById('lastOccurrenceDisplay');
        if (lastOccurrenceDisplay) {
            const naturezaCodigo = formData.natureza.split(' - ')[0];
            lastOccurrenceDisplay.innerHTML = `
                <h4>Última Gerada</h4>
                <div class="occurrence-number">#${sequentialNumber}</div>
                <div class="occurrence-nature">${naturezaCodigo}</div>
            `;
            lastOccurrenceDisplay.style.display = 'block';
        }

        clearVeiculos();
        clearPessoas();
        clearImeis();

        return true;
    } catch (error) {
        showMessage(attendanceMessage, 'Erro ao salvar atendimento: ' + error.message, 'error');
        return false;
    }
}

export async function checkExistingOcorrencias(telefone) {
    try {
        const atendimentos = await getData('atendimentos');
        
        if (!atendimentos) {
            return null;
        }
        
        const now = Date.now();
        const sixHoursAgo = now - (6 * 60 * 60 * 1000);
        
        const matchingOcorrencias = Object.entries(atendimentos)
            .filter(([key, atendimento]) => {
                return atendimento.telefone === telefone && 
                       atendimento.timestamp >= sixHoursAgo;
            })
            .sort((a, b) => b[1].timestamp - a[1].timestamp);
        
        if (matchingOcorrencias.length > 0) {
            return matchingOcorrencias[0]; // Return most recent
        }
        
        return null;
    } catch (error) {
        console.error('Erro ao verificar ocorrências:', error);
        return null;
    }
}

export async function reiterarOcorrencia(ocorrenciaKey, complemento = null) {
    try {
        const atendimentoRef = getRef(`atendimentos/${ocorrenciaKey}`);
        const now = new Date();
        
        const reiteracao = {
            dataHora: now.toLocaleString('pt-BR'),
            dataHoraTimestamp: now.getTime(),
            tipo: 'REITERAÇÃO'
        };
        
        if (complemento) {
            reiteracao.complemento = complemento;
        }
        
        const atendimentos = await getData('atendimentos');
        const ocorrencia = atendimentos[ocorrenciaKey];
        
        const reiteracoes = ocorrencia.reiteracoes || [];
        reiteracoes.push(reiteracao);
        
        // store both human-readable and timestamp for ultimaReiteracao for later time-to-read calculations
        await update(atendimentoRef, {
            reiteracoes: reiteracoes,
            ultimaReiteracao: now.toLocaleString('pt-BR'),
            ultimaReiteracaoTimestamp: now.getTime(),
            reiteracaoLida: false,
            observada: false  // Reset observed state when reiterated
        });
        
        return true;
    } catch (error) {
        console.error('Erro ao reiterar ocorrência:', error);
        return false;
    }
}

export async function resgatarOcorrencia(ocorrenciaKey) {
    // This function is no longer needed as we're using the form directly
    return null;
}

export async function loadUserOcorrencias(ocorrenciasContent) {
    const currentUser = getCurrentUser();

    if (!currentUser) {
        ocorrenciasContent.innerHTML = '<p>Usuário não identificado.</p>';
        return;
    }

    try {
        const atendimentos = await getData('atendimentos');

        if (!atendimentos) {
            ocorrenciasContent.innerHTML = '<p>Nenhuma ocorrência encontrada.</p>';
            return;
        }

        const now = Date.now();
        const sevenHoursAgo = now - (7 * 60 * 60 * 1000);

        const userOcorrencias = Object.entries(atendimentos)
            .filter(([key, atendimento]) => atendimento.timestamp >= sevenHoursAgo)
            .sort((a, b) => b[1].timestamp - a[1].timestamp);

        if (userOcorrencias.length === 0) {
            ocorrenciasContent.innerHTML = '<p>Nenhuma ocorrência encontrada nas últimas 7 horas.</p>';
        } else {
            let html = '<div class="ocorrencias-grid">';
            userOcorrencias.forEach(([key, ocorrencia]) => {
                html += `
                    <div class="ocorrencia-card">
                        <h3>Registro #${ocorrencia.numeroRegistro}</h3>
                        <p><strong>Data/Hora:</strong> ${ocorrencia.dataHora}</p>
                        <p><strong>Nome:</strong> ${ocorrencia.nome}</p>
                        <p><strong>Telefone:</strong> ${ocorrencia.telefone}</p>
                        <p><strong>Endereço:</strong> ${ocorrencia.rua}, ${ocorrencia.numero} - ${ocorrencia.bairro}</p>
                        <p><strong>Município:</strong> ${ocorrencia.municipio} - ${ocorrencia.estado}</p>
                        <p><strong>CEP:</strong> ${ocorrencia.cep}</p>
                        <p><strong>BTL:</strong> ${ocorrencia.btl}</p>
                        <p><strong>Referência:</strong> ${ocorrencia.referencia}</p>
                        <p><strong>Natureza:</strong> ${ocorrencia.natureza}</p>
                        <p><strong>Gravidade:</strong> ${ocorrencia.gravidade}</p>
                        <p><strong>Histórico:</strong> ${ocorrencia.historico}</p>
                    </div>
                `;
            });
            html += '</div>';
            ocorrenciasContent.innerHTML = html;
        }
    } catch (error) {
        ocorrenciasContent.innerHTML = '<p>Erro ao carregar ocorrências: ' + error.message + '</p>';
    }
}