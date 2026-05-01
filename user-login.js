import { authenticateUser } from './auth.js';
import { showUserDashboard } from './ui-screens.js';
import { getData, setData } from './database.js';

export function setupUserLoginHandlers(userLoginForm, allScreens) {
    userLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const cpfRe = document.getElementById('loginCpfRe').value.toUpperCase();
        const servico = document.getElementById('loginServico').value;
        const perfil = document.getElementById('loginPerfil').value;
        const paValue = document.getElementById('loginPA').value;
        const userLoginMessage = document.getElementById('userLoginMessage');

        const userData = await authenticateUser(cpfRe, servico, perfil, paValue, userLoginMessage);

        if (userData) {
            // Check for existing active session
            const activeSessions = await getData('activeSessions') || {};
            const userId = userData.cpf ? userData.cpf.replace(/\D/g, '') : userData.re;
            
            const existingSession = Object.values(activeSessions).find(session => session.userId === userId);
            
            if (existingSession) {
                const userName = userData.tipo === 'MILITAR' 
                    ? `${userData.graduacao} ${userData.nomeGuerra}` 
                    : userData.nomeCompleto;
                alert(`USUARIO ${userName} JA ESTA LOGADO EM ${existingSession.perfil} - ${existingSession.location || 'OUTRA MÁQUINA'}`);
                return;
            }
            
            // Create new session
            const sessionId = `${userId}_${Date.now()}`;
            const newSession = {
                userId: userId,
                userName: userData.tipo === 'MILITAR' 
                    ? `${userData.graduacao} ${userData.nomeGuerra}` 
                    : userData.nomeCompleto,
                perfil: userData.funcao,
                location: paValue,
                timestamp: Date.now(),
                lastActivity: Date.now()
            };
            
            activeSessions[sessionId] = newSession;
            await setData('activeSessions', activeSessions);
            
            // Store session ID for cleanup on logout
            localStorage.setItem('copomSessionId', sessionId);
            localStorage.setItem('copomUserSession', JSON.stringify(userData));
            showUserDashboard(userData, allScreens);
        }
    });
}

