import { getData, removeData, getRef } from './database.js';
import { getCurrentUser } from './auth.js';
import { update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { loadDispatcherOcorrencias } from './dispatcher.js';
import { hideModal, addVeiculoToOcorrencia, addPessoaToOcorrencia, addComplementoToOcorrencia } from './modal-utils.js';

export async function showVTROcorrenciaDetails(key, ocorrencia, vtrNumber) {
    const modal = document.getElementById('ocorrenciaModal');
    const modalContent = document.getElementById('ocorrenciaModalContent');

    let veiculosHTML = '';
    if (ocorrencia.veiculos && ocorrencia.veiculos.length > 0) {
        veiculosHTML = '<div style="margin-top: 15px; padding: 10px; background: #f5f5f5; border-radius: 4px;"><h3 style="margin-top: 0;">Veículos Envolvidos</h3>';
        ocorrencia.veiculos.forEach((veiculo) => {
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
        ocorrencia.pessoas.forEach((pessoa) => {
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

    let complementosHTML = '';
    if (ocorrencia.complementos && ocorrencia.complementos.length > 0) {
        complementosHTML = '<div style="margin-top: 15px; padding: 10px; background: #fff3cd; border-radius: 4px;"><h3 style="margin-top: 0;">Histórico de Complementos</h3>';
        ocorrencia.complementos.forEach((comp) => {
            const userInfo = comp.re && comp.usuario ? ` - RE: ${comp.re} | ${comp.usuario}` : '';
            complementosHTML += `<p style="margin: 5px 0;"><strong>[${comp.dataHora}]${userInfo}</strong> ${comp.texto}</p>`;
        });
        complementosHTML += '</div>';
    }

    let html = `
        <h2>VTR ${vtrNumber} - Ocorrência #${ocorrencia.numeroRegistro}</h2>
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
        </div>
        ${complementosHTML}
        ${veiculosHTML}
        ${pessoasHTML}
        <div class="vtr-assignment-form">
            <label for="complementoInput">Adicionar Complemento:</label>
            <textarea id="complementoInput" rows="3" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 10px; font-family: inherit; font-size: 14px;"></textarea>
            <button id="btnAdicionarComplemento" class="btn-cadastro" style="width: 100%; margin-bottom: 10px;">Adicionar Complemento</button>
            
            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                <button id="btnMostrarVeiculos" class="btn-secondary" style="flex: 1;">Adicionar Veículo</button>
                <button id="btnMostrarPessoas" class="btn-secondary" style="flex: 1;">Adicionar Pessoa</button>
            </div>
            
            <!-- Veículos Section -->
            <div id="veiculosSectionModal" style="display: none; margin-bottom: 15px; padding: 15px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 4px;">
                <h3 style="margin-top: 0;">Dados do Veículo</h3>
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Placa</label>
                    <input type="text" id="placaModal" maxlength="8" placeholder="ABC1234 ou ABC1D23" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Modelo</label>
                    <input type="text" id="modeloModal" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Ano</label>
                    <input type="text" id="anoModal" maxlength="4" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Cor</label>
                    <input type="text" id="corModal" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Tipo</label>
                    <input type="text" id="tipoVeiculoModal" placeholder="Ex: AUTOMÓVEL, MOTOCICLETA" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Estado</label>
                    <input type="text" id="estadoVeiculoModal" maxlength="2" placeholder="Ex: MG, SP" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Situação</label>
                    <select id="situacaoVeiculoModal" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="">Selecione...</option>
                        <option value="FURTO">FURTO</option>
                        <option value="ROUBO">ROUBO</option>
                        <option value="AÇÃO CRIMINOSA">AÇÃO CRIMINOSA</option>
                        <option value="ACIDENTE DE TRÂNSITO">ACIDENTE DE TRÂNSITO</option>
                    </select>
                </div>
                <button id="btnSalvarVeiculoModal" class="btn-cadastro" style="width: 100%;">Salvar Veículo</button>
            </div>
            
            <!-- Pessoas Section -->
            <div id="pessoasSectionModal" style="display: none; margin-bottom: 15px; padding: 15px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 4px;">
                <h3 style="margin-top: 0;">Dados da Pessoa</h3>
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Nome</label>
                    <input type="text" id="nomePessoaModal" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">CPF</label>
                    <input type="text" id="cpfPessoaModal" maxlength="14" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Data de Nascimento</label>
                    <input type="date" id="dataNascimentoModal" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Telefone</label>
                    <input type="text" id="telefonePessoaModal" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Envolvimento</label>
                    <select id="envolvimentoModal" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="">Selecione...</option>
                        <option value="VÍTIMA">VÍTIMA</option>
                        <option value="AUTOR">AUTOR</option>
                        <option value="TESTEMUNHA">TESTEMUNHA</option>
                        <option value="CONDUTOR">CONDUTOR</option>
                    </select>
                </div>
                <button id="btnSalvarPessoaModal" class="btn-cadastro" style="width: 100%;">Salvar Pessoa</button>
            </div>
            
            <button id="btnEncerrarVTR" class="btn-cadastro" style="width: 100%; margin-bottom: 10px; background-color: #d32f2f;">Encerrar Ocorrência</button>
            <button id="btnVoltarPendencia" class="btn-secondary" style="width: 100%; margin-top: 10px;">Voltar para Pendência</button>
        </div>
    `;

    modalContent.innerHTML = html;
    modal.style.display = 'block';

    // The global listener in app.js handles the 'X' button and backdrop click,
    // which includes refreshing the dispatcher screen.
    setupVTRModalHandlers(key, ocorrencia, vtrNumber, modal);
}

function setupVTRModalHandlers(key, ocorrencia, vtrNumber, modal) {
    const complementoInput = document.getElementById('complementoInput');
    complementoInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });

    document.getElementById('btnMostrarVeiculos').addEventListener('click', () => {
        const veiculosSection = document.getElementById('veiculosSectionModal');
        veiculosSection.style.display = veiculosSection.style.display === 'none' ? 'block' : 'none';
        document.getElementById('pessoasSectionModal').style.display = 'none';
    });

    document.getElementById('btnMostrarPessoas').addEventListener('click', () => {
        const pessoasSection = document.getElementById('pessoasSectionModal');
        pessoasSection.style.display = pessoasSection.style.display === 'none' ? 'block' : 'none';
        document.getElementById('veiculosSectionModal').style.display = 'none';
    });

    ['placaModal', 'modeloModal', 'corModal', 'tipoVeiculoModal', 'estadoVeiculoModal'].forEach(id => {
        const input = document.getElementById(id);
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });
    });

    document.getElementById('nomePessoaModal').addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });

    document.getElementById('cpfPessoaModal').addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 11) value = value.substring(0, 11);
        if (value.length <= 11) {
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        }
        e.target.value = value;
    });

    document.getElementById('btnSalvarVeiculoModal').addEventListener('click', async () => {
        const placa = document.getElementById('placaModal').value.trim();
        const situacao = document.getElementById('situacaoVeiculoModal').value;

        if (!placa || !situacao) {
            alert('Por favor, preencha ao menos a placa e a situação');
            return;
        }

        const veiculo = {
            id: Date.now(),
            placa,
            modelo: document.getElementById('modeloModal').value.trim(),
            ano: document.getElementById('anoModal').value.trim(),
            cor: document.getElementById('corModal').value.trim(),
            tipo: document.getElementById('tipoVeiculoModal').value.trim(),
            estado: document.getElementById('estadoVeiculoModal').value.trim(),
            situacao
        };

        try {
            const ocorrenciaAtualizada = await addVeiculoToOcorrencia(key, veiculo);
            alert('Veículo adicionado com sucesso!');
            hideModal(modal);
            await showVTROcorrenciaDetails(key, ocorrenciaAtualizada, vtrNumber);
        } catch (error) {
            alert('Erro ao adicionar veículo: ' + error.message);
        }
    });

    document.getElementById('btnSalvarPessoaModal').addEventListener('click', async () => {
        const nome = document.getElementById('nomePessoaModal').value.trim();
        const envolvimento = document.getElementById('envolvimentoModal').value;

        if (!nome || !envolvimento) {
            alert('Por favor, preencha ao menos o nome e o envolvimento');
            return;
        }

        const pessoa = {
            id: Date.now(),
            nome,
            cpf: document.getElementById('cpfPessoaModal').value.trim(),
            dataNascimento: document.getElementById('dataNascimentoModal').value,
            telefone: document.getElementById('telefonePessoaModal').value.trim(),
            envolvimento
        };

        try {
            const ocorrenciaAtualizada = await addPessoaToOcorrencia(key, pessoa);
            alert('Pessoa adicionada com sucesso!');
            hideModal(modal);
            await showVTROcorrenciaDetails(key, ocorrenciaAtualizada, vtrNumber);
        } catch (error) {
            alert('Erro ao adicionar pessoa: ' + error.message);
        }
    });

    document.getElementById('btnAdicionarComplemento').addEventListener('click', async () => {
        const complementoTexto = complementoInput.value.trim();

        if (!complementoTexto) {
            alert('Por favor, digite um complemento');
            return;
        }

        try {
            const ocorrenciaAtualizada = await addComplementoToOcorrencia(key, complementoTexto);
            alert('Complemento adicionado com sucesso!');
            hideModal(modal);
            await showVTROcorrenciaDetails(key, ocorrenciaAtualizada, vtrNumber);
        } catch (error) {
            alert('Erro ao adicionar complemento: ' + error.message);
        }
    });

    document.getElementById('btnEncerrarVTR').addEventListener('click', async () => {
        if (!confirm('Tem certeza que deseja encerrar esta ocorrência?')) {
            return;
        }

        const modalContent = document.getElementById('ocorrenciaModalContent');
        const currentHTML = modalContent.innerHTML;

        // Load naturezas and status finais from database
        const naturezas = await getData('naturezas') || [];
        const statusFinais = await getData('statusFinais') || [];

        let naturezasOptions = '<option value="">Selecione...</option>';
        if (naturezas.length > 0) {
            naturezas.forEach(nat => {
                naturezasOptions += `<option value="${nat.valor}">${nat.valor}</option>`;
            });
        } else {
            // Fallback
            naturezasOptions += `
                <option value="C04 - DESINTELIGÊNCIA">C04 - DESINTELIGÊNCIA</option>
                <option value="A98 - VIOLÊNCIA DOMÉSTICA">A98 - VIOLÊNCIA DOMÉSTICA</option>
                <option value="B04 - ROUBO">B04 - ROUBO</option>
            `;
        }

        let statusFinaisOptions = '<option value="">Selecione...</option>';
        if (statusFinais.length > 0) {
            statusFinais.forEach(status => {
                statusFinaisOptions += `<option value="${status}">${status}</option>`;
            });
        } else {
            // Fallback
            statusFinaisOptions += `
                <option value="NADA CONSTATADO">NADA CONSTATADO</option>
                <option value="NADA MAIS HAVIA">NADA MAIS HAVIA</option>
                <option value="PARTES ORIENTADAS">PARTES ORIENTADAS</option>
            `;
        }

        modalContent.innerHTML = `
            <h2>Encerrar Ocorrência #${ocorrencia.numeroRegistro}</h2>
            <div style="margin: 20px 0;">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Histórico Final</label>
                    <textarea id="historicoFinalInput" rows="5" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-family: inherit; font-size: 14px;"></textarea>
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Natureza Final</label>
                    <select id="naturezaFinalInput" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                        ${naturezasOptions}
                    </select>
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Status Final</label>
                    <select id="statusFinalInput" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                        ${statusFinaisOptions}
                    </select>
                </div>
                <button id="btnConfirmarEncerramento" class="btn-cadastro" style="width: 100%; margin-bottom: 10px;">Confirmar Encerramento</button>
                <button id="btnCancelarEncerramento" class="btn-secondary" style="width: 100%;">Cancelar</button>
            </div>
        `;

        const historicoFinalInput = document.getElementById('historicoFinalInput');
        historicoFinalInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });

        document.getElementById('btnCancelarEncerramento').addEventListener('click', async () => {
            modalContent.innerHTML = currentHTML;
            const atendimentos = await getData('atendimentos');
            modal.style.display = 'none';
            await showVTROcorrenciaDetails(key, atendimentos[key], vtrNumber);
        });

        document.getElementById('btnConfirmarEncerramento').addEventListener('click', async () => {
            const historicoFinal = document.getElementById('historicoFinalInput').value.trim();
            const naturezaFinal = document.getElementById('naturezaFinalInput').value;
            const statusFinal = document.getElementById('statusFinalInput').value;

            if (!historicoFinal) {
                alert('Por favor, preencha o histórico final');
                return;
            }

            if (!naturezaFinal) {
                alert('Por favor, selecione a natureza final');
                return;
            }

            if (!statusFinal) {
                alert('Por favor, selecione o status final');
                return;
            }

            try {
                const atendimentoRef = getRef(`atendimentos/${key}`);
                await update(atendimentoRef, {
                    encerrado: true,
                    historicoFinal: historicoFinal,
                    naturezaFinal: naturezaFinal,
                    statusFinal: statusFinal,
                    resultado: 'ENCERRADO',
                    dataHoraEncerramento: new Date().toLocaleString('pt-BR')
                });

                const vtrAssignments = await getData('vtrAssignments') || {};
                const assignmentKey = Object.keys(vtrAssignments).find(k => 
                    vtrAssignments[k].ocorrenciaId === key && vtrAssignments[k].vtrNumber === vtrNumber
                );

                if (assignmentKey) {
                    await removeData(`vtrAssignments/${assignmentKey}`);
                }

                alert('Ocorrência encerrada com sucesso!');
                modal.style.display = 'none';

                const currentUser = getCurrentUser();
                const btlToLoad = window.selectedBTL || currentUser.paValue;
                await loadDispatcherOcorrencias(btlToLoad, document.getElementById('dispatcherContent'));
            } catch (error) {
                alert('Erro ao encerrar ocorrência: ' + error.message);
            }
        });
    });

    document.getElementById('btnVoltarPendencia').addEventListener('click', async () => {
        try {
            const vtrAssignments = await getData('vtrAssignments') || {};
            const assignmentKey = Object.keys(vtrAssignments).find(k => 
                vtrAssignments[k].ocorrenciaId === key && vtrAssignments[k].vtrNumber === vtrNumber
            );

            if (assignmentKey) {
                await removeData(`vtrAssignments/${assignmentKey}`);
                modal.style.display = 'none';

                const currentUser = getCurrentUser();
                const btlToLoad = window.selectedBTL || currentUser.paValue;
                await loadDispatcherOcorrencias(btlToLoad, document.getElementById('dispatcherContent'));
            }
        } catch (error) {
            alert('Erro ao voltar para pendência: ' + error.message);
        }
    });
}