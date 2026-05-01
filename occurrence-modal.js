import { getData, pushData, getRef } from './database.js';
import { getCurrentUser } from './auth.js';
import { update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { loadDispatcherOcorrencias } from './dispatcher.js';

export async function showOcorrenciaDetails(key, ocorrencia) {
    const modal = document.getElementById('ocorrenciaModal');
    const modalContent = document.getElementById('ocorrenciaModalContent');

    const vtrsDisponiveis = await getData('vtrsDisponiveis') || {};
    const vtrAssignments = await getData('vtrAssignments') || {};

    const assignedVTRNumbers = new Set(Object.values(vtrAssignments).map(v => v.vtrNumber));

    const currentUser = getCurrentUser();
    let btlForFiltering = currentUser.paValue;
    if (window.selectedBTL) {
        btlForFiltering = window.selectedBTL;
    }

    const btlPrefix = btlForFiltering.substring(0, 2);

    const availableVTRs = Object.entries(vtrsDisponiveis)
        .filter(([key, vtr]) => {
            if (assignedVTRNumbers.has(vtr.vtrNumber)) return false;
            const vtrPrefix = vtr.vtrNumber.substring(0, 2);
            const status = vtr.status || 'DISPONIVEL';
            return vtrPrefix === btlPrefix && (status === 'DISPONIVEL' || status === 'RONDA ESCOLAR');
        })
        .sort((a, b) => a[1].vtrNumber.localeCompare(b[1].vtrNumber));

    const busyVTRs = Object.entries(vtrsDisponiveis)
        .filter(([key, vtr]) => {
            if (!assignedVTRNumbers.has(vtr.vtrNumber)) return false;
            const vtrPrefix = vtr.vtrNumber.substring(0, 2);
            const status = vtr.status || 'DISPONIVEL';
            return vtrPrefix === btlPrefix && status === 'DISPONIVEL';
        })
        .sort((a, b) => a[1].vtrNumber.localeCompare(b[1].vtrNumber));

    let vtrOptionsHTML = '<option value="">Selecione uma VTR...</option>';
    availableVTRs.forEach(([key, vtr]) => {
        vtrOptionsHTML += `<option value="${vtr.vtrNumber}">${vtr.vtrNumber}</option>`;
    });
    busyVTRs.forEach(([key, vtr]) => {
        vtrOptionsHTML += `<option value="${vtr.vtrNumber}" style="color: #d32f2f; font-weight: 600;">${vtr.vtrNumber} (EMPENHADA)</option>`;
    });

    let veiculosHTML = '';
    if (ocorrencia.veiculos && ocorrencia.veiculos.length > 0) {
        veiculosHTML = '<div style="margin-top: 15px; padding: 10px; background: #f5f5f5; border-radius: 4px;"><h3 style="margin-top: 0;">Veículos Envolvidos</h3>';
        ocorrencia.veiculos.forEach((veiculo, index) => {
            veiculosHTML += `
                <div style="margin-bottom: 10px; padding: 10px; background: white; border: 1px solid #ddd; border-radius: 4px;">
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
        veiculosHTML += '</div>';
    }

    let pessoasHTML = '';
    if (ocorrencia.pessoas && ocorrencia.pessoas.length > 0) {
        pessoasHTML = '<div style="margin-top: 15px; padding: 10px; background: #f5f5f5; border-radius: 4px;"><h3 style="margin-top: 0;">Pessoas Envolvidas</h3>';
        ocorrencia.pessoas.forEach((pessoa, index) => {
            pessoasHTML += `
                <div style="margin-bottom: 10px; padding: 10px; background: white; border: 1px solid #ddd; border-radius: 4px;">
                    <p><strong>Nome:</strong> ${pessoa.nome}</p>
                    ${pessoa.cpf ? `<p><strong>CPF:</strong> ${pessoa.cpf}</p>` : ''}
                    ${pessoa.dataNascimento ? `<p><strong>Data Nascimento:</strong> ${new Date(pessoa.dataNascimento).toLocaleDateString('pt-BR')}</p>` : ''}
                    ${pessoa.telefone ? `<p><strong>Telefone:</strong> ${pessoa.telefone}</p>` : ''}
                    <p><strong>Envolvimento:</strong> ${pessoa.envolvimento}</p>
                </div>
            `;
        });
        pessoasHTML += '</div>';
    }

    const isSOP = ocorrencia.gravidade === 'SOP';

    // Build observacoes HTML list if present
    let observacoesHTML = '';
    if (ocorrencia.observacoes && ocorrencia.observacoes.length > 0) {
        observacoesHTML = '<div style="margin-top: 15px; padding: 10px; background: #fff8e1; border-radius: 4px;"><h4 style="margin-top: 0;">Observações</h4>';
        ocorrencia.observacoes.forEach(obs => {
            const userInfo = obs.re && obs.usuario ? ` - RE: ${obs.re} | ${obs.usuario}` : '';
            observacoesHTML += `<p style="margin: 5px 0; font-size: 13px;"><strong>[${obs.dataHora}]${userInfo}</strong> ${obs.texto}</p>`;
        });
        observacoesHTML += '</div>';
    }

    // Compute some admin-friendly timing and counts (if available)
    const numReiteracoes = ocorrencia.reiteracoes ? ocorrencia.reiteracoes.length : 0;
    let tempoAberturaText = '—';
    if (ocorrencia.abriuTimestamp) {
        const abriuTs = typeof ocorrencia.abriuTimestamp === 'number' ? ocorrencia.abriuTimestamp : parseInt(ocorrencia.abriuTimestamp || '0');
        if (!Number.isNaN(abriuTs)) {
            const diffMs = abriuTs - (ocorrencia.timestamp || 0);
            if (!Number.isNaN(diffMs) && diffMs >= 0) {
                const dias = Math.floor(diffMs / (1000*60*60*24));
                const horas = Math.floor((diffMs % (1000*60*60*24)) / (1000*60*60));
                const minutos = Math.floor((diffMs % (1000*60*60)) / (1000*60));
                tempoAberturaText = dias > 0 ? `${dias}d ${horas}h` : `${horas}h ${minutos}min`;
            }
        }
    }

    // Time-to-read for last reiteration if available
    let tempoReiteracaoLidaText = '—';
    if (ocorrencia.ultimaReiteracaoTimestamp && ocorrencia.reiteracaoLidaTimestamp) {
        const diff = (ocorrencia.reiteracaoLidaTimestamp) - (ocorrencia.ultimaReiteracaoTimestamp);
        if (!Number.isNaN(diff) && diff >= 0) {
            const mins = Math.floor(diff / (1000*60));
            if (mins < 60) tempoReiteracaoLidaText = `${mins} min`;
            else {
                const hrs = Math.floor(mins/60);
                tempoReiteracaoLidaText = `${hrs} h ${mins%60} m`;
            }
        }
    }

    let html = `
        <h2>Detalhes da Ocorrência #${ocorrencia.numeroRegistro}</h2>
        <div class="modal-details">
            <p><strong>Data/Hora:</strong> ${ocorrencia.dataHora}</p>
            <p><strong>Nome:</strong> ${ocorrencia.nome}</p>
            <p><strong>Telefone:</strong> ${ocorrencia.telefone}</p>
            <p><strong>Endereço:</strong> ${ocorrencia.rua}, ${ocorrencia.numero} - ${ocorrencia.bairro}</p>
            <p><strong>Município:</strong> ${ocorrencia.municipio} - ${ocorrencia.estado}</p>
            <p><strong>CEP:</strong> ${ocorrencia.cep}</p>
            <p><strong>BTL:</strong> ${ocorrencia.btl}</p>
            <p><strong>Referência:</strong> ${ocorrencia.referencia}</p>
            <p><strong>Natureza:</strong> ${ocorrencia.natureza}</p>
            <p><strong>Gravidade:</strong> <span class="gravidade-${ocorrencia.gravidade.toLowerCase()}">${ocorrencia.gravidade}</span></p>
            <p><strong>Histórico:</strong> ${ocorrencia.historico}</p>
            ${ocorrencia.complemento ? `<p><strong>Complemento:</strong> ${ocorrencia.complemento}</p>` : ''}
            ${ocorrencia.dataHoraIrradiado ? `<p><strong>Irradiado em:</strong> ${ocorrencia.dataHoraIrradiado}</p>` : ''}
            ${ocorrencia.observacaoRedirecionamento ? `<p><strong>Observação Redirecionamento:</strong> ${ocorrencia.observacaoRedirecionamento}</p>` : ''}
            <p style="margin-top:8px;"><strong>Nº Reiterações:</strong> ${numReiteracoes}</p>
            <p><strong>Tempo até abertura:</strong> ${tempoAberturaText}</p>
            <p><strong>Tempo para leitura da última reiteração:</strong> ${tempoReiteracaoLidaText}</p>
            ${observacoesHTML}
        </div>
        ${veiculosHTML}
        ${pessoasHTML}
    `;

    if (isSOP) {
        if (ocorrencia.dataHoraIrradiado) {
            html += `
                <div class="vtr-assignment-form">
                    <button id="btnIrradiado" class="btn-cadastro" style="width: 100%; margin-bottom: 10px; background-color: #999;" disabled>Irradiado</button>
                    <button id="btnSolicitarApoio" class="btn-secondary" style="width: 100%; margin-bottom: 10px;">Solicitar Apoio</button>
                    <button id="btnManterOcorrencia" class="btn-secondary" style="width: 100%; margin-bottom: 10px;">Manter</button>
                    <button id="btnEncerrarOcorrencia" class="btn-cadastro" style="width: 100%; background-color: #d32f2f;">Encerrar</button>
                </div>
            `;
        } else {
            html += `
                <div class="vtr-assignment-form">
                    <button id="btnIrradiado" class="btn-cadastro" style="width: 100%; margin-bottom: 10px; background-color: #388e3c;">Irradiado</button>
                    <button id="btnSolicitarApoio" class="btn-secondary" style="width: 100%; margin-bottom: 10px;">Solicitar Apoio</button>
                    <button id="btnRedirecionar" class="btn-secondary" style="width: 100%; margin-top: 10px;">Redirecionar</button>
                </div>
            `;
        }
    } else {
        html += `
            <div class="vtr-assignment-form">
                <label for="vtrEmpenharSelect">Empenhar VTR:</label>
                <select id="vtrEmpenharSelect" class="vtr-select">
                    ${vtrOptionsHTML}
                </select>
                <button id="btnConfirmarVTR" class="btn-cadastro">Confirmar</button>
                <button id="btnObservarOcorrencia" class="btn-secondary" style="width: 100%; margin-top: 10px;">👁️ Observar</button>
                <button id="btnAbortarOcorrencia" class="btn-secondary" style="width: 100%; margin-top: 10px; background-color: #ff9800; color: white;">Abortar Ocorrência</button>
                <button id="btnSolicitarApoio" class="btn-secondary" style="width: 100%; margin-top: 10px;">Solicitar Apoio</button>
                <button id="btnRedirecionar" class="btn-secondary" style="width: 100%; margin-top: 10px;">Redirecionar</button>
            </div>
        `;
    }

    modalContent.innerHTML = html;
    modal.style.display = 'block';

    // The global listener in app.js handles the 'X' button and backdrop click,
    // which includes refreshing the dispatcher screen upon closing.

    setupOcorrenciaModalHandlers(key, ocorrencia, modal, isSOP);
}

function setupOcorrenciaModalHandlers(key, ocorrencia, modal, isSOP) {
    const btnObservarOcorrencia = document.getElementById('btnObservarOcorrencia');
    if (btnObservarOcorrencia) {
        btnObservarOcorrencia.addEventListener('click', async () => {
            await showObservarDialog(key, ocorrencia, modal);
        });
    }

    const btnRedirecionar = document.getElementById('btnRedirecionar');
    if (btnRedirecionar) {
        btnRedirecionar.addEventListener('click', async () => {
            const { showRedirecionarDialog } = await import('./occurrence-redirect.js');
            showRedirecionarDialog(key, ocorrencia);
        });
    }

    const btnSolicitarApoio = document.getElementById('btnSolicitarApoio');
    if (btnSolicitarApoio) {
        btnSolicitarApoio.addEventListener('click', async () => {
            await showSolicitarApoioDialog(key, ocorrencia, modal);
        });
    }

    const btnAbortarOcorrencia = document.getElementById('btnAbortarOcorrencia');
    if (btnAbortarOcorrencia) {
        btnAbortarOcorrencia.addEventListener('click', async () => {
            await showAbortarDialog(key, ocorrencia, modal);
        });
    }

    if (isSOP) {
        const btnIrradiado = document.getElementById('btnIrradiado');
        const btnManterOcorrencia = document.getElementById('btnManterOcorrencia');
        const btnEncerrarOcorrencia = document.getElementById('btnEncerrarOcorrencia');

        if (btnIrradiado && !ocorrencia.dataHoraIrradiado) {
            btnIrradiado.addEventListener('click', async () => {
                try {
                    const now = new Date();
                    const dataHoraIrradiado = now.toLocaleString('pt-BR');

                    const atendimentoRef = getRef(`atendimentos/${key}`);
                    await update(atendimentoRef, {
                        dataHoraIrradiado: dataHoraIrradiado
                    });

                    const atendimentosAtualizados = await getData('atendimentos');
                    const ocorrenciaAtualizada = atendimentosAtualizados[key];

                    modal.style.display = 'none';
                    await showOcorrenciaDetails(key, ocorrenciaAtualizada);
                } catch (error) {
                    alert('Erro ao registrar irradiado: ' + error.message);
                }
            });
        }

        if (btnManterOcorrencia) {
            btnManterOcorrencia.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }

        if (btnEncerrarOcorrencia) {
            btnEncerrarOcorrencia.addEventListener('click', async () => {
                try {
                    const atendimentoRef = getRef(`atendimentos/${key}`);
                    await update(atendimentoRef, {
                        encerrado: true,
                        historicoFinal: `IRRADIADO EM ${ocorrencia.dataHoraIrradiado}`,
                        resultado: 'IRRADIADO',
                        dataHoraEncerramento: new Date().toLocaleString('pt-BR')
                    });

                    alert('Ocorrência encerrada como irradiado!');
                    modal.style.display = 'none';

                    const currentUser = getCurrentUser();
                    await loadDispatcherOcorrencias(currentUser.paValue, document.getElementById('dispatcherContent'));
                } catch (error) {
                    alert('Erro ao encerrar ocorrência: ' + error.message);
                }
            });
        }
    } else {
        const btnConfirmarVTR = document.getElementById('btnConfirmarVTR');
        if (btnConfirmarVTR) {
            btnConfirmarVTR.addEventListener('click', async () => {
                const vtrNumber = document.getElementById('vtrEmpenharSelect').value;

                if (!vtrNumber) {
                    alert('Por favor, selecione uma VTR');
                    return;
                }

                // Check if VTR is already assigned
                const vtrAssignments = await getData('vtrAssignments') || {};
                const isVTRBusy = Object.values(vtrAssignments).some(v => v.vtrNumber === vtrNumber);

                if (isVTRBusy) {
                    const confirmAccumulate = confirm(`A VTR ${vtrNumber} já está empenhada em outra ocorrência. Deseja acumular?`);
                    if (!confirmAccumulate) {
                        return;
                    }
                }

                try {
                    await pushData('vtrAssignments', {
                        vtrNumber: vtrNumber,
                        ocorrenciaId: key,
                        timestamp: Date.now()
                    });

                    modal.style.display = 'none';
                    const currentUser = getCurrentUser();
                    await loadDispatcherOcorrencias(currentUser.paValue, document.getElementById('dispatcherContent'));
                } catch (error) {
                    alert('Erro ao empenhar VTR: ' + error.message);
                }
            });
        }
    }
}

async function showAbortarDialog(key, ocorrencia, modal) {
    const modalContent = document.getElementById('ocorrenciaModalContent');

    let html = `
        <h2>Abortar Ocorrência #${ocorrencia.numeroRegistro}</h2>
        <div class="modal-details">
            <p><strong>Endereço:</strong> ${ocorrencia.rua}, ${ocorrencia.numero} - ${ocorrencia.bairro}</p>
            <p><strong>Natureza:</strong> ${ocorrencia.natureza}</p>
        </div>
        <div class="vtr-assignment-form">
            <label for="motivoAbortar">Motivo do Abortamento (obrigatório):</label>
            <textarea id="motivoAbortar" rows="4" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 10px; font-family: inherit; font-size: 14px;" required></textarea>
            <button id="btnConfirmarAbortar" class="btn-cadastro" style="width: 100%; margin-bottom: 10px; background-color: #d32f2f;">Confirmar Abortamento</button>
            <button id="btnCancelarAbortar" class="btn-secondary" style="width: 100%;">Cancelar</button>
        </div>
    `;

    modalContent.innerHTML = html;

    const motivoInput = document.getElementById('motivoAbortar');
    motivoInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });

    document.getElementById('btnConfirmarAbortar').addEventListener('click', async () => {
        const motivo = motivoInput.value.trim();

        if (!motivo) {
            alert('Por favor, descreva o motivo do abortamento');
            return;
        }

        try {
            const atendimentoRef = getRef(`atendimentos/${key}`);
            await update(atendimentoRef, {
                encerrado: true,
                naturezaFinal: 'ABORTADA',
                statusFinal: 'ABORTADA',
                historicoFinal: `ABORTADA - MOTIVO: ${motivo}`,
                resultado: 'ABORTADA',
                dataHoraEncerramento: new Date().toLocaleString('pt-BR')
            });

            alert('Ocorrência abortada com sucesso!');
            modal.style.display = 'none';

            const currentUser = getCurrentUser();
            const btlToLoad = window.selectedBTL || currentUser.paValue;
            await loadDispatcherOcorrencias(btlToLoad, document.getElementById('dispatcherContent'));
        } catch (error) {
            alert('Erro ao abortar ocorrência: ' + error.message);
        }
    });

    document.getElementById('btnCancelarAbortar').addEventListener('click', async () => {
        const atendimentos = await getData('atendimentos');
        await showOcorrenciaDetails(key, atendimentos[key]);
    });
}

async function showObservarDialog(key, ocorrencia, modal) {
    const modalContent = document.getElementById('ocorrenciaModalContent');
    const currentHTML = modalContent.innerHTML;

    let observacoesHTML = '';
    if (ocorrencia.observacoes && ocorrencia.observacoes.length > 0) {
        observacoesHTML = '<div style="margin-bottom: 15px; padding: 10px; background: #f0f0f0; border-radius: 4px;"><h4 style="margin-top: 0;">Observações Anteriores:</h4>';
        ocorrencia.observacoes.forEach(obs => {
            const userInfo = obs.re && obs.usuario ? ` - RE: ${obs.re} | ${obs.usuario}` : '';
            observacoesHTML += `<p style="margin: 5px 0; font-size: 13px;"><strong>[${obs.dataHora}]${userInfo}</strong> ${obs.texto}</p>`;
        });
        observacoesHTML += '</div>';
    }

    let html = `
        <h2>Observar Ocorrência #${ocorrencia.numeroRegistro}</h2>
        ${observacoesHTML}
        <div style="margin: 20px 0;">
            <label style="display: block; margin-bottom: 8px; font-weight: 600;">Digite sua observação (mínimo 10 caracteres):</label>
            <textarea id="observacaoTexto" rows="4" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-family: inherit; font-size: 14px;"></textarea>
            <div style="display: flex; gap: 10px; margin-top: 15px;">
                <button id="btnConfirmarObservacao" class="btn-cadastro" style="flex: 1;">OK</button>
                <button id="btnCancelarObservacao" class="btn-secondary" style="flex: 1;">Cancelar</button>
            </div>
        </div>
    `;

    modalContent.innerHTML = html;

    const observacaoTexto = document.getElementById('observacaoTexto');
    observacaoTexto.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });

    document.getElementById('btnConfirmarObservacao').addEventListener('click', async () => {
        const texto = observacaoTexto.value.trim();

        if (texto.length < 10) {
            alert('A observação deve ter no mínimo 10 caracteres');
            return;
        }

        try {
            const atendimentoRef = getRef(`atendimentos/${key}`);
            const atendimentos = await getData('atendimentos');
            const ocorrenciaAtual = atendimentos[key];

            const observacoes = ocorrenciaAtual.observacoes || [];
            const observingUser = getCurrentUser();
            let usuarioNome = '';
            let usuarioRE = '';
            
            if (observingUser) {
                if (observingUser.tipo === 'MILITAR') {
                    usuarioNome = observingUser.graduacao ? `${observingUser.graduacao} ${observingUser.nomeGuerra}` : observingUser.nomeGuerra;
                    usuarioRE = observingUser.re || '';
                } else {
                    usuarioNome = observingUser.nomeCompleto || '';
                    usuarioRE = observingUser.cpf ? observingUser.cpf.replace(/\D/g, '') : '';
                }
            }

            const agora = new Date();
            const agoraTs = agora.getTime();
            const agoraLocale = agora.toLocaleString('pt-BR');

            observacoes.push({
                dataHora: agoraLocale,
                texto: texto,
                usuario: usuarioNome,
                re: usuarioRE
            });

            // Ensure opened timestamp exists (first-open) so observation includes both timestamps
            const updatesPayload = {
                observacoes: observacoes,
                observada: true
            };
            if (!ocorrencia.abriuTimestamp) {
                updatesPayload.abriuTimestamp = agoraTs;
                updatesPayload.abriuDataHora = agoraLocale;
            }

            await update(atendimentoRef, updatesPayload);

            alert('Observação registrada com sucesso!');
            modal.style.display = 'none';

            const currentUser = getCurrentUser();
            const btlToLoad = window.selectedBTL || currentUser.paValue;
            await loadDispatcherOcorrencias(btlToLoad, document.getElementById('dispatcherContent'));
        } catch (error) {
            alert('Erro ao registrar observação: ' + error.message);
        }
    });

    document.getElementById('btnCancelarObservacao').addEventListener('click', () => {
        modalContent.innerHTML = currentHTML;
        setupOcorrenciaModalHandlers(key, ocorrencia, modal, ocorrencia.gravidade === 'SOP');
    });
}

async function showSolicitarApoioDialog(key, ocorrencia, modal) {
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
        servicosHTML += `
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 8px; background: white; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 8px;">
                <input type="checkbox" name="servicoApoio" value="${servico}" style="cursor: pointer;">
                <span>${servico}</span>
            </label>
        `;
    });

    let html = `
        <h2>Solicitar Apoio - Ocorrência #${ocorrencia.numeroRegistro}</h2>
        <div class="modal-details">
            <p><strong>BTL/Serviço Atual:</strong> ${ocorrencia.btl}</p>
        </div>
        <div class="vtr-assignment-form">
            <label style="display: block; margin-bottom: 10px; font-weight: 600;">Selecione os serviços de apoio:</label>
            <div id="servicosApoioCheckboxes" style="display: flex; flex-direction: column; gap: 5px; margin-bottom: 15px;">
                ${servicosHTML}
            </div>
            <button id="btnConfirmarApoio" class="btn-cadastro" style="width: 100%; margin-bottom: 10px;">Confirmar Apoio</button>
            <button id="btnCancelarApoio" class="btn-secondary" style="width: 100%;">Cancelar</button>
        </div>
    `;

    modalContent.innerHTML = html;

    document.getElementById('btnConfirmarApoio').addEventListener('click', async () => {
        const checkboxes = document.querySelectorAll('input[name="servicoApoio"]:checked');
        const servicosSelecionados = Array.from(checkboxes).map(cb => cb.value);

        if (servicosSelecionados.length === 0) {
            alert('Por favor, selecione ao menos um serviço de apoio');
            return;
        }

        try {
            const atendimentoRef = getRef(`atendimentos/${key}`);
            const apoiosAtuais = ocorrencia.apoiosSolicitados || [];
            
            const novosApoios = servicosSelecionados.map(servico => ({
                servico: servico,
                dataHoraSolicitacao: new Date().toLocaleString('pt-BR'),
                timestamp: Date.now()
            }));

            await update(atendimentoRef, {
                apoiosSolicitados: [...apoiosAtuais, ...novosApoios]
            });

            alert(`Apoio solicitado para: ${servicosSelecionados.join(', ')}`);
            modal.style.display = 'none';

            const currentUser = getCurrentUser();
            const btlToLoad = window.selectedBTL || currentUser.paValue;
            await loadDispatcherOcorrencias(btlToLoad, document.getElementById('dispatcherContent'));
        } catch (error) {
            alert('Erro ao solicitar apoio: ' + error.message);
        }
    });

    document.getElementById('btnCancelarApoio').addEventListener('click', async () => {
        const atendimentos = await getData('atendimentos');
        await showOcorrenciaDetails(key, atendimentos[key]);
    });
}