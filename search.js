import { getData } from './database.js';
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

export function formatDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export async function searchOcorrencias(searchTerm, dataInicio = null, dataFim = null) {
    const ocorrenciasSearchContent = document.getElementById('ocorrenciasSearchContent');
    const btnGerarPDF = document.getElementById('btnGerarPDF');

    try {
        const atendimentos = await getData('atendimentos');

        if (!atendimentos) {
            ocorrenciasSearchContent.innerHTML = '<p>Nenhuma ocorrência encontrada.</p>';
            btnGerarPDF.style.display = 'none';
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
            ocorrenciasSearchContent.innerHTML = '<p>Nenhuma ocorrência encontrada com esses critérios.</p>';
            btnGerarPDF.style.display = 'none';
        } else {
            window.currentSearchResults = matchingOcorrencias;
            btnGerarPDF.style.display = 'block';

            let html = '<div class="ocorrencias-grid">';
            matchingOcorrencias.forEach(([key, ocorrencia]) => {
                let statusBadge = '';
                if (ocorrencia.encerrado) {
                    statusBadge = '<span style="color: #d32f2f; font-weight: 600;">[ENCERRADO]</span>';
                } else if (assignedOcorrencias.has(key)) {
                    const vtrNumber = assignedOcorrencias.get(key);
                    statusBadge = `<span style="color: #1976d2; font-weight: 600;">[EM ATENDIMENTO - VTR ${vtrNumber}]</span>`;
                } else {
                    statusBadge = '<span style="color: #ff9800; font-weight: 600;">[PENDENTE]</span>';
                }

                html += `
                    <div class="ocorrencia-card">
                        <h3>Registro #${ocorrencia.numeroRegistro} ${statusBadge}</h3>
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
                        ${ocorrencia.encerrado ? `<p><strong>Resultado:</strong> ${ocorrencia.resultado || 'N/A'}</p>` : ''}
                    </div>
                `;
            });
            html += '</div>';
            ocorrenciasSearchContent.innerHTML = html;
        }
    } catch (error) {
        ocorrenciasSearchContent.innerHTML = '<p>Erro ao pesquisar ocorrências: ' + error.message + '</p>';
    }
}

