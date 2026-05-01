// Application constants

export const PASSWORDS = {
    CADASTRO: 'DAQTA'
};

export const SERVICOS = [
    'RADIO PATRULHA',
    'BOMBEIRO',
    'TRANSITO',
    'CHOQUE',
    'AMBIENTAL',
    'SAMU/192',
    'BAEP',
    'ESPECIALIDADES'
];

export const FUNCOES_RADIO_PATRULHA = ['ATENDENTE', 'DESPACHADOR', 'SUPERVISOR'];
export const FUNCOES_TRANSITO = ['DESPACHADOR'];
export const FUNCOES_CHOQUE = ['DESPACHADOR'];
export const FUNCOES_COBOM = ['ATENDENTE COBOM', 'DESPACHADOR COBOM', 'SUPERVISOR COBOM'];

export const NATUREZAS = [
    'C04 - DESINTELIGÊNCIA',
    'A98 - VIOLÊNCIA DOMÉSTICA',
    'B04 - ROUBO'
];

export const GRAVIDADES = ['URGENTE', 'NORMAL', 'SOP'];

export const SITUACOES_VEICULO = [
    'FURTO',
    'ROUBO',
    'AÇÃO CRIMINOSA',
    'ACIDENTE DE TRÂNSITO'
];

export const SITUACOES_IMEI = [
    'FURTO',
    'ROUBO',
    'EXTRAVIO'
];

export const ENVOLVIMENTOS_PESSOA = [
    'VÍTIMA',
    'AUTOR',
    'TESTEMUNHA',
    'CONDUTOR'
];

export const GRADUACOES = [
    'CEL PM',
    'TEN CEL PM',
    'MAJ PM',
    'CAP PM',
    '1º TEN PM',
    '2º TEN PM',
    'SUBTEN PM',
    '1º SGT PM',
    '2º SGT PM',
    '3º SGT PM',
    'CB PM',
    'SD PM 1ª CL',
    'SD PM 2ª CL'
];

export const BPTRANS = ['1ºBPTRAN', '2ºBPTRAN'];
export const GBS = ['1ºGB', '2ºGB', '3ºGB', '4ºGB', '8ºGB', '5º/17º'];

export const SUPERVISOR_COBOM_TO_GB_MAP = {
    'A': ['1ºGB', '2ºGB', '4ºGB', '18ºGB'],
    'B': ['3ºGB', '8ºGB', '5º/17º']
};

export const CPA_TO_BTL_MAP = {
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

export const BTLS = [
    '01º BPM/M', '02º BPM/M', '03º BPM/M', '04º BPM/M', '05º BPM/M',
    '06º BPM/M', '07º BPM/M', '08º BPM/M', '09º BPM/M', '10º BPM/M',
    '11º BPM/M', '12º BPM/M', '13º BPM/M', '14º BPM/M', '15º BPM/M',
    '16º BPM/M', '17º BPM/M', '18º BPM/M', '19º BPM/M', '20º BPM/M',
    '21º BPM/M', '22º BPM/M', '23º BPM/M', '24º BPM/M', '25º BPM/M',
    '26º BPM/M', '27º BPM/M', '28º BPM/M', '29º BPM/M', '30º BPM/M',
    '31º BPM/M', '32º BPM/M', '33º BPM/M', '35º BPM/M', '36º BPM/M',
    '37º BPM/M', '38º BPM/M', '39º BPM/M', '43º BPM/M', '46º BPM/M',
    '48º BPM/M', '49º BPM/M'
];

export const PA_EXCLUDED_RANGES = [
    121, 122, 123, 124, 125, 126, 127,
    140, 141, 142, 143, 144, 145, 146,
    159, 160, 161, 162, 163, 164, 165,
    178, 179, 180, 182, 183, 184
];

export const PA_COBOM_RANGES = [
    121, 122, 123, 124, 125, 126, 127,
    140, 141, 142, 143, 144, 145, 146,
    159, 160, 161, 162, 163, 164, 165,
    178, 179, 180, 182, 183, 184
];