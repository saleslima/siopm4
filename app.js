import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { firebaseConfig } from './firebase-config.js';
import { initDatabase, pushData, getData, getRef, update } from './database.js';
import { 
    setCurrentUser, 
    getCurrentUser,
    updateFunctionOptions,
    updatePAOptions
} from './auth.js';
import { showMessage, showScreen, formatCPF, formatCEP, setupAutoUppercase } from './utils.js';
import { PASSWORDS } from './constants.js';
import { setupUserLoginHandlers } from './user-login.js';
import { restoreSession, clearSession } from './session-manager.js';
import { 
    addVeiculo, 
    addPessoa,
    addImei, 
    removeVeiculoById, 
    removePessoaById, 
    removeImeiById, 
    renderVeiculos, 
    renderPessoas,
    renderImeis, 
    saveAttendance, 
    clearVeiculos,
    clearPessoas,
    checkExistingOcorrencias,
    reiterarOcorrencia,
    restoreFormFields // <-- New import
} from './attendance.js';
import { loadDispatcherOcorrencias, registerVTR } from './dispatcher.js';
import { setupOcorrenciasSearch } from './search.js';
import { setupTelefoneHandler, checkByAddress } from './telefone-handler.js';
import { setupFormHandlers } from './form-handlers.js';
import { showUserDashboard, showDispatcherScreen, showSupervisorScreen } from './ui-screens.js';
import { detectBTLFromAddress, preloadMaps } from './btl-detector.js';
import { setupAdminHandlers } from './admin.js';
import { setupChefiaHandlers } from './chefia.js';
import { setupSupervCivilHandlers } from './superv-civil.js';
import './keyboard-shortcuts.js';

const app = initializeApp(firebaseConfig);
initDatabase(app);

// Screen elements
const loginScreen = document.getElementById('loginScreen');
const cadastroPasswordScreen = document.getElementById('cadastroPasswordScreen');
const userLoginScreen = document.getElementById('userLoginScreen');
const cadastroScreen = document.getElementById('cadastroScreen');
const userDashboard = document.getElementById('userDashboard');
const attendanceScreen = document.getElementById('attendanceScreen');
const dispatcherScreen = document.getElementById('dispatcherScreen');
const adminPasswordScreen = document.getElementById('adminPasswordScreen');
const adminScreen = document.getElementById('adminScreen');

const chefiaPasswordScreen = document.getElementById('chefiaPasswordScreen');
const chefiaScreen = document.getElementById('chefiaScreen');
const supervCivilPasswordScreen = document.getElementById('supervCivilPasswordScreen');
const supervCivilScreen = document.getElementById('supervCivilScreen');

export const allScreens = [
    loginScreen, 
    cadastroPasswordScreen, 
    userLoginScreen, 
    cadastroScreen, 
    userDashboard, 
    attendanceScreen, 
    dispatcherScreen,
    adminPasswordScreen,
    adminScreen,
    chefiaPasswordScreen,
    chefiaScreen,
    supervCivilPasswordScreen,
    supervCivilScreen
];

// Button elements
const btnChefia = document.getElementById('btnChefia');
const btnCadastro = document.getElementById('btnCadastro');
const btnUsuario = document.getElementById('btnUsuario');
const btnBackFromCadastroPassword = document.getElementById('btnBackFromCadastroPassword');
const btnBackFromUserLogin = document.getElementById('btnBackFromUserLogin');
const btnBackFromCadastro = document.getElementById('btnBackFromCadastro');
const btnLogout = document.getElementById('btnLogout');
const btnBackFromAttendance = document.getElementById('btnBackFromAttendance');
const btnLogoutDispatcher = document.getElementById('btnLogoutDispatcher');
const btnCadastrarVTR = document.getElementById('btnCadastrarVTR');
const btnNovoCadastro = document.getElementById('btnNovoCadastro');
const btnUsuarios = document.getElementById('btnUsuarios');
const searchUsuario = document.getElementById('searchUsuario');

// Form elements
const form = document.getElementById('cadastroForm');
const cadastroPasswordForm = document.getElementById('cadastroPasswordForm');
const userLoginForm = document.getElementById('userLoginForm');
const messageDiv = document.getElementById('message');
const cadastroPasswordMessage = document.getElementById('cadastroPasswordMessage');
const userLoginMessage = document.getElementById('userLoginMessage');
const attendanceMessage = document.getElementById('attendanceMessage');
const tipoSelect = document.getElementById('tipo');
const civilFields = document.getElementById('civilFields');
const militarFields = document.getElementById('militarFields');

// Check for existing session on page load
window.addEventListener('DOMContentLoaded', async () => {
    await restoreSession(allScreens);
    preloadMaps(); // Start loading BTL maps in background
});

// Button event listeners
btnChefia.addEventListener('click', () => {
    showScreen(chefiaPasswordScreen, allScreens);
});

btnCadastro.addEventListener('click', () => {
    showScreen(cadastroPasswordScreen, allScreens);
});

