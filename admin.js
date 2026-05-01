import { getData, updateData, setData } from './database.js';
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";
import { showMessage, showScreen } from './utils.js';
import { PASSWORDS } from './constants.js';
import { BTL_FILES } from './btl-detector.js';

export function setupAdminHandlers(allScreens) {
    const btnAdmin = document.getElementById('btnAdmin');
    const adminPasswordScreen = document.getElementById('adminPasswordScreen');
    const adminScreen = document.getElementById('adminScreen');
    const loginScreen = document.getElementById('loginScreen');
    const adminPasswordForm = document.getElementById('adminPasswordForm');
    const btnBackFromAdminPassword = document.getElementById('btnBackFromAdminPassword');
    const btnBackFromAdmin = document.getElementById('btnBackFromAdmin');
    const btnGerarRelatorioAdmin = document.getElementById('btnGerarRelatorioAdmin');
    const btnSyncMapas = document.getElementById('btnSyncMapas');
    const syncStatus = document.getElementById('syncStatus');
    const adminPasswordMessage = document.getElementById('adminPasswordMessage');
    const adminMessage = document.getElementById('adminMessage');
    const btnAdicionarNatureza = document.getElementById('btnAdicionarNatureza');
    const btnAdicionarStatusFinal = document.getElementById('btnAdicionarStatusFinal');
    const btnGerarGrafico = document.getElementById('btnGerarGrafico');

    btnAdmin.addEventListener('click', () => {
        showScreen(adminPasswordScreen, allScreens);
        document.getElementById('adminPassword').value = '';
        adminPasswordMessage.style.display = 'none';
    });

    btnBackFromAdminPassword.addEventListener('click', () => {
        showScreen(loginScreen, allScreens);
        document.getElementById('adminPassword').value = '';
    });

    btnBackFromAdmin.addEventListener('click', () => {
        showScreen(loginScreen, allScreens);
    });

    adminPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('adminPassword').value;

        if (password === PASSWORDS.CADASTRO) { // Using same DAQTA password
            showScreen(adminScreen, allScreens);
            // Set default dates (today)
            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0);
            const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59);
            
            document.getElementById('adminDataInicio').value = formatDateTimeForInput(startOfDay);
            document.getElementById('adminDataFim').value = formatDateTimeForInput(endOfDay);
            
            // Set default dates for chart (last 24 hours)
            const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            document.getElementById('chartDataInicio').value = formatDateTimeForInput(last24h);
            document.getElementById('chartDataFim').value = formatDateTimeForInput(now);
            
            // Load naturezas and status finais
            await loadNaturezas();
            await loadStatusFinais();
            
            // Load pause time limits and thresholds
            const pauseLimits = await getData('pauseTimeLimits');
            if (pauseLimits) {
                document.getElementById('tempoBanheiro').value = pauseLimits.banheiro || 10;
                document.getElementById('tempoAlimentacao').value = pauseLimits.alimentacao || 30;
                document.getElementById('tempoJanta').value = pauseLimits.janta || 60;
            }
            
            const pauseThresholds = await getData('pauseThresholds');
            if (pauseThresholds) {
                document.getElementById('yellowThreshold').value = pauseThresholds.yellowPercent || 20;
                document.getElementById('redThreshold').value = pauseThresholds.redPercent || 50;
            }
            
            // Generate initial chart
            await generateChart();
        } else {
            showMessage(adminPasswordMessage, 'Senha incorreta!', 'error');
        }
    });

    btnGerarRelatorioAdmin.addEventListener('click', async () => {
        const dataInicio = document.getElementById('adminDataInicio').value;
        const dataFim = document.getElementById('adminDataFim').value;
        const statusFilter = document.getElementById('adminStatusFilter').value;

        if (!dataInicio || !dataFim) {
            showMessage(adminMessage, 'Por favor, selecione as datas inicial e final.', 'error');
            return;
        }

        const startTimestamp = new Date(dataInicio).getTime();
        const endTimestamp = new Date(dataFim).getTime();

        if (startTimestamp > endTimestamp) {
            showMessage(adminMessage, 'A data inicial não pode ser maior que a data final.', 'error');
            return;
        }

        btnGerarRelatorioAdmin.textContent = 'Gerando...';
        btnGerarRelatorioAdmin.disabled = true;

        try {
            await generateAdminPDF(startTimestamp, endTimestamp, statusFilter);
            showMessage(adminMessage, 'Relatório gerado com sucesso!', 'success');
        } catch (error) {
            console.error(error);
            showMessage(adminMessage, 'Erro ao gerar relatório: ' + error.message, 'error');
        } finally {
            btnGerarRelatorioAdmin.textContent = '📄 Gerar PDF';
            btnGerarRelatorioAdmin.disabled = false;
        }
    });

    if (btnSyncMapas) {
        btnSyncMapas.addEventListener('click', async () => {
            if (!confirm('Isso irá ler todos os arquivos GeoJSON locais e enviá-los para o Firebase. Isso pode levar alguns minutos. Deseja continuar?')) {
                return;
            }
            
            btnSyncMapas.disabled = true;
            syncStatus.textContent = 'Iniciando sincronização...';
            syncStatus.style.color = '#1976d2';
            
            try {
                let count = 0;
                const total = Object.keys(BTL_FILES).length;
                
                for (const [btl, filename] of Object.entries(BTL_FILES)) {
                    syncStatus.textContent = `Processando ${btl} (${count + 1}/${total})...`;
                    
                    try {
                        const response = await fetch(`/${filename}`);
                        if (!response.ok) throw new Error(`Falha ao carregar ${filename}`);
                        
                        const geojson = await response.json();
                        // Sanitize key for Firebase (replace / with _)
                        const safeKey = btl.replace(/\//g, '_').replace(/[.#$\[\]]/g, '');
                        
                        await updateData(`mapas/${safeKey}`, {
                            id: btl,
                            geojson: geojson
                        });
                        
                        count++;
                    } catch (err) {
                        console.error(`Erro ao sincronizar ${btl}:`, err);
                        syncStatus.textContent = `Erro em ${btl}: ${err.message}`;
                    }
                }
                
                syncStatus.textContent = `Sincronização concluída! ${count} mapas atualizados no Firebase.`;
                syncStatus.style.color = 'green';
                showMessage(adminMessage, 'Mapas sincronizados com sucesso!', 'success');
            } catch (error) {
                console.error(error);
                syncStatus.textContent = 'Erro geral na sincronização: ' + error.message;
                syncStatus.style.color = 'red';
                showMessage(adminMessage, 'Erro na sincronização.', 'error');
            } finally {
                btnSyncMapas.disabled = false;
            }
        });
    }

    if (btnAdicionarNatureza) {
        btnAdicionarNatureza.addEventListener('click', async () => {
            const codigo = document.getElementById('novaNaturezaCodigo').value.trim().toUpperCase();
            const descricao = document.getElementById('novaNaturezaDescricao').value.trim().toUpperCase();
            const servicosCheckboxes = document.querySelectorAll('input[name="servicoNatureza"]:checked');
            const servicos = Array.from(servicosCheckboxes).map(cb => cb.value);

            if (!codigo || !descricao) {
                showMessage(adminMessage, 'Preencha código e descrição da natureza.', 'error');
                return;
            }

            if (servicos.length === 0) {
                showMessage(adminMessage, 'Selecione ao menos um tipo de policiamento.', 'error');
                return;
            }

            try {
                const naturezas = await getData('naturezas') || [];
                naturezas.push({ codigo, descricao, valor: `${codigo} - ${descricao}`, servicos });
                await setData('naturezas', naturezas);

                document.getElementById('novaNaturezaCodigo').value = '';
                document.getElementById('novaNaturezaDescricao').value = '';
                document.querySelectorAll('input[name="servicoNatureza"]').forEach(cb => cb.checked = false);
                
                await loadNaturezas();
                showMessage(adminMessage, 'Natureza adicionada!', 'success');
            } catch (error) {
                showMessage(adminMessage, 'Erro ao adicionar natureza.', 'error');
            }
        });
    }

    if (btnAdicionarStatusFinal) {
        btnAdicionarStatusFinal.addEventListener('click', async () => {
            const status = document.getElementById('novoStatusFinal').value.trim().toUpperCase();

            if (!status) {
                showMessage(adminMessage, 'Digite o status final.', 'error');
                return;
            }

            try {
                const statusFinais = await getData('statusFinais') || [];
                if (!statusFinais.includes(status)) {
                    statusFinais.push(status);
                    await setData('statusFinais', statusFinais);
                    
                    document.getElementById('novoStatusFinal').value = '';
                    await loadStatusFinais();
                    showMessage(adminMessage, 'Status final adicionado!', 'success');
                } else {
                    showMessage(adminMessage, 'Status já existe.', 'error');
                }
            } catch (error) {
                showMessage(adminMessage, 'Erro ao adicionar status.', 'error');
            }
        });
    }

    if (btnGerarGrafico) {
        btnGerarGrafico.addEventListener('click', async () => {
            await generateChart();
        });
    }

    const btnSalvarTemposPausa = document.getElementById('btnSalvarTemposPausa');
    if (btnSalvarTemposPausa) {
        btnSalvarTemposPausa.addEventListener('click', async () => {
            const tempoBanheiro = parseInt(document.getElementById('tempoBanheiro').value);
            const tempoAlimentacao = parseInt(document.getElementById('tempoAlimentacao').value);
            const tempoJanta = parseInt(document.getElementById('tempoJanta').value);
            const yellowThreshold = parseInt(document.getElementById('yellowThreshold').value);
            const redThreshold = parseInt(document.getElementById('redThreshold').value);

            if (tempoBanheiro < 1 || tempoAlimentacao < 1 || tempoJanta < 1) {
                showMessage(adminMessage, 'Tempos devem ser maiores que zero.', 'error');
                return;
            }

            if (yellowThreshold < 0 || redThreshold < 0) {
                showMessage(adminMessage, 'Porcentagens devem ser maiores ou iguais a zero.', 'error');
                return;
            }

            try {
                await setData('pauseTimeLimits', {
                    banheiro: tempoBanheiro,
                    alimentacao: tempoAlimentacao,
                    janta: tempoJanta
                });
                await setData('pauseThresholds', {
                    yellowPercent: yellowThreshold,
                    redPercent: redThreshold
                });
                showMessage(adminMessage, 'Configurações de pausa salvos com sucesso!', 'success');
            } catch (error) {
                showMessage(adminMessage, 'Erro ao salvar configurações.', 'error');
            }
        });
    }
}

