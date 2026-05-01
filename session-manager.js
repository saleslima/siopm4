import { setCurrentUser } from './auth.js';
import { showScreen } from './utils.js';
import { showDispatcherScreen, showSupervisorScreen, showSupervisorCobomScreen } from './ui-screens.js';

export async function restoreSession(allScreens) {
    const savedSession = localStorage.getItem('copomUserSession');
    if (!savedSession) return false;

    try {
        const userData = JSON.parse(savedSession);
        setCurrentUser(userData);
        
        const attendanceScreen = document.getElementById('attendanceScreen');
        const userDashboard = document.getElementById('userDashboard');
        
        if (userData.funcao === 'ATENDENTE' || userData.funcao === 'ATENDENTE COBOM') {
            showScreen(attendanceScreen, allScreens);
        } else if (userData.funcao === 'DESPACHADOR' || userData.funcao === 'DESPACHADOR COBOM') {
            await showDispatcherScreen(userData, allScreens);
        } else if (userData.funcao === 'SUPERVISOR') {
            await showSupervisorScreen(userData, allScreens);
        } else if (userData.funcao === 'SUPERVISOR COBOM') {
            await showSupervisorCobomScreen(userData, allScreens);
        } else {
            showScreen(userDashboard, allScreens);
            const userInfo = document.getElementById('userInfo');
            let infoHTML = '';
            if (userData.tipo === 'CIVIL') {
                infoHTML = `<p style="margin: 5px 0;"><strong>Nome:</strong> ${userData.nomeCompleto} | <strong>CPF:</strong> ${userData.cpf} | <strong>Função:</strong> ${userData.funcao}</p>`;
            } else {
                infoHTML = `<p style="margin: 5px 0;"><strong>${userData.graduacao} ${userData.nomeGuerra}</strong> | <strong>RE:</strong> ${userData.re} | <strong>Função:</strong> ${userData.funcao}</p>`;
            }
            userInfo.innerHTML = infoHTML;
        }
        return true;
    } catch (error) {
        console.error('Error restoring session:', error);
        localStorage.removeItem('copomUserSession');
        return false;
    }
}

export async function clearSession() {
    const sessionId = localStorage.getItem('copomSessionId');
    
    if (sessionId) {
        try {
            const { getData, setData } = await import('./database.js');
            const activeSessions = await getData('activeSessions') || {};
            
            if (activeSessions[sessionId]) {
                delete activeSessions[sessionId];
                await setData('activeSessions', activeSessions);
            }
        } catch (error) {
            console.error('Error clearing session:', error);
        }
        
        localStorage.removeItem('copomSessionId');
    }
    
    localStorage.removeItem('copomUserSession');
}