btnUsuario.addEventListener('click', async () => {
    showScreen(userLoginScreen, allScreens);
});

btnBackFromCadastroPassword.addEventListener('click', () => {
    showScreen(loginScreen, allScreens);
    cadastroPasswordForm.reset();
    cadastroPasswordMessage.style.display = 'none';
});

btnBackFromUserLogin.addEventListener('click', () => {
    showScreen(loginScreen, allScreens);
    userLoginMessage.style.display = 'none';
    userLoginForm.reset();
});

btnBackFromCadastro.addEventListener('click', () => {
    showScreen(loginScreen, allScreens);
    form.reset();
    civilFields.style.display = 'none';
    militarFields.style.display = 'none';
});

btnLogout.addEventListener('click', async () => {
    await clearSession();
    setCurrentUser(null);
    showScreen(loginScreen, allScreens);
});

btnBackFromAttendance.addEventListener('click', async () => {
    // Before logging out/navigating, ensure form state is clean (especially important if in reiteration flow)
    restoreFormFields();
    
    await clearSession();
    setCurrentUser(null);
    showScreen(loginScreen, allScreens);
    document.getElementById('attendanceForm').reset();
    document.getElementById('ocorrenciasList').style.display = 'none';
    document.getElementById('ocorrenciasSearchList').style.display = 'none'; // Ensure search list is also closed
});

btnLogoutDispatcher.addEventListener('click', async () => {
    await clearSession();
    setCurrentUser(null);
    showScreen(loginScreen, allScreens);
});

// Service change handler
document.getElementById('loginServico').addEventListener('change', (e) => {
    updateFunctionOptions(e.target.value, document.getElementById('loginPerfil'));
    document.getElementById('loginPA').innerHTML = '<option value="">Selecione...</option>';
});

// Profile change handler
document.getElementById('loginPerfil').addEventListener('change', (e) => {
    updatePAOptions(e.target.value, document.getElementById('loginPA'), document.getElementById('paLabel'));
});

// Setup user login handlers
setupUserLoginHandlers(userLoginForm, allScreens);

// Cadastro password form submission
cadastroPasswordForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const password = document.getElementById('cadastroPassword').value;

    if (password === PASSWORDS.CADASTRO) {
        showScreen(cadastroScreen, allScreens);
        cadastroPasswordForm.reset();
        cadastroPasswordMessage.style.display = 'none';
    } else {
        showMessage(cadastroPasswordMessage, 'Senha incorreta!', 'error');
    }
});

// Show/hide fields based on tipo selection
tipoSelect.addEventListener('change', (e) => {
    const tipo = e.target.value;

    if (tipo === 'CIVIL') {
        civilFields.style.display = 'block';
        militarFields.style.display = 'none';
        document.getElementById('re').value = '';
        document.getElementById('graduacao').value = '';
        document.getElementById('nomeGuerra').value = '';
        document.querySelectorAll('input[name="funcaoMilitar"]').forEach(cb => cb.checked = false);
    } else if (tipo === 'MILITAR') {
        civilFields.style.display = 'none';
        militarFields.style.display = 'block';
        document.getElementById('cpf').value = '';
        document.getElementById('nomeCompleto').value = '';
        document.querySelectorAll('input[name="funcaoCivil"]').forEach(cb => cb.checked = false);
    } else {
        civilFields.style.display = 'none';
        militarFields.style.display = 'none';
    }
});

// Setup auto-uppercase for all text inputs
const uppercaseInputs = document.querySelectorAll('input[type="text"]:not([readonly])');
setupAutoUppercase(Array.from(uppercaseInputs));
setupAutoUppercase([document.getElementById('loginCpfRe')]);

// Setup form autosave for attendant mode
setupFormAutosave();

// Setup form progress tracking
setupFormProgressTracking();

// Add auto-uppercase for password input
document.getElementById('cadastroPassword').addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
});

// CPF mask
document.getElementById('cpf').addEventListener('input', (e) => {
    e.target.value = formatCPF(e.target.value);
});

// CEP mask and auto-fill
const cepInput = document.getElementById('cep');
cepInput.addEventListener('input', (e) => {
    e.target.value = formatCEP(e.target.value);
});

// Add trote check when telefone is filled
const telefoneInputMain = document.getElementById('telefone');
if (telefoneInputMain) {
    telefoneInputMain.addEventListener('blur', async () => {
        const telefone = telefoneInputMain.value.trim();
        await checkTroteClassifications(telefone);
    });
}