async function loadNaturezas() {
    const listaNaturezas = document.getElementById('listaNaturezas');
    try {
        const naturezas = await getData('naturezas') || [];
        
        if (naturezas.length === 0) {
            listaNaturezas.innerHTML = '<p style="color: #999; font-size: 12px;">Nenhuma natureza cadastrada.</p>';
            return;
        }

        let html = '<div style="display: flex; flex-direction: column; gap: 5px;">';
        naturezas.forEach((nat, index) => {
            const servicosText = nat.servicos && nat.servicos.length > 0 ? nat.servicos.join(', ') : 'Nenhum serviço';
            html += `
                <div style="display: flex; flex-direction: column; padding: 8px; background: #f9f9f9; border-radius: 4px; gap: 4px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 13px; font-weight: 600;">${nat.valor}</span>
                        <button onclick="window.removerNatureza(${index})" style="padding: 4px 8px; background: #d32f2f; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;">Remover</button>
                    </div>
                    <span style="font-size: 11px; color: #666;">Tipos: ${servicosText}</span>
                </div>
            `;
        });
        html += '</div>';
        listaNaturezas.innerHTML = html;
    } catch (error) {
        listaNaturezas.innerHTML = '<p style="color: #d32f2f; font-size: 12px;">Erro ao carregar naturezas.</p>';
    }
}

