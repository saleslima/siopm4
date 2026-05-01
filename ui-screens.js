import { setCurrentUser, getCurrentUser } from './auth.js';
import { showScreen } from './utils.js';
import { loadDispatcherOcorrencias } from './dispatcher.js';

export async function showUserDashboard(userData, allScreens) {
    const userInfo = document.getElementById('userInfo');
    
    setCurrentUser(userData);

    // Setup pause system for attendants
    if (userData.funcao === 'ATENDENTE' || userData.funcao === 'ATENDENTE COBOM') {
        const { setupPauseSystem } = await import('./attendance.js');
        setTimeout(() => setupPauseSystem(), 500);
    }
    
    let infoHTML = '';
    
    if (userData.tipo === 'CIVIL') {
        infoHTML = `<p style="margin: 5px 0;"><strong>Nome:</strong> ${userData.nomeCompleto} | <strong>CPF:</strong> ${userData.cpf} | <strong>Função:</strong> ${userData.funcao}</p>`;
    } else {
        infoHTML = `<p style="margin: 5px 0;"><strong>${userData.graduacao} ${userData.nomeGuerra}</strong> | <strong>RE:</strong> ${userData.re} | <strong>Função:</strong> ${userData.funcao}</p>`;
    }
    
    userInfo.innerHTML = infoHTML;
    
    if (userData.funcao === 'ATENDENTE' || userData.funcao === 'ATENDENTE COBOM') {
        showScreen(document.getElementById('attendanceScreen'), allScreens);
    } else if (userData.funcao === 'DESPACHADOR' || userData.funcao === 'DESPACHADOR COBOM') {
        showDispatcherScreen(userData, allScreens);
    } else if (userData.funcao === 'SUPERVISOR') {
        showSupervisorScreen(userData, allScreens);
    } else if (userData.funcao === 'SUPERVISOR COBOM') {
        showSupervisorCobomScreen(userData, allScreens);
    } else {
        showScreen(document.getElementById('userDashboard'), allScreens);
    }

    // When in atendente mode, change the attendance form submit button label to "Gerar Ocorrência"
    try {
        const attendanceSaveBtn = document.querySelector('#attendanceForm .btn-cadastro[type="submit"]');
        if (attendanceSaveBtn) {
            attendanceSaveBtn.textContent = 'Gerar Ocorrência';
        }
    } catch (e) {
        // ignore if element missing
    }
    
    document.getElementById('userLoginForm').reset();
    document.getElementById('userLoginMessage').style.display = 'none';
}