cepInput.addEventListener('blur', async (e) => {
    const cep = e.target.value.replace(/\D/g, '');

    if (cep.length === 8) {
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();

            if (!data.erro) {
                document.getElementById('rua').value = data.logradouro.toUpperCase();
                document.getElementById('bairro').value = data.bairro.toUpperCase();
                document.getElementById('municipio').value = data.localidade.toUpperCase();
                document.getElementById('estado').value = data.uf.toUpperCase();
                
                // Try to detect BTL only if both rua and numero are filled; otherwise wait for numero blur
                const numero = document.getElementById('numero').value.trim();
                const rua = (data.logradouro || '').toUpperCase().trim();
                if (rua && numero) {
                    await detectBTLFromAddress(
                        rua,
                        numero,
                        data.localidade.toUpperCase(),
                        data.uf.toUpperCase()
                    );
                } else {
                    // show coords placeholder when only rua exists, but don't run full detection
                    document.getElementById('btlStatus').textContent = 'Preencha número para iniciar detecção BTL';
                    document.getElementById('btlStatus').style.color = '#666';
                }
            } else {
                showMessage(attendanceMessage, 'CEP não encontrado.', 'error');
            }
        } catch (error) {
            showMessage(attendanceMessage, 'Erro ao buscar CEP.', 'error');
        }
    }
});

// When user types a street and no CEP, offer matching street options (Nominatim)
const ruaInput = document.getElementById('rua');
let ruaSuggestionsBox = null;
let ruaSuggestionTimeout = null;

function createRuaSuggestionsBox() {
    if (ruaSuggestionsBox) return;
    ruaSuggestionsBox = document.createElement('div');
    ruaSuggestionsBox.id = 'ruaSuggestionsBox';
    ruaSuggestionsBox.style.cssText = 'position: absolute; background: white; border: 1px solid #ddd; border-radius: 4px; max-height: 200px; overflow-y: auto; z-index: 200; width: calc(100% - 40px); box-shadow: 0 6px 20px rgba(0,0,0,0.08);';
    const parent = ruaInput.parentNode;
    parent.style.position = 'relative';
    parent.appendChild(ruaSuggestionsBox);
    ruaSuggestionsBox.style.display = 'none';
}

async function fetchStreetCandidates(rua, municipio, estado) {
    try {
        const qParts = [rua];
        if (municipio) qParts.push(municipio);
        // Always force São Paulo state
        qParts.push('São Paulo');
        qParts.push('Brasil');
        const params = new URLSearchParams({
            q: qParts.join(', '),
            format: 'jsonv2',
            addressdetails: 1,
            limit: 20
        });
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
            headers: { 'Accept-Language': 'pt-BR' }
        });
        if (!res.ok) return [];
        const results = await res.json();
        // filter to items that look like streets/ways AND are in São Paulo state
        return results.filter(r => {
            const isStreet = r.type && (r.type.includes('way') || r.type.includes('street') || (r.address && (r.address.road || r.address.pedestrian)));
            const isSaoPaulo = r.address && (r.address.state === 'São Paulo' || r.address.state === 'SP');
            return isStreet && isSaoPaulo;
        });
    } catch (err) {
        console.warn('Street candidates error', err);
        return [];
    }
}