async function loadStatusFinais() {
    const listaStatusFinais = document.getElementById('listaStatusFinais');
    try {
        const statusFinais = await getData('statusFinais') || [];
        
        if (statusFinais.length === 0) {
            listaStatusFinais.innerHTML = '<p style="color: #999; font-size: 12px;">Nenhum status cadastrado.</p>';
            return;
        }

        let html = '<div style="display: flex; flex-direction: column; gap: 5px;">';
        statusFinais.forEach((status, index) => {
            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #f9f9f9; border-radius: 4px;">
                    <span style="font-size: 13px;">${status}</span>
                    <button onclick="window.removerStatusFinal(${index})" style="padding: 4px 8px; background: #d32f2f; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;">Remover</button>
                </div>
            `;
        });
        html += '</div>';
        listaStatusFinais.innerHTML = html;
    } catch (error) {
        listaStatusFinais.innerHTML = '<p style="color: #d32f2f; font-size: 12px;">Erro ao carregar status.</p>';
    }
}

window.removerNatureza = async function(index) {
    if (!confirm('Remover esta natureza?')) return;
    
    try {
        const naturezas = await getData('naturezas') || [];
        naturezas.splice(index, 1);
        await setData('naturezas', naturezas);
        await loadNaturezas();
    } catch (error) {
        alert('Erro ao remover natureza.');
    }
};

window.removerStatusFinal = async function(index) {
    if (!confirm('Remover este status?')) return;
    
    try {
        const statusFinais = await getData('statusFinais') || [];
        statusFinais.splice(index, 1);
        await setData('statusFinais', statusFinais);
        await loadStatusFinais();
    } catch (error) {
        alert('Erro ao remover status.');
    }
};

function formatDateTimeForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

async function generateAdminPDF(startTimestamp, endTimestamp, statusFilter) {
    const atendimentos = await getData('atendimentos');
    
    if (!atendimentos) {
        throw new Error('Nenhuma ocorrência encontrada no banco de dados.');
    }

    // Filter occurrences
    const filteredOcorrencias = Object.values(atendimentos).filter(ocorrencia => {
        // Date check
        if (ocorrencia.timestamp < startTimestamp || ocorrencia.timestamp > endTimestamp) {
            return false;
        }

        // Status check
        if (statusFilter === 'ENCERRADAS' && !ocorrencia.encerrado) return false;
        if (statusFilter === 'PENDENTES' && ocorrencia.encerrado) return false;

        return true;
    }).sort((a, b) => b.timestamp - a.timestamp); // Newest first

    if (filteredOcorrencias.length === 0) {
        throw new Error('Nenhuma ocorrência encontrada com os filtros selecionados.');
    }

    // Generate PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const lineHeight = 6;
    let yPosition = margin;

    // Header
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('Relatório Administrativo de Ocorrências', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Período: ${new Date(startTimestamp).toLocaleString('pt-BR')} a ${new Date(endTimestamp).toLocaleString('pt-BR')}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Filtro: ${statusFilter}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Total encontrado: ${filteredOcorrencias.length}`, margin, yPosition);
    yPosition += 10;

    // Line separator
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // Content
    filteredOcorrencias.forEach((ocorrencia, index) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 60) {
            doc.addPage();
            yPosition = margin;
        }

        // Status Label (include naturezaFinal and statusFinal if present)
        let statusText = 'PENDENTE/EM ANDAMENTO';
        if (ocorrencia.encerrado) {
            statusText = 'ENCERRADO';
            if (ocorrencia.resultado) statusText += ` - ${ocorrencia.resultado}`;
        }

        const naturezaFinalText = ocorrencia.naturezaFinal ? `Natureza Final: ${ocorrencia.naturezaFinal}` : '';
        const statusFinalText = ocorrencia.statusFinal ? `Status Final: ${ocorrencia.statusFinal}` : '';

        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(`#${ocorrencia.numeroRegistro} - ${statusText}`, margin, yPosition);
        yPosition += lineHeight;

        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        
        const details = [
            `Data/Hora: ${ocorrencia.dataHora}`,
            `Natureza Inicial: ${ocorrencia.natureza} (${ocorrencia.gravidade})`,
            naturezaFinalText,
            statusFinalText,
            `Local: ${ocorrencia.rua}, ${ocorrencia.numero} - ${ocorrencia.bairro}, ${ocorrencia.municipio}`,
            `BTL: ${ocorrencia.btl}`,
            `Solicitante: ${ocorrencia.nome} (${ocorrencia.telefone})`,
            `Histórico: ${ocorrencia.historico || 'N/A'}`
        ];

        if (ocorrencia.historicoFinal) {
            details.push(`Histórico Final: ${ocorrencia.historicoFinal}`);
        }

        // Include observações if any
        if (ocorrencia.observacoes && Array.isArray(ocorrencia.observacoes) && ocorrencia.observacoes.length > 0) {
            details.push('Observações:');
            ocorrencia.observacoes.forEach((obs, obsIndex) => {
                const userInfo = obs.re && obs.usuario ? ` (RE: ${obs.re} - ${obs.usuario})` : '';
                details.push(`  ${obsIndex + 1}. [${obs.dataHora}]${userInfo} ${obs.texto}`);
            });
        }

        details.forEach(detail => {
            const lines = doc.splitTextToSize(detail, pageWidth - (margin * 2));
            
            // Page break check
            if (yPosition + (lines.length * 4) > pageHeight - margin) {
                doc.addPage();
                yPosition = margin;
            }

            doc.text(lines, margin, yPosition);
            yPosition += (lines.length * 4) + 2;
        });

        yPosition += 4;
        
        // Separator between items
        if (index < filteredOcorrencias.length - 1) {
            if (yPosition > pageHeight - 40) {
                doc.addPage();
                yPosition = margin;
            }
            doc.setDrawColor(200);
            doc.setLineWidth(0.1);
            doc.line(margin, yPosition, pageWidth - margin, yPosition);
            yPosition += 8;
        }
    });

    const now = new Date();
    const fileName = `Relatorio_Admin_${now.getTime()}.pdf`;
    doc.save(fileName);
}