export async function showSupervisorCobomScreen(userData, allScreens) {
    const dispatcherInfo = document.getElementById('dispatcherInfo');
    
    let infoHTML = '';
    
    if (userData.tipo === 'CIVIL') {
        infoHTML = `<p style="margin: 5px 0;"><strong>Nome:</strong> ${userData.nomeCompleto} | <strong>Tipo:</strong> SUPERVISOR COBOM ${userData.paValue}</p>`;
    } else {
        infoHTML = `<p style="margin: 5px 0;"><strong>${userData.graduacao} ${userData.nomeGuerra}</strong> | <strong>RE:</strong> ${userData.re} | <strong>Tipo:</strong> SUPERVISOR COBOM ${userData.paValue}</p>`;
    }
    
    dispatcherInfo.innerHTML = infoHTML;
    
    const supervisorCobomToGbMap = {
        'A': ['1ºGB', '2ºGB', '4ºGB', '18ºGB'],
        'B': ['3ºGB', '8ºGB', '5º/17º']
    };
    
    const gbsForSupervisor = supervisorCobomToGbMap[userData.paValue] || [];
    
    const dispatcherHeader = document.querySelector('.dispatcher-header');
    
    dispatcherHeader.innerHTML = `
        <img src="LOGO.PNG" alt="COPOM Logo" class="copom-logo">
        <h1>Despachador - Ocorrências por BTL</h1>
        <div id="dispatcherInfo">${infoHTML}</div>
        <div class="vtr-cadastro-inline">
            <input type="text" id="vtrCadastroInput" placeholder="Digite a VTR">
            <button id="btnCadastrarVTR" class="btn-cadastro">Cadastrar VTR</button>
        </div>
        <div id="btlSelector" style="margin-top: 15px; padding: 15px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 4px;">
            <h3 style="margin-top: 0; margin-bottom: 10px; font-size: 16px;">Selecione o GB</h3>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                ${gbsForSupervisor.map(gb => `
                    <button class="btn-btl-selector" data-btl="${gb}" style="flex: 1; min-width: 150px; padding: 12px 20px; font-size: 14px; font-weight: 600; background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); color: white; border: none; border-radius: 8px; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        ${gb}
                    </button>
                `).join('')}
            </div>
        </div>
        <div id="selectedBtlDisplay" style="margin-top: 10px; font-size: 14px; font-weight: 600; color: #2c3e50; display: none;">
            Visualizando: <span id="selectedBtlName"></span>
        </div>
    `;
    
    window.selectedBTL = null;
    
    const updateButtonStyles = (selectedBtn) => {
        document.querySelectorAll('.btn-btl-selector').forEach(b => {
            b.style.background = 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)';
            b.style.transform = 'translateY(0)';
            b.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        });
        if (selectedBtn) {
            selectedBtn.style.background = 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)';
            selectedBtn.style.transform = 'translateY(-2px)';
            selectedBtn.style.boxShadow = '0 4px 12px rgba(25, 118, 210, 0.4)';
        }
    };
    
    document.querySelectorAll('.btn-btl-selector').forEach(btn => {
        btn.addEventListener('click', async () => {
            const btl = btn.getAttribute('data-btl');
            
            window.selectedBTL = btl;
            localStorage.setItem('selectedBTL', btl);
            
            document.getElementById('selectedBtlName').textContent = btl;
            document.getElementById('selectedBtlDisplay').style.display = 'block';
            
            updateButtonStyles(btn);
            
            await loadDispatcherOcorrencias(btl, document.getElementById('dispatcherContent'));
        });
        
        btn.addEventListener('mouseenter', function() {
            const currentBg = this.style.background;
            if (!currentBg.includes('1976d2')) {
                this.style.background = 'linear-gradient(135deg, #34495e 0%, #2c3e50 100%)';
                this.style.transform = 'translateY(-2px)';
                this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
            }
        });
        
        btn.addEventListener('mouseleave', function() {
            const currentBg = this.style.background;
            if (!currentBg.includes('1976d2')) {
                this.style.background = 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)';
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            }
        });
    });
    
    document.querySelector('.vtr-cadastro-inline').style.display = 'none';
    
    // Check for saved GB selection
    const savedGB = localStorage.getItem('selectedBTL');
    if (savedGB && gbsForSupervisor.includes(savedGB)) {
        window.selectedBTL = savedGB;
        document.getElementById('selectedBtlName').textContent = savedGB;
        document.getElementById('selectedBtlDisplay').style.display = 'block';
        
        // Highlight the saved button using the same updateButtonStyles function
        const savedBtn = document.querySelector(`[data-btl="${savedGB}"]`);
        updateButtonStyles(savedBtn);
        
        await loadDispatcherOcorrencias(savedGB, document.getElementById('dispatcherContent'));
    } else {
        document.getElementById('dispatcherContent').innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">Selecione um GB para visualizar as ocorrências</p>';
    }
    
    showScreen(document.getElementById('dispatcherScreen'), allScreens);
}

