import { getDatabase, ref, push, get, remove, update, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

let db;

export function initDatabase(firebaseApp) {
    db = getDatabase(firebaseApp);
}

export function getRef(path) {
    return ref(db, path);
}

export async function pushData(path, data) {
    return await push(ref(db, path), data);
}

export async function getData(path) {
    const snapshot = await get(ref(db, path));
    return snapshot.exists() ? snapshot.val() : null;
}

export async function removeData(path) {
    return await remove(ref(db, path));
}

export async function updateData(path, data) {
    return await update(ref(db, path), data);
}

export async function setData(path, data) {
    return await set(ref(db, path), data);
}

export { update, set };

export async function getNextSequentialNumber(today) {
    try {
        const atendimentos = await getData('atendimentos');
        
        if (!atendimentos) {
            return 1; // Start from 1 instead of 0
        }
        
        let maxNumber = 0; // Start from 0 instead of -1
        
        Object.values(atendimentos).forEach(atendimento => {
            if (atendimento.data === today && typeof atendimento.numeroRegistro === 'number') {
                if (atendimento.numeroRegistro > maxNumber) {
                    maxNumber = atendimento.numeroRegistro;
                }
            }
        });
        
        return maxNumber + 1;
    } catch (error) {
        console.error('Erro ao obter número sequencial:', error);
        return 1; // Start from 1 instead of 0
    }
}