export function generatePDF() {
    if (!window.currentSearchResults || window.currentSearchResults.length === 0) {
        alert('Nenhum resultado para gerar PDF');
        return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const lineHeight = 7;
    let yPosition = margin;

    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Relatório de Ocorrências', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += lineHeight + 5;

    const dataInicio = document.getElementById('searchDataInicio').value;
    const dataFim = document.getElementById('searchDataFim').value;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    if (dataInicio || dataFim) {
        const dataInicioFormatted = dataInicio ? new Date(dataInicio).toLocaleString('pt-BR') : 'N/A';
        const dataFimFormatted = dataFim ? new Date(dataFim).toLocaleString('pt-BR') : 'N/A';
        doc.text(`Período: ${dataInicioFormatted} até ${dataFimFormatted}`, margin, yPosition);
        yPosition += lineHeight;
    }

    doc.text(`Total de ocorrências: ${window.currentSearchResults.length}`, margin, yPosition);
    yPosition += lineHeight + 5;

    window.currentSearchResults.forEach(([key, ocorrencia], index) => {
        if (yPosition > pageHeight - 40) {
            doc.addPage();
            yPosition = margin;
        }

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');

        let status = 'PENDENTE';
        if (ocorrencia.encerrado) {
            status = 'ENCERRADO';
        }

        doc.text(`#${ocorrencia.numeroRegistro} - ${status}`, margin, yPosition);
        yPosition += lineHeight;

        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');

        const fields = [
            `Data/Hora: ${ocorrencia.dataHora}`,
            `Nome: ${ocorrencia.nome}`,
            `Telefone: ${ocorrencia.telefone}`,
            `Endereço: ${ocorrencia.rua}, ${ocorrencia.numero} - ${ocorrencia.bairro}`,
            `Município: ${ocorrencia.municipio} - ${ocorrencia.estado}`,
            `CEP: ${ocorrencia.cep}`,
            `BTL: ${ocorrencia.btl}`,
            `Referência: ${ocorrencia.referencia}`,
            `Natureza: ${ocorrencia.natureza}`,
            `Gravidade: ${ocorrencia.gravidade}`,
            `Histórico: ${ocorrencia.historico}`
        ];

        if (ocorrencia.encerrado && ocorrencia.resultado) {
            fields.push(`Resultado: ${ocorrencia.resultado}`);
        }

        fields.forEach(field => {
            const lines = doc.splitTextToSize(field, pageWidth - 2 * margin);
            lines.forEach(line => {
                if (yPosition > pageHeight - 20) {
                    doc.addPage();
                    yPosition = margin;
                }
                doc.text(line, margin, yPosition);
                yPosition += lineHeight;
            });
        });

        yPosition += 3;

        if (index < window.currentSearchResults.length - 1) {
            doc.setDrawColor(200);
            doc.line(margin, yPosition, pageWidth - margin, yPosition);
            yPosition += 5;
        }
    });

    const now = new Date();
    const fileName = `ocorrencias_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}.pdf`;
    doc.save(fileName);
}

export function setupOcorrenciasSearch() {
    const btnPesquisarOcorrencias = document.getElementById('btnPesquisarOcorrencias');
    const btnCloseOcorrenciasSearch = document.getElementById('btnCloseOcorrenciasSearch');
    const btnExecutarPesquisa = document.getElementById('btnExecutarPesquisa');
    const btnLimparPesquisa = document.getElementById('btnLimparPesquisa');
    const btnGerarPDF = document.getElementById('btnGerarPDF');
    const searchInput = document.getElementById('searchOcorrenciasInput');
    const btnToggleSearchForm = document.getElementById('btnToggleSearchForm');
    const searchFormContainer = document.getElementById('searchFormContainer');

    btnToggleSearchForm.addEventListener('click', () => {
        if (searchFormContainer.style.display === 'none') {
            searchFormContainer.style.display = 'block';
            btnToggleSearchForm.textContent = '- Ocultar';
        } else {
            searchFormContainer.style.display = 'none';
            btnToggleSearchForm.textContent = '+ Expandir';
        }
    });

    btnPesquisarOcorrencias.addEventListener('click', () => {
        document.getElementById('ocorrenciasSearchList').style.display = 'block';
        searchFormContainer.style.display = 'block';
        btnToggleSearchForm.textContent = '- Ocultar';
        searchInput.focus();
    });

    btnCloseOcorrenciasSearch.addEventListener('click', () => {
        document.getElementById('ocorrenciasSearchList').style.display = 'none';
        searchInput.value = '';
        document.getElementById('ocorrenciasSearchContent').innerHTML = '';
    });

    btnExecutarPesquisa.addEventListener('click', async () => {
        const searchTerm = searchInput.value.trim().toUpperCase();
        const dataInicio = document.getElementById('searchDataInicio').value;
        const dataFim = document.getElementById('searchDataFim').value;

        await searchOcorrencias(searchTerm, dataInicio, dataFim);
    });

    btnLimparPesquisa.addEventListener('click', () => {
        searchInput.value = '';
        document.getElementById('searchDataInicio').value = '';
        document.getElementById('searchDataFim').value = '';
        document.getElementById('ocorrenciasSearchContent').innerHTML = '';
        btnGerarPDF.style.display = 'none';
    });

    searchInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });

    searchInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const searchTerm = searchInput.value.trim().toUpperCase();
            const dataInicio = document.getElementById('searchDataInicio').value;
            const dataFim = document.getElementById('searchDataFim').value;
            await searchOcorrencias(searchTerm, dataInicio, dataFim);
        }
    });

    const btnFiltroHoje = document.getElementById('btnFiltroHoje');
    const btnFiltroOntem = document.getElementById('btnFiltroOntem');
    const btnFiltroSemana = document.getElementById('btnFiltroSemana');
    const btnFiltroMes = document.getElementById('btnFiltroMes');

    function setActiveFilterButton(activeBtn) {
        [btnFiltroHoje, btnFiltroOntem, btnFiltroSemana, btnFiltroMes].forEach(btn => {
            btn.style.background = '';
            btn.style.color = '';
        });
        activeBtn.style.background = '#1976d2';
        activeBtn.style.color = 'white';
    }

    btnFiltroHoje.addEventListener('click', () => {
        const hoje = new Date();
        const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0);
        const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59);

        document.getElementById('searchDataInicio').value = formatDateTimeLocal(inicioHoje);
        document.getElementById('searchDataFim').value = formatDateTimeLocal(fimHoje);
        setActiveFilterButton(btnFiltroHoje);
    });

    btnFiltroOntem.addEventListener('click', () => {
        const hoje = new Date();
        const ontem = new Date(hoje);
        ontem.setDate(ontem.getDate() - 1);
        const inicioOntem = new Date(ontem.getFullYear(), ontem.getMonth(), ontem.getDate(), 0, 0);
        const fimOntem = new Date(ontem.getFullYear(), ontem.getMonth(), ontem.getDate(), 23, 59);

        document.getElementById('searchDataInicio').value = formatDateTimeLocal(inicioOntem);
        document.getElementById('searchDataFim').value = formatDateTimeLocal(fimOntem);
        setActiveFilterButton(btnFiltroOntem);
    });

    btnFiltroSemana.addEventListener('click', () => {
        const hoje = new Date();
        const semanaAtras = new Date(hoje);
        semanaAtras.setDate(semanaAtras.getDate() - 7);

        document.getElementById('searchDataInicio').value = formatDateTimeLocal(semanaAtras);
        document.getElementById('searchDataFim').value = formatDateTimeLocal(hoje);
        setActiveFilterButton(btnFiltroSemana);
    });

    btnFiltroMes.addEventListener('click', () => {
        const hoje = new Date();
        const mesAtras = new Date(hoje);
        mesAtras.setMonth(mesAtras.getMonth() - 1);

        document.getElementById('searchDataInicio').value = formatDateTimeLocal(mesAtras);
        document.getElementById('searchDataFim').value = formatDateTimeLocal(hoje);
        setActiveFilterButton(btnFiltroMes);
    });

    btnGerarPDF.addEventListener('click', generatePDF);
}