async function generateChart() {
    const chartDataInicio = document.getElementById('chartDataInicio').value;
    const chartDataFim = document.getElementById('chartDataFim').value;

    if (!chartDataInicio || !chartDataFim) {
        alert('Por favor, selecione as datas para o gráfico.');
        return;
    }

    const startTimestamp = new Date(chartDataInicio).getTime();
    const endTimestamp = new Date(chartDataFim).getTime();

    const atendimentos = await getData('atendimentos');
    
    if (!atendimentos) {
        document.getElementById('chartContainer').innerHTML = '<p style="text-align: center; color: #999;">Nenhuma ocorrência encontrada.</p>';
        return;
    }

    // Filter closed occurrences with naturezaFinal in period
    const ocorrenciasEncerradas = Object.values(atendimentos).filter(ocorrencia => {
        return ocorrencia.encerrado && 
               ocorrencia.naturezaFinal && 
               ocorrencia.timestamp >= startTimestamp && 
               ocorrencia.timestamp <= endTimestamp;
    });

    if (ocorrenciasEncerradas.length === 0) {
        document.getElementById('chartContainer').innerHTML = '<p style="text-align: center; color: #999;">Nenhuma ocorrência encerrada encontrada no período selecionado.</p>';
        return;
    }

    // Count by naturezaFinal and BTL
    const dataByNaturezaBTL = {};

    ocorrenciasEncerradas.forEach(ocorrencia => {
        const natureza = ocorrencia.naturezaFinal;
        const btl = ocorrencia.btl;

        if (!dataByNaturezaBTL[natureza]) {
            dataByNaturezaBTL[natureza] = {};
        }

        if (!dataByNaturezaBTL[natureza][btl]) {
            dataByNaturezaBTL[natureza][btl] = 0;
        }

        dataByNaturezaBTL[natureza][btl]++;
    });

    // Prepare data for chart
    const naturezas = Object.keys(dataByNaturezaBTL).sort();
    const btls = [...new Set(ocorrenciasEncerradas.map(o => o.btl))].sort();

    const datasets = btls.map((btl, index) => {
        const colors = [
            '#1976d2', '#d32f2f', '#388e3c', '#f57c00', '#7b1fa2',
            '#0097a7', '#c2185b', '#5d4037', '#455a64', '#fbc02d'
        ];
        const color = colors[index % colors.length];

        return {
            label: btl,
            data: naturezas.map(natureza => dataByNaturezaBTL[natureza][btl] || 0),
            backgroundColor: color,
            borderColor: color,
            borderWidth: 1
        };
    });

    // Clear and render chart
    const chartContainer = document.getElementById('chartContainer');
    chartContainer.innerHTML = '<canvas id="chartCanvas"></canvas>';

    const ctx = document.getElementById('chartCanvas').getContext('2d');
    
    // Destroy previous chart if exists
    if (window.adminChart) {
        window.adminChart.destroy();
    }

    window.adminChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: naturezas,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        boxWidth: 15,
                        font: {
                            size: 11
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Ocorrências Encerradas por Natureza Final e BTL',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                }
            }
        }
    });
}