export async function showSupervisorScreen(userData, allScreens) {
    const dispatcherInfo = document.getElementById('dispatcherInfo');
    
    let infoHTML = '';
    
    if (userData.tipo === 'CIVIL') {
        infoHTML = `<p style="margin: 5px 0;"><strong>Nome:</strong> ${userData.nomeCompleto} | <strong>CPA:</strong> ${userData.paValue}</p>`;
    } else {
        infoHTML = `<p style="margin: 5px 0;"><strong>${userData.graduacao} ${userData.nomeGuerra}</strong> | <strong>RE:</strong> ${userData.re} | <strong>CPA:</strong> ${userData.paValue}</p>`;
    }
    
    dispatcherInfo.innerHTML = infoHTML;
    
    if (userData.servico === 'ESPECIALIDADES') {
        const especialidadesBtls = ['1ºBPTRAN', '2ºBPTRAN', 'CHOQUE'];
        
        const dispatcherHeader = document.querySelector('.dispatcher-header');
        dispatcherHeader.innerHTML = `
            <img src="LOGO.PNG" alt="COPOM Logo" class="copom-logo">
            <h1>Despachador - Ocorrências por BTL</h1>
            <div id="dispatcherInfo">${infoHTML}</div>
            <div class="vtr-cadastro-inline">
                <input type="text" id="vtrCadastroInput" placeholder="Digite a VTR">
                <button id="btnCadastrarVTR" class="btn-cadastro">Cadastrar VTR</button>
            </div>
            <div id="btlSelector" style="margin-top: 15px; padding: 15px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 4px;">
                <h3 style="margin-top: 0; margin-bottom: 10px; font-size: 16px;">Selecione a Unidade</h3>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    ${especialidadesBtls.map(btl => `
                        <button class="btn-btl-selector" data-btl="${btl}" style="flex: 1; min-width: 150px; padding: 12px 20px; font-size: 14px; font-weight: 600; background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); color: white; border: none; border-radius: 8px; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                            ${btl}
                        </button>
                    `).join('')}
                </div>
            </div>
            <div id="selectedBtlDisplay" style="margin-top: 10px; font-size: 14px; font-weight: 600; color: #2c3e50; display: none;">
                Visualizando: <span id="selectedBtlName"></span>
            </div>
        `;
        
        window.selectedBTL = null;
        
        const updateButtonStylesEsp = (selectedBtn) => {
            document.querySelectorAll('.btn-btl-selector').forEach(b => {
                b.style.background = 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)';
                b.style.transform = 'translateY(0)';
                b.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            });
            if (selectedBtn) {
                selectedBtn.style.background = 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)';
                selectedBtn.style.transform = 'translateY(-2px)';
                selectedBtn.style.boxShadow = '0 4px 12px rgba(25, 118, 210, 0.4)';
            }
        };

        document.querySelectorAll('.btn-btl-selector').forEach(btn => {
            btn.addEventListener('click', async () => {
                const btl = btn.getAttribute('data-btl');
                
                window.selectedBTL = btl;
                localStorage.setItem('selectedBTL', btl);
                
                document.getElementById('selectedBtlName').textContent = btl;
                document.getElementById('selectedBtlDisplay').style.display = 'block';
                
                updateButtonStylesEsp(btn);
                
                // Clear Dispatcher search state when switching GB
                const searchFormContainer = document.getElementById('dispatcherSearchFormContainer');
                const btnToggleDispatcherSearch = document.getElementById('btnToggleDispatcherSearch');
                const ocorrenciasSearchContentDispatcher = document.getElementById('ocorrenciasSearchContentDispatcher');

                if (searchFormContainer) searchFormContainer.style.display = 'none';
                if (btnToggleDispatcherSearch) btnToggleDispatcherSearch.textContent = '+ Expandir';
                if (ocorrenciasSearchContentDispatcher) ocorrenciasSearchContentDispatcher.innerHTML = '';
                
                await loadDispatcherOcorrencias(btl, document.getElementById('dispatcherContent'));
            });
            
            btn.addEventListener('mouseenter', function() {
                const currentBg = this.style.background;
                if (!currentBg.includes('1976d2')) {
                    this.style.background = 'linear-gradient(135deg, #34495e 0%, #2c3e50 100%)';
                    this.style.transform = 'translateY(-2px)';
                    this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                }
            });
            
            btn.addEventListener('mouseleave', function() {
                const currentBg = this.style.background;
                if (!currentBg.includes('1976d2')) {
                    this.style.background = 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)';
                    this.style.transform = 'translateY(0)';
                    this.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                }
            });
        });
        
        document.querySelector('.vtr-cadastro-inline').style.display = 'none';
        
        // Check for saved unit selection
        const savedUnit = localStorage.getItem('selectedBTL');
        if (savedUnit && especialidadesBtls.includes(savedUnit)) {
            window.selectedBTL = savedUnit;
            document.getElementById('selectedBtlName').textContent = savedUnit;
            document.getElementById('selectedBtlDisplay').style.display = 'block';
            
            // Highlight the saved button using the same updateButtonStylesEsp function
            const savedBtn = document.querySelector(`[data-btl="${savedUnit}"]`);
            updateButtonStylesEsp(savedBtn);
            
            await loadDispatcherOcorrencias(savedUnit, document.getElementById('dispatcherContent'));
        } else {
            document.getElementById('dispatcherContent').innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">Selecione uma unidade para visualizar as ocorrências</p>';
        }
        
        showScreen(document.getElementById('dispatcherScreen'), allScreens);
        return;
    }
    
    const cpaToBtlMap = {
        'M01': ['07º BPM/M', '11º BPM/M', '13º BPM/M'],
        'M02': ['03º BPM/M', '12º BPM/M', '46º BPM/M'],
        'M03': ['05º BPM/M', '09º BPM/M', '18º BPM/M', '43º BPM/M'],
        'M04': ['02º BPM/M', '29º BPM/M', '39º BPM/M', '48º BPM/M'],
        'M05': ['04º BPM/M', '23º BPM/M', '16º BPM/M', '49º BPM/M'],
        'M06': ['06º BPM/M', '10º BPM/M', '24º BPM/M', '30º BPM/M'],
        'M07': ['15º BPM/M', '26º BPM/M', '31º BPM/M'],
        'M08': ['14º BPM/M', '20º BPM/M', '25º BPM/M', '33º BPM/M', '36º BPM/M'],
        'M09': ['19º BPM/M', '28º BPM/M', '38º BPM/M'],
        'M10': ['01º BPM/M', '22º BPM/M', '27º BPM/M', '37º BPM/M'],
        'M11': ['08º BPM/M', '21º BPM/M'],
        'M12': ['17º BPM/M', '32º BPM/M', '35º BPM/M']
    };
    
    const btlsForCPA = cpaToBtlMap[userData.paValue] || [];
    
    const dispatcherHeader = document.querySelector('.dispatcher-header');
    dispatcherHeader.innerHTML = `
        <img src="LOGO.PNG" alt="COPOM Logo" class="copom-logo">
        <h1>Despachador - Ocorrências por BTL</h1>
        <div id="dispatcherInfo">${infoHTML}</div>
        <div class="vtr-cadastro-inline">
            <input type="text" id="vtrCadastroInput" placeholder="Digite a VTR">
            <button id="btnCadastrarVTR" class="btn-cadastro">Cadastrar VTR</button>
        </div>
        <div id="btlSelector" style="margin-top: 15px; padding: 15px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 4px;">
            <h3 style="margin-top: 0; margin-bottom: 10px; font-size: 16px;">Selecione o Batalhão</h3>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                ${btlsForCPA.map(btl => `
                    <button class="btn-btl-selector" data-btl="${btl}" style="flex: 1; min-width: 150px; padding: 12px 20px; font-size: 14px; font-weight: 600; background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); color: white; border: none; border-radius: 8px; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        ${btl}
                    </button>
                `).join('')}
            </div>
        </div>
        <div id="selectedBtlDisplay" style="margin-top: 10px; font-size: 14px; font-weight: 600; color: #2c3e50; display: none;">
            Visualizando: <span id="selectedBtlName"></span>
        </div>
    `;
    
    window.selectedBTL = null;
    
    const updateButtonStylesCPA = (selectedBtn) => {
        document.querySelectorAll('.btn-btl-selector').forEach(b => {
            b.style.background = 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)';
            b.style.transform = 'translateY(0)';
            b.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        });
        if (selectedBtn) {
            selectedBtn.style.background = 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)';
            selectedBtn.style.transform = 'translateY(-2px)';
            selectedBtn.style.boxShadow = '0 4px 12px rgba(25, 118, 210, 0.4)';
        }
    };
    
    document.querySelectorAll('.btn-btl-selector').forEach(btn => {
        btn.addEventListener('click', async () => {
            const btl = btn.getAttribute('data-btl');
            
            window.selectedBTL = btl;
            localStorage.setItem('selectedBTL', btl);
            
            document.getElementById('selectedBtlName').textContent = btl;
            document.getElementById('selectedBtlDisplay').style.display = 'block';
            
            updateButtonStylesCPA(btn);
            
            await loadDispatcherOcorrencias(btl, document.getElementById('dispatcherContent'));
        });
        
        btn.addEventListener('mouseenter', function() {
            const currentBg = this.style.background;
            if (!currentBg.includes('1976d2')) {
                this.style.background = 'linear-gradient(135deg, #34495e 0%, #2c3e50 100%)';
                this.style.transform = 'translateY(-2px)';
                this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
            }
        });
        
        btn.addEventListener('mouseleave', function() {
            const currentBg = this.style.background;
            if (!currentBg.includes('1976d2')) {
                this.style.background = 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)';
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            }
        });
    });
    
    document.querySelector('.vtr-cadastro-inline').style.display = 'none';
    
    // Check for saved BTL selection
    const savedBTL = localStorage.getItem('selectedBTL');
    if (savedBTL && btlsForCPA.includes(savedBTL)) {
        window.selectedBTL = savedBTL;
        document.getElementById('selectedBtlName').textContent = savedBTL;
        document.getElementById('selectedBtlDisplay').style.display = 'block';
        
        // Highlight the saved button using the same updateButtonStylesCPA function
        const savedBtn = document.querySelector(`[data-btl="${savedBTL}"]`);
        updateButtonStylesCPA(savedBtn);
        
        await loadDispatcherOcorrencias(savedBTL, document.getElementById('dispatcherContent'));
    } else {
        document.getElementById('dispatcherContent').innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">Selecione um batalhão para visualizar as ocorrências</p>';
    }
    
    showScreen(document.getElementById('dispatcherScreen'), allScreens);
}