function showRuaSuggestions(items) {
    createRuaSuggestionsBox();
    ruaSuggestionsBox.innerHTML = '';
    if (!items || items.length === 0) {
        ruaSuggestionsBox.style.display = 'none';
        return;
    }

    items.forEach(item => {
        const div = document.createElement('div');
        div.style.cssText = 'padding: 10px; cursor: pointer; font-size: 14px; margin: 4px; background: #f5f5f5; border-radius: 4px; white-space: nowrap;';
        const display = item.display_name || `${item.address.road || item.address.pedestrian || item.address.footway || ''}, ${item.address.city || item.address.town || item.address.village || ''}`.trim();
        div.textContent = display.toUpperCase();
        div.addEventListener('click', async () => {
            // Fill fields from item.address, then fetch cep via ViaCEP by using postcode if available
            const addr = item.address || {};
            ruaInput.value = (addr.road || addr.pedestrian || addr.footway || addr.cycleway || addr.footway || addr.neighbourhood || '').toUpperCase();
            document.getElementById('bairro').value = (addr.suburb || addr.neighbourhood || addr.village || addr.city_district || addr.district || addr.county || '').toUpperCase();
            document.getElementById('municipio').value = (addr.city || addr.town || addr.village || addr.county || '').toUpperCase();
            document.getElementById('estado').value = (addr.state || addr.region || '').toUpperCase();

            // If Nominatim provides postcode, try ViaCEP
            const postcode = addr.postcode || item.extratags && item.extratags.postcode;
            if (postcode && /^\d{5}-?\d{3}$/.test(postcode)) {
                const cepClean = postcode.replace(/\D/g, '');
                try {
                    const response = await fetch(`https://viacep.com.br/ws/${cepClean}/json/`);
                    const data = await response.json();
                    if (!data.erro) {
                        document.getElementById('cep').value = formatCEP(data.cep || cepClean);
                        document.getElementById('rua').value = (data.logradouro || ruaInput.value).toUpperCase();
                        document.getElementById('bairro').value = (data.bairro || document.getElementById('bairro').value).toUpperCase();
                        document.getElementById('municipio').value = (data.localidade || document.getElementById('municipio').value).toUpperCase();
                        document.getElementById('estado').value = (data.uf || document.getElementById('estado').value).toUpperCase();
                        // run BTL detection with filled data
                        const numero = document.getElementById('numero').value.trim();
                        await detectBTLFromAddress(document.getElementById('rua').value, numero || '', document.getElementById('municipio').value, document.getElementById('estado').value);
                    }
                } catch (err) {
                    console.warn('ViaCEP from postcode failed', err);
                }
            } else {
                // No postcode: still attempt detect BTL by geocode coordinates
                if (item.lat && item.lon) {
                    // reverse geocode lat/lon to obtain precise data via Nominatim (lookup)
                    try {
                        const rev = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${item.lat}&lon=${item.lon}`, {
                            headers: { 'Accept-Language': 'pt-BR' }
                        });
                        if (rev.ok) {
                            const info = await rev.json();
                            const addr2 = info.address || {};
                            document.getElementById('bairro').value = (addr2.suburb || addr2.neighbourhood || addr2.city_district || document.getElementById('bairro').value).toUpperCase();
                            document.getElementById('municipio').value = (addr2.city || addr2.town || addr2.village || addr2.county || document.getElementById('municipio').value).toUpperCase();
                            document.getElementById('estado').value = (addr2.state || addr2.region || document.getElementById('estado').value).toUpperCase();
                        }
                        // run BTL detection
                        const numero = document.getElementById('numero').value.trim();
                        await detectBTLFromAddress(document.getElementById('rua').value, numero || '', document.getElementById('municipio').value, document.getElementById('estado').value);
                    } catch (e) {
                        console.warn('Reverse lookup failed', e);
                    }
                }
            }

            ruaSuggestionsBox.style.display = 'none';
        });
        ruaSuggestionsBox.appendChild(div);
    });

    // display suggestions horizontally
    ruaSuggestionsBox.style.display = 'flex';
    ruaSuggestionsBox.style.flexDirection = 'row';
    ruaSuggestionsBox.style.flexWrap = 'wrap';
    ruaSuggestionsBox.style.gap = '8px';
    ruaSuggestionsBox.style.padding = '8px';
}

ruaInput.addEventListener('input', (e) => {
    // hide suggestions as user types; will fetch on blur
    if (ruaSuggestionsBox) ruaSuggestionsBox.style.display = 'none';
});

ruaInput.addEventListener('blur', (e) => {
    // small delay so click on suggestion registers
    ruaSuggestionTimeout = setTimeout(async () => {
        const ruaVal = ruaInput.value.trim();
        const cepVal = document.getElementById('cep').value.replace(/\D/g, '');
        const municipio = document.getElementById('municipio').value.trim();
        const estado = document.getElementById('estado').value.trim();

        if (!ruaVal) {
            if (ruaSuggestionsBox) ruaSuggestionsBox.style.display = 'none';
            return;
        }

        // If CEP already filled, let CEP handler handle everything
        if (cepVal && cepVal.length === 8) return;

        // Query Nominatim for candidate streets when no CEP provided
        const candidates = await fetchStreetCandidates(ruaVal, municipio, estado);
        if (candidates.length > 0) {
            showRuaSuggestions(candidates);
        } else {
            if (ruaSuggestionsBox) ruaSuggestionsBox.style.display = 'none';
            // As fallback, attempt a single geocode to display coords and detect BTL
            const geocode = await (async () => {
                try {
                    const params = new URLSearchParams({
                        q: `${ruaVal}${municipio ? ', ' + municipio : ''}${estado ? ', ' + estado : ''}, Brasil`,
                        format: 'jsonv2',
                        limit: 1
                    });
                    const r = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, { headers: { 'Accept-Language': 'pt-BR' } });
                    if (!r.ok) return null;
                    const res = await r.json();
                    return res && res[0] ? { lat: parseFloat(res[0].lat), lon: parseFloat(res[0].lon) } : null;
                } catch {
                    return null;
                }
            })();

            if (geocode) {
                document.getElementById('btlCoordinates').textContent = `📍 Lat: ${geocode.lat.toFixed(6)}, Long: ${geocode.lon.toFixed(6)}`;
                updateMapWithIframe(geocode.lat, geocode.lon);
                await detectBTLFromAddress(ruaVal, document.getElementById('numero').value.trim(), municipio.toUpperCase(), estado.toUpperCase());
            }
        }
    }, 150);
});

// hide suggestions on focus elsewhere/click outside
window.addEventListener('click', (ev) => {
    if (!ruaSuggestionsBox) return;
    if (ev.target === ruaInput) return;
    if (ruaSuggestionsBox.contains(ev.target)) return;
    ruaSuggestionsBox.style.display = 'none';
});

// Add address field handlers to check for existing occurrences
const numeroInput = document.getElementById('numero');
const bairroInput = document.getElementById('bairro');

numeroInput.addEventListener('blur', async () => {
    const rua = document.getElementById('rua').value.trim();
    const numero = numeroInput.value.trim();
    const bairro = bairroInput.value.trim();
    const municipio = document.getElementById('municipio').value.trim();
    const estado = document.getElementById('estado').value.trim();
    const cepVal = document.getElementById('cep').value.replace(/\D/g, '');

    // Check for existing occurrences (phone/duplicates alert)
    if (rua && numero && bairro) {
        await checkByAddress(rua, numero, bairro);
    }

    // If CEP present, prefer full detect flow
    if (rua && numero && municipio && estado && cepVal && cepVal.length === 8) {
        await detectBTLFromAddress(rua, numero, municipio, estado);
        return;
    }

    // If no CEP, but user provided rua + numero, attempt street suggestions via Nominatim
    if (rua && numero && !cepVal) {
        try {
            // Try to fetch candidates and show suggestion list; if a user selects one,
            // showRuaSuggestions handler will fill other fields and trigger BTL detection.
            const candidates = await fetchStreetCandidates(rua + ' ' + numero, municipio, estado);
            if (candidates && candidates.length > 0) {
                showRuaSuggestions(candidates);
                // also attempt a geocode to show map/coords and try detection by coordinates
                const first = candidates[0];
                if (first && first.lat && first.lon) {
                    document.getElementById('btlCoordinates').textContent = `📍 Lat: ${parseFloat(first.lat).toFixed(6)}, Long: ${parseFloat(first.lon).toFixed(6)}`;
                    // show iframe map for visual feedback
                    const lat = parseFloat(first.lat), lon = parseFloat(first.lon);
                    // reuse btl-detector's map update via global iframe approach
                    const { updateMapWithIframe } = await import('./btl-detector.js').catch(()=>({}));
                    if (updateMapWithIframe && typeof updateMapWithIframe === 'function') {
                        updateMapWithIframe(lat, lon);
                    } else {
                        // fallback to direct iframe creation
                        const mapDiv = document.getElementById('btlMap');
                        if (mapDiv) {
                            mapDiv.style.display = 'block';
                            if (!document.getElementById('btlMapIframe')) {
                                mapDiv.innerHTML = '';
                                const iframe = document.createElement('iframe');
                                iframe.width = '100%';
                                iframe.height = '100%';
                                iframe.style.border = '0';
                                iframe.id = 'btlMapIframe';
                                mapDiv.appendChild(iframe);
                                const overlay = document.createElement('div');
                                overlay.className = 'map-overlay-container';
                                overlay.innerHTML = `<div class="map-marker-overlay"><div class="pin-icon"></div><div class="pin-pulse"></div></div>`;
                                mapDiv.appendChild(overlay);
                            }
                            const iframe = document.getElementById('btlMapIframe');
                            iframe.src = `https://www.google.com/maps/d/embed?mid=1IZQYhjM25zcrjnTEByfibpcDAE59r9o&ll=${lat},${lon}&z=14`;
                        }
                    }
                    // try detection based on those coords (will fallback to historical if needed)
                    await detectBTLFromAddress(rua, numero, municipio, estado);
                }
            } else {
                // no candidates: fallback to geocode-based BTL detection
                await detectBTLFromAddress(rua, numero, municipio, estado);
            }
        } catch (err) {
            console.warn('Street suggestion/detect error', err);
            await detectBTLFromAddress(rua, numero, municipio, estado);
        }
    } else {
        // If some fields missing, attempt normal detection when enough info present
        if (rua && numero && municipio && estado) {
            await detectBTLFromAddress(rua, numero, municipio, estado);
        }
    }
});

