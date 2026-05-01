import { 
    addVeiculo, 
    addPessoa, 
    addImei,
    renderVeiculos, 
    renderPessoas,
    renderImeis, 
    saveAttendance,
    loadUserOcorrencias
} from './attendance.js';
import { showMessage, setupAutoUppercase, formatCPF } from './utils.js';

export function setupFormHandlers(allScreens) {
    const btnVeiculos = document.getElementById('btnVeiculos');
    const btnPessoas = document.getElementById('btnPessoas');
    const btnImei = document.getElementById('btnImei');
    const btnAdicionarVeiculo = document.getElementById('btnAdicionarVeiculo');
    const btnAdicionarPessoa = document.getElementById('btnAdicionarPessoa');
    const btnAdicionarImei = document.getElementById('btnAdicionarImei');
    const btnMinhasOcorrencias = document.getElementById('btnMinhasOcorrencias');
    const btnCloseOcorrencias = document.getElementById('btnCloseOcorrencias');
    const attendanceForm = document.getElementById('attendanceForm');
    const attendanceMessage = document.getElementById('attendanceMessage');

    btnVeiculos.addEventListener('click', (e) => {
        e.preventDefault();
        const veiculosSection = document.getElementById('veiculosSection');
        veiculosSection.style.display = veiculosSection.style.display === 'none' ? 'block' : 'none';
        document.getElementById('pessoasSection').style.display = 'none';
        document.getElementById('imeiSection').style.display = 'none';
    });

    btnPessoas.addEventListener('click', (e) => {
        e.preventDefault();
        const pessoasSection = document.getElementById('pessoasSection');
        pessoasSection.style.display = pessoasSection.style.display === 'none' ? 'block' : 'none';
        document.getElementById('veiculosSection').style.display = 'none';
        document.getElementById('imeiSection').style.display = 'none';
    });

    btnImei.addEventListener('click', (e) => {
        e.preventDefault();
        const imeiSection = document.getElementById('imeiSection');
        imeiSection.style.display = imeiSection.style.display === 'none' ? 'block' : 'none';
        document.getElementById('veiculosSection').style.display = 'none';
        document.getElementById('pessoasSection').style.display = 'none';
    });

    const placaInput = document.getElementById('placa');
    placaInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });

    placaInput.addEventListener('blur', async (e) => {
        const placa = e.target.value.replace(/[^A-Z0-9]/g, '');

        if (placa.length === 7) {
            try {
                const response = await fetch(`https://placa.app.br/api/v1/consultar/${placa}`);
                const data = await response.json();

                if (data && !data.erro) {
                    document.getElementById('modelo').value = (data.marca + ' ' + data.modelo).toUpperCase();
                    document.getElementById('ano').value = data.ano || '';
                    document.getElementById('cor').value = (data.cor || '').toUpperCase();
                    document.getElementById('tipoVeiculo').value = (data.tipo || '').toUpperCase();
                    document.getElementById('estadoVeiculo').value = (data.uf || '').toUpperCase();
                }
            } catch (error) {
                console.log('Não foi possível consultar a placa automaticamente');
            }
        }
    });

    const veiculoInputs = ['modelo', 'cor', 'tipoVeiculo', 'estadoVeiculo'];
    setupAutoUppercase(veiculoInputs.map(id => document.getElementById(id)));

    setupAutoUppercase([document.getElementById('nomePessoa')]);

    document.getElementById('cpfPessoa').addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 11) {
            value = value.substring(0, 11);
        }
        if (value.length <= 11) {
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        }
        e.target.value = value;
    });

    // IMEI Input validation
    const imeiInput = document.getElementById('imeiInput');
    imeiInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });

    btnAdicionarVeiculo.addEventListener('click', (e) => {
        e.preventDefault();
        const placa = document.getElementById('placa').value.trim();
        const modelo = document.getElementById('modelo').value.trim();
        const ano = document.getElementById('ano').value.trim();
        const cor = document.getElementById('cor').value.trim();
        const tipo = document.getElementById('tipoVeiculo').value.trim();
        const estado = document.getElementById('estadoVeiculo').value.trim();
        const situacao = document.getElementById('situacaoVeiculo').value;

        if (!placa || !situacao) {
            alert('Por favor, preencha ao menos a placa e a situação');
            return;
        }

        const veiculo = {
            id: Date.now(),
            placa,
            modelo,
            ano,
            cor,
            tipo,
            estado,
            situacao
        };

        addVeiculo(veiculo);
        renderVeiculos(document.getElementById('veiculosAdicionados'));

        document.getElementById('placa').value = '';
        document.getElementById('modelo').value = '';
        document.getElementById('ano').value = '';
        document.getElementById('cor').value = '';
        document.getElementById('tipoVeiculo').value = '';
        document.getElementById('estadoVeiculo').value = '';
        document.getElementById('situacaoVeiculo').value = '';
    });

    btnAdicionarPessoa.addEventListener('click', (e) => {
        e.preventDefault();
        const nome = document.getElementById('nomePessoa').value.trim();
        const cpf = document.getElementById('cpfPessoa').value.trim();
        const dataNascimento = document.getElementById('dataNascimento').value;
        const telefone = document.getElementById('telefonePessoa').value.trim();
        const envolvimento = document.getElementById('envolvimento').value;

        if (!nome || !envolvimento) {
            alert('Por favor, preencha ao menos o nome e o envolvimento');
            return;
        }

        const pessoa = {
            id: Date.now(),
            nome,
            cpf,
            dataNascimento,
            telefone,
            envolvimento
        };

        addPessoa(pessoa);
        renderPessoas(document.getElementById('pessoasAdicionadas'));

        document.getElementById('nomePessoa').value = '';
        document.getElementById('cpfPessoa').value = '';
        document.getElementById('dataNascimento').value = '';
        document.getElementById('telefonePessoa').value = '';
        document.getElementById('envolvimento').value = '';
    });
    
    // Handler for adding IMEI
    btnAdicionarImei.addEventListener('click', (e) => {
        e.preventDefault();
        const imeiNumero = document.getElementById('imeiInput').value.trim();
        const situacao = document.getElementById('situacaoImei').value;

        if (imeiNumero.length !== 15 || !/^\d{15}$/.test(imeiNumero)) {
            alert('Por favor, insira um IMEI válido de 15 dígitos.');
            return;
        }

        if (!situacao) {
            alert('Por favor, selecione a situação do IMEI.');
            return;
        }

        const imei = {
            id: Date.now(),
            numero: imeiNumero,
            situacao: situacao
        };

        addImei(imei);
        renderImeis(document.getElementById('imeisAdicionados'));

        document.getElementById('imeiInput').value = '';
        document.getElementById('situacaoImei').value = '';
    });

    btnMinhasOcorrencias.addEventListener('click', async () => {
        await loadUserOcorrencias(document.getElementById('ocorrenciasContent'));
        document.getElementById('ocorrenciasList').style.display = 'block';
    });

    btnCloseOcorrencias.addEventListener('click', () => {
        document.getElementById('ocorrenciasList').style.display = 'none';
    });

    attendanceForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
            telefone: document.getElementById('telefone').value,
            nome: document.getElementById('nomeAtendimento').value.toUpperCase(),
            cep: document.getElementById('cep').value,
            rua: document.getElementById('rua').value.toUpperCase(),
            numero: document.getElementById('numero').value.toUpperCase(),
            bairro: document.getElementById('bairro').value.toUpperCase(),
            municipio: document.getElementById('municipio').value.toUpperCase(),
            estado: document.getElementById('estado').value.toUpperCase(),
            btl: document.getElementById('btl').value,
            referencia: document.getElementById('referencia').value.toUpperCase(),
            historico: document.getElementById('historico').value.toUpperCase(),
            natureza: document.getElementById('natureza').value,
            gravidade: document.getElementById('gravidade').value
        };

        const success = await saveAttendance(formData, attendanceMessage);

        if (success) {
            attendanceForm.reset();
            // Ensure BTL-related UI cleared for atendente mode
            const btlMap = document.getElementById('btlMap');
            if (btlMap) btlMap.style.display = 'none';
            const btlCoordinates = document.getElementById('btlCoordinates');
            if (btlCoordinates) btlCoordinates.textContent = '';
            const btlStatus = document.getElementById('btlStatus');
            if (btlStatus) btlStatus.textContent = '';

            // Clear selected BTL value explicitly
            const btlSelect = document.getElementById('btl');
            if (btlSelect) btlSelect.value = '';

            renderVeiculos(document.getElementById('veiculosAdicionados'));
            renderPessoas(document.getElementById('pessoasAdicionadas'));
            renderImeis(document.getElementById('imeisAdicionados'));
            document.getElementById('veiculosSection').style.display = 'none';
            document.getElementById('pessoasSection').style.display = 'none';
            document.getElementById('imeiSection').style.display = 'none';
        }
    });
}