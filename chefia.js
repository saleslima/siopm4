import { getData } from './database.js';
import { showMessage, showScreen } from './utils.js';
import { PASSWORDS, CPA_TO_BTL_MAP } from './constants.js';

export function setupChefiaHandlers(allScreens) {
    const chefiaPasswordScreen = document.getElementById('chefiaPasswordScreen');
    const chefiaScreen = document.getElementById('chefiaScreen');
    const loginScreen = document.getElementById('loginScreen');
    const chefiaPasswordForm = document.getElementById('chefiaPasswordForm');
    const btnBackFromChefiaPassword = document.getElementById('btnBackFromChefiaPassword');
    const btnBackFromChefia = document.getElementById('btnBackFromChefia');
    const chefiaPasswordMessage = document.getElementById('chefiaPasswordMessage');

    btnBackFromChefiaPassword.addEventListener('click', () => {
        showScreen(loginScreen, allScreens);
        document.getElementById('chefiaPassword').value = '';
    });

    btnBackFromChefia.addEventListener('click', () => {
        showScreen(loginScreen, allScreens);
    });

    chefiaPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('chefiaPassword').value;

        if (password === PASSWORDS.CADASTRO) {
            showScreen(chefiaScreen, allScreens);
            await loadChefiaData();
        } else {
            showMessage(chefiaPasswordMessage, 'Senha incorreta!', 'error');
        }
    });

    const btnCloseBTLDetail = document.getElementById('btnCloseBTLDetail');
    if (btnCloseBTLDetail) {
        btnCloseBTLDetail.addEventListener('click', () => {
            document.getElementById('btlDetailContainer').style.display = 'none';
        });
    }
}

async function loadChefiaData() {
    try {
        const atendimentos = await getData('atendimentos');
        const vtrAssignments = await getData('vtrAssignments') || {};

        if (!atendimentos) {
            document.getElementById('totalPendentes').textContent = '0';
            document.getElementById('totalEmAtendimento').textContent = '0';
            document.getElementById('totalUrgentes').textContent = '0';
            document.getElementById('totalHoje').textContent = '0';
            return;
        }

        const assignedOcorrencias = new Set(Object.values(vtrAssignments).map(v => v.ocorrenciaId));
        
        const now = Date.now();
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const todayTimestamp = startOfToday.getTime();

        const allOcorrencias = Object.entries(atendimentos);
        const activeOcorrencias = allOcorrencias.filter(([k, o]) => !o.encerrado);
        const pendentes = activeOcorrencias.filter(([k]) => !assignedOcorrencias.has(k));
        const emAtendimento = activeOcorrencias.filter(([k]) => assignedOcorrencias.has(k));
        const urgentes = activeOcorrencias.filter(([k, o]) => o.gravidade === 'URGENTE');
        const hoje = allOcorrencias.filter(([k, o]) => o.timestamp >= todayTimestamp);

        document.getElementById('totalPendentes').textContent = pendentes.length;
        document.getElementById('totalEmAtendimento').textContent = emAtendimento.length;
        document.getElementById('totalUrgentes').textContent = urgentes.length;
        document.getElementById('totalHoje').textContent = hoje.length;

        // Count by CPA
        const cpaCounts = {};
        activeOcorrencias.forEach(([key, ocorrencia]) => {
            const btl = ocorrencia.btl;
            let foundCPA = null;
            for (const [cpa, btls] of Object.entries(CPA_TO_BTL_MAP)) {
                if (btls.includes(btl)) {
                    foundCPA = cpa;
                    break;
                }
            }
            if (foundCPA) {
                cpaCounts[foundCPA] = (cpaCounts[foundCPA] || 0) + 1;
            }
        });

        // Chart CPA
        const ctxCPA = document.getElementById('chartCPA').getContext('2d');
        if (window.chartCPAInstance) window.chartCPAInstance.destroy();
        window.chartCPAInstance = new Chart(ctxCPA, {
            type: 'bar',
            data: {
                labels: Object.keys(cpaCounts).sort(),
                datasets: [{
                    label: 'Ocorrências Ativas',
                    data: Object.keys(cpaCounts).sort().map(cpa => cpaCounts[cpa] || 0),
                    backgroundColor: '#1976d2',
                    borderColor: '#1565c0',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                onClick: (evt, activeEls) => {
                    if (activeEls.length > 0) {
                        const index = activeEls[0].index;
                        const cpa = Object.keys(cpaCounts).sort()[index];
                        showBTLDetail(cpa, activeOcorrencias);
                    }
                },
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                }
            }
        });

        // Chart Status
        const ctxStatus = document.getElementById('chartStatus').getContext('2d');
        if (window.chartStatusInstance) window.chartStatusInstance.destroy();
        window.chartStatusInstance = new Chart(ctxStatus, {
            type: 'doughnut',
            data: {
                labels: ['Pendentes', 'Em Atendimento', 'Urgentes'],
                datasets: [{
                    data: [pendentes.length, emAtendimento.length, urgentes.length],
                    backgroundColor: ['#1976d2', '#388e3c', '#f57c00'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });

        // Chart Naturezas
        const naturezasCounts = {};
        activeOcorrencias.forEach(([k, o]) => {
            const codigo = o.natureza.split(' - ')[0];
            naturezasCounts[codigo] = (naturezasCounts[codigo] || 0) + 1;
        });
        const topNaturezas = Object.entries(naturezasCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        const ctxNaturezas = document.getElementById('chartNaturezas').getContext('2d');
        if (window.chartNaturezasInstance) window.chartNaturezasInstance.destroy();
        window.chartNaturezasInstance = new Chart(ctxNaturezas, {
            type: 'bar',
            data: {
                labels: topNaturezas.map(([nat]) => nat),
                datasets: [{
                    label: 'Ocorrências',
                    data: topNaturezas.map(([, count]) => count),
                    backgroundColor: '#7b1fa2',
                    borderColor: '#6a1b9a',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                indexAxis: 'y',
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: { beginAtZero: true, ticks: { stepSize: 1 } }
                }
            }
        });

    } catch (error) {
        console.error('Error loading chefia data:', error);
    }
}

function showBTLDetail(cpa, activeOcorrencias) {
    const btls = CPA_TO_BTL_MAP[cpa] || [];
    const btlCounts = {};
    
    activeOcorrencias.forEach(([key, ocorrencia]) => {
        const btl = ocorrencia.btl;
        if (btls.includes(btl)) {
            btlCounts[btl] = (btlCounts[btl] || 0) + 1;
        }
    });

    document.getElementById('selectedCPAName').textContent = cpa;
    document.getElementById('btlDetailContainer').style.display = 'block';

    const ctxBTL = document.getElementById('chartBTLDetail').getContext('2d');
    if (window.chartBTLInstance) window.chartBTLInstance.destroy();
    window.chartBTLInstance = new Chart(ctxBTL, {
        type: 'bar',
        data: {
            labels: btls,
            datasets: [{
                label: 'Ocorrências Ativas',
                data: btls.map(btl => btlCounts[btl] || 0),
                backgroundColor: '#388e3c',
                borderColor: '#2e7d32',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
            }
        }
    });
}