bairroInput.addEventListener('blur', async () => {
    const rua = document.getElementById('rua').value.trim();
    const numero = numeroInput.value.trim();
    const bairro = bairroInput.value.trim();
    
    if (rua && numero && bairro) {
        await checkByAddress(rua, numero, bairro);
    }
});

setupAutoUppercase([document.getElementById('historico')]);

// Setup call classification buttons
setupCallClassificationButtons();

// Setup form handlers and search
setupFormHandlers(allScreens);
setupOcorrenciasSearch();
setupTelefoneHandler();
setupAdminHandlers(allScreens);
setupChefiaHandlers(allScreens);
setupSupervCivilHandlers(allScreens);

// Load naturezas dropdown on page load
loadNaturezasDropdown();

async function loadNaturezasDropdown() {
    const naturezaSelect = document.getElementById('natureza');
    if (!naturezaSelect) return;

    try {
        let naturezas = await getData('naturezas');

        // Normalize data shape: accept array or object map
        if (naturezas && !Array.isArray(naturezas) && typeof naturezas === 'object') {
            naturezas = Object.values(naturezas);
        }

        naturezaSelect.innerHTML = '<option value="">Selecione...</option>';

        if (naturezas && Array.isArray(naturezas) && naturezas.length > 0) {
            // Always show all registered naturezas regardless of service/profile
            naturezas.forEach(nat => {
                const valor = (nat && (nat.valor || `${nat.codigo} - ${nat.descricao}`)) || String(nat);
                const option = document.createElement('option');
                option.value = valor;
                option.textContent = valor;
                naturezaSelect.appendChild(option);
            });
        } else {
            // Fallback to default naturezas from constants
            const defaultNaturezas = [
                'C04 - DESINTELIGÊNCIA',
                'A98 - VIOLÊNCIA DOMÉSTICA',
                'B04 - ROUBO'
            ];
            defaultNaturezas.forEach(nat => {
                const option = document.createElement('option');
                option.value = nat;
                option.textContent = nat;
                naturezaSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading naturezas:', error);
    }
}

// Cadastro form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();    

    const tipo = tipoSelect.value;

    if (!tipo) {
        showMessage(messageDiv, 'Por favor, selecione o tipo.', 'error');
        return;
    }

    const servico = document.getElementById('servico').value;
    
    if (!servico) {
        showMessage(messageDiv, 'Por favor, selecione o serviço.', 'error');
        return;
    }

    let data = { tipo, servico, timestamp: Date.now() };

    if (tipo === 'CIVIL') {
        const cpf = document.getElementById('cpf').value;
        const nomeCompleto = document.getElementById('nomeCompleto').value.toUpperCase();
        const funcoesCheckboxes = document.querySelectorAll('input[name="funcaoCivil"]:checked');
        const funcoes = Array.from(funcoesCheckboxes).map(cb => cb.value);

        if (!cpf) {
            showMessage(messageDiv, 'Por favor, preencha o campo CPF.', 'error');
            return;
        }

        if (!nomeCompleto) {
            showMessage(messageDiv, 'Por favor, preencha o campo Nome Completo.', 'error');
            return;
        }

        if (funcoes.length === 0) {
            showMessage(messageDiv, 'Por favor, selecione ao menos uma função.', 'error');
            return;
        }

        const cpfDigits = cpf.replace(/\D/g, '');
        if (cpfDigits.length !== 11) {
            showMessage(messageDiv, 'CPF deve conter exatamente 11 dígitos.', 'error');
            return;
        }

        data = { ...data, cpf, nomeCompleto, funcoes };
    } else if (tipo === 'MILITAR') {
        const re = document.getElementById('re').value.toUpperCase();
        const graduacao = document.getElementById('graduacao').value;
        const nomeGuerra = document.getElementById('nomeGuerra').value.toUpperCase();
        const funcoesCheckboxes = document.querySelectorAll('input[name="funcaoMilitar"]:checked');
        const funcoes = Array.from(funcoesCheckboxes).map(cb => cb.value);

        if (!re) {
            showMessage(messageDiv, 'Por favor, preencha o campo RE.', 'error');
            return;
        }

        if (!graduacao) {
            showMessage(messageDiv, 'Por favor, selecione a graduação.', 'error');
            return;
        }

        if (!nomeGuerra) {
            showMessage(messageDiv, 'Por favor, preencha o campo Nome Guerra.', 'error');
            return;
        }

        if (funcoes.length === 0) {
            showMessage(messageDiv, 'Por favor, selecione ao menos uma função.', 'error');
            return;
        }

        data = { ...data, re, graduacao, nomeGuerra, funcoes };
    }

    try {
        if (window.editingUserKey) {
            // Update existing user
            const userRef = getRef(`cadastros/${window.editingUserKey}`);
            await update(userRef, data);
            showMessage(messageDiv, 'Usuário atualizado com sucesso!', 'success');
            delete window.editingUserKey;
            form.querySelector('button[type="submit"]').textContent = 'Cadastro';
        } else {
            // Create new user
            await pushData('cadastros', data);        
            showMessage(messageDiv, 'Salvo com sucesso!', 'success');
        }
        
        form.reset();
        civilFields.style.display = 'none';
        militarFields.style.display = 'none';
        
        // Refresh user list if it's visible
        if (document.getElementById('usuariosContainer').style.display !== 'none') {
            await loadUsuarios();
        }
    } catch (error) {
        showMessage(messageDiv, 'Erro ao realizar cadastro: ' + error.message, 'error');
    }
});

btnCadastrarVTR.addEventListener('click', async () => {
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

// Setup modal close function and listener
const modal = document.getElementById('ocorrenciaModal');

async function handleModalClose() {
    modal.style.display = 'none';
    
    // Check if current user is on a Dispatcher/Supervisor screen and refresh their state
    const currentUser = getCurrentUser();
    if (currentUser && (currentUser.funcao.includes('DESPACHADOR') || currentUser.funcao.includes('SUPERVISOR'))) {
        const btlToLoad = window.selectedBTL || currentUser.paValue;
        const dispatcherContent = document.getElementById('dispatcherContent');
        if (dispatcherContent && dispatcherContent.closest('#dispatcherScreen').style.display === 'block') {
            await loadDispatcherOcorrencias(btlToLoad, dispatcherContent);
        }
    }
}

const closeBtn = modal.querySelector('.close');
closeBtn.addEventListener('click', handleModalClose);

// Close modal when clicking outside of it
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        handleModalClose();
    }
});