export async function showDispatcherScreen(userData, allScreens) {
    const dispatcherHeader = document.querySelector('.dispatcher-header');
    const dispatcherInfo = document.getElementById('dispatcherInfo');
    
    let infoHTML = '';
    
    if (userData.tipo === 'CIVIL') {
        const labelText = userData.funcao === 'DESPACHADOR COBOM' ? 'GB' : 'BTL';
        infoHTML = `<p style="margin: 5px 0;"><strong>Nome:</strong> ${userData.nomeCompleto} | <strong>${labelText}:</strong> ${userData.paValue}</p>`;
    } else {
        const labelText = userData.funcao === 'DESPACHADOR COBOM' ? 'GB' : 'BTL';
        infoHTML = `<p style="margin: 5px 0;"><strong>${userData.graduacao} ${userData.nomeGuerra}</strong> | <strong>RE:</strong> ${userData.re} | <strong>${labelText}:</strong> ${userData.paValue}</p>`;
    }
    
    dispatcherHeader.innerHTML = `
        <img src="LOGO.PNG" alt="COPOM Logo" class="copom-logo">
        <h1>Despachador - Ocorrências por BTL</h1>
        <div id="dispatcherInfo">${infoHTML}</div>
        <div class="vtr-cadastro-inline">
            <input type="text" id="vtrCadastroInput" placeholder="Digite a VTR">
            <button id="btnCadastrarVTR" class="btn-cadastro">Cadastrar VTR</button>
        </div>
    `;
    
    await loadDispatcherOcorrencias(userData.paValue, document.getElementById('dispatcherContent'));
    
    if (window.dispatcherRefreshInterval) {
        clearInterval(window.dispatcherRefreshInterval);
    }
    window.dispatcherRefreshInterval = setInterval(async () => {
        await loadDispatcherOcorrencias(userData.paValue, document.getElementById('dispatcherContent'));
    }, 5000);
    
    showScreen(document.getElementById('dispatcherScreen'), allScreens);
}