// Make remove functions global
window.removeVeiculo = function(id) {
    removeVeiculoById(id);
    renderVeiculos(document.getElementById('veiculosAdicionados'));
};

window.removePessoa = function(id) {
    removePessoaById(id);
    renderPessoas(document.getElementById('pessoasAdicionadas'));
};

window.removeImei = function(id) {
    removeImeiById(id);
    renderImeis(document.getElementById('imeisAdicionados'));
};

btnNovoCadastro.addEventListener('click', () => {
    document.getElementById('cadastroFormContainer').style.display = 'block';
    document.getElementById('usuariosContainer').style.display = 'none';
    form.reset();
    civilFields.style.display = 'none';
    militarFields.style.display = 'none';
    messageDiv.style.display = 'none';
});

btnUsuarios.addEventListener('click', async () => {
    document.getElementById('cadastroFormContainer').style.display = 'none';
    document.getElementById('usuariosContainer').style.display = 'block';
    await loadUsuarios();
});

searchUsuario.addEventListener('input', async (e) => {
    e.target.value = e.target.value.toUpperCase();
    await loadUsuarios(e.target.value);
});

async function loadUsuarios(searchTerm = '') {
    const usuariosList = document.getElementById('usuariosList');
    
    try {
        const cadastros = await getData('cadastros');
        
        if (!cadastros) {
            usuariosList.innerHTML = '<p style="text-align: center; color: #999;">Nenhum usuário cadastrado.</p>';
            return;
        }
        
        let usuarios = Object.entries(cadastros)
            .map(([key, data]) => ({ key, ...data }))
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        
        if (searchTerm) {
            usuarios = usuarios.filter(user => {
                const cpf = user.cpf ? user.cpf.replace(/\D/g, '') : '';
                const re = user.re ? user.re.toUpperCase() : '';
                const searchClean = searchTerm.replace(/\D/g, '');
                
                return cpf.includes(searchClean) || re.includes(searchTerm);
            });
        } else {
            usuarios = usuarios.slice(0, 10);
        }
        
        if (usuarios.length === 0) {
            usuariosList.innerHTML = '<p style="text-align: center; color: #999;">Nenhum usuário encontrado.</p>';
            return;
        }
        
        let html = '<div style="display: flex; flex-direction: column; gap: 15px;">';
        usuarios.forEach(user => {
            const funcoesDisplay = user.funcoes ? user.funcoes.join(', ') : (user.funcao || 'N/A');
            
            html += `
                <div style="background: #f9f9f9; padding: 15px; border: 1px solid #ddd; border-radius: 4px;">
                    ${user.tipo === 'CIVIL' ? `
                        <p style="margin: 5px 0;"><strong>Nome:</strong> ${user.nomeCompleto}</p>
                        <p style="margin: 5px 0;"><strong>CPF:</strong> ${user.cpf}</p>
                    ` : `
                        <p style="margin: 5px 0;"><strong>${user.graduacao} ${user.nomeGuerra}</strong></p>
                        <p style="margin: 5px 0;"><strong>RE:</strong> ${user.re}</p>
                    `}
                    <p style="margin: 5px 0;"><strong>Serviço:</strong> ${user.servico}</p>
                    <p style="margin: 5px 0;"><strong>Função(ões):</strong> ${funcoesDisplay}</p>
                    <button class="btn-cadastro" onclick="window.editarUsuario('${user.key}')" style="margin-top: 10px; padding: 8px 16px; font-size: 14px;">Editar</button>
                </div>
            `;
        });
        html += '</div>';
        usuariosList.innerHTML = html;
        
    } catch (error) {
        usuariosList.innerHTML = '<p style="text-align: center; color: #d32f2f;">Erro ao carregar usuários.</p>';
    }
}

window.editarUsuario = async function(userKey) {
    try {
        const cadastros = await getData('cadastros');
        const user = cadastros[userKey];
        
        if (!user) {
            alert('Usuário não encontrado');
            return;
        }
        
        document.getElementById('cadastroFormContainer').style.display = 'block';
        document.getElementById('usuariosContainer').style.display = 'none';
        
        window.editingUserKey = userKey;
        
        tipoSelect.value = user.tipo;
        tipoSelect.dispatchEvent(new Event('change'));
        
        document.getElementById('servico').value = user.servico;
        
        if (user.tipo === 'CIVIL') {
            document.getElementById('cpf').value = user.cpf;
            document.getElementById('nomeCompleto').value = user.nomeCompleto;
            
            if (user.funcoes) {
                document.querySelectorAll('input[name="funcaoCivil"]').forEach(cb => {
                    cb.checked = user.funcoes.includes(cb.value);
                });
            }
        } else if (user.tipo === 'MILITAR') {
            document.getElementById('re').value = user.re;
            document.getElementById('graduacao').value = user.graduacao;
            document.getElementById('nomeGuerra').value = user.nomeGuerra;
            
            if (user.funcoes) {
                document.querySelectorAll('input[name="funcaoMilitar"]').forEach(cb => {
                    cb.checked = user.funcoes.includes(cb.value);
                });
            }
        }
        
        form.querySelector('button[type="submit"]').textContent = 'Atualizar';
        
    } catch (error) {
        alert('Erro ao carregar dados do usuário: ' + error.message);
    }
};

function setupCallClassificationButtons() {
    const classificationButtons = document.querySelectorAll('.btn-classification');
    const telefoneInput = document.getElementById('telefone');

    classificationButtons.forEach(btn => {
        btn.addEventListener('click', async () => {
            const telefone = telefoneInput.value.trim();
            
            if (!telefone) {
                alert('Por favor, preencha o campo telefone antes de classificar a chamada.');
                telefoneInput.focus();
                return;
            }

            const classification = btn.getAttribute('data-classification');
            const currentUser = getCurrentUser();
            
            if (!currentUser) {
                alert('Usuário não identificado.');
                return;
            }

            try {
                await pushData('callClassifications', {
                    telefone: telefone,
                    classification: classification,
                    timestamp: Date.now(),
                    dataHora: new Date().toLocaleString('pt-BR'),
                    userId: currentUser.cpf ? currentUser.cpf.replace(/\D/g, '') : currentUser.re,
                    userName: currentUser.tipo === 'MILITAR' 
                        ? `${currentUser.graduacao} ${currentUser.nomeGuerra}` 
                        : currentUser.nomeCompleto,
                    userType: currentUser.funcao
                });

                alert(`Chamada classificada como: ${classification}`);
                
                // Clear form after classification
                document.getElementById('attendanceForm').reset();
                telefoneInput.value = '';
            } catch (error) {
                alert('Erro ao classificar chamada: ' + error.message);
            }
        });
    });
}

async function checkTroteClassifications(telefone) {
    if (!telefone) return;
    
    try {
        const classifications = await getData('callClassifications');
        
        if (!classifications) return;
        
        const now = Date.now();
        const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
        
        const troteClassifications = Object.values(classifications).filter(c => {
            return c.telefone === telefone && 
                   (c.classification === 'TROTE ADULTO' || c.classification === 'TROTE CRIANÇA') &&
                   c.timestamp >= thirtyDaysAgo;
        });
        
        if (troteClassifications.length > 0) {
            const troteAdultoCount = troteClassifications.filter(c => c.classification === 'TROTE ADULTO').length;
            const troteCriancaCount = troteClassifications.filter(c => c.classification === 'TROTE CRIANÇA').length;
            
            let message = `⚠️ ATENÇÃO: Este número já foi classificado como TROTE nos últimos 30 dias:\n\n`;
            if (troteAdultoCount > 0) message += `• TROTE ADULTO: ${troteAdultoCount} vez(es)\n`;
            if (troteCriancaCount > 0) message += `• TROTE CRIANÇA: ${troteCriancaCount} vez(es)\n`;
            message += `\nTotal de classificações de trote: ${troteClassifications.length}`;
            
            alert(message);
        }
    } catch (error) {
        console.error('Erro ao verificar classificações de trote:', error);
    }
}

function setupFormAutosave() {
    const attendanceFormFields = [
        'telefone', 'nomeAtendimento', 'cep', 'rua', 'numero', 'bairro', 
        'municipio', 'estado', 'btl', 'referencia', 'historico', 'natureza', 'gravidade'
    ];
    
    // Restore form data on load
    const savedFormData = localStorage.getItem('attendanceFormData');
    if (savedFormData) {
        try {
            const formData = JSON.parse(savedFormData);
            attendanceFormFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field && formData[fieldId]) {
                    field.value = formData[fieldId];
                }
            });
        } catch (e) {
            console.warn('Error restoring form data:', e);
        }
    }
    
    // Save form data on input
    attendanceFormFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', () => {
                const formData = {};
                attendanceFormFields.forEach(id => {
                    const f = document.getElementById(id);
                    if (f) formData[id] = f.value;
                });
                localStorage.setItem('attendanceFormData', JSON.stringify(formData));
            });
        }
    });
    
    // Clear saved data on successful form submission
    const attendanceForm = document.getElementById('attendanceForm');
    if (attendanceForm) {
        const originalSubmit = attendanceForm.onsubmit;
        attendanceForm.addEventListener('submit', async (e) => {
            // Wait a moment to ensure saveAttendance completes
            setTimeout(() => {
                localStorage.removeItem('attendanceFormData');
            }, 1000);
        });
    }
}

function setupFormProgressTracking() {
    const attendanceFormFields = [
        'telefone', 'nomeAtendimento', 'cep', 'rua', 'numero', 'bairro', 
        'municipio', 'estado', 'historico', 'natureza', 'gravidade'
    ];
    
    function updateProgress() {
        const progressBar = document.getElementById('formProgressBar');
        const progressText = document.getElementById('formProgressText');
        
        if (!progressBar || !progressText) return;
        
        let filledCount = 0;
        attendanceFormFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field && field.value && field.value.trim()) {
                filledCount++;
            }
        });
        
        const percentage = Math.round((filledCount / attendanceFormFields.length) * 100);
        progressBar.style.width = percentage + '%';
        progressText.textContent = percentage + '% completo';
    }
    
    attendanceFormFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', updateProgress);
            field.addEventListener('change', updateProgress);
        }
    });
    
    // Initial update
    setTimeout(updateProgress, 500);
}