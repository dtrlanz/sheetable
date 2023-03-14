const LIB_FILES = {
    sheetable: {
        files: ['lib/sheetableCommon', 'lib/sheetableClient'],
        namespace: 'Sheetable',
    },
    pet: {
        files: ['tests/pet'],
        namespace: undefined,
    },
    numbers: {
        files: ['tests/numbers'],
        namespace: undefined,
    },
    tester: {
        files: ['tests/tester'],
        namespace: undefined,
    },
    clientTests: {
        files: ['tests/client/00', 'tests/client/01', 'tests/client/02'],
        namespace: 'ClientTests',
    },
} as const;

function requireLib(libs: (keyof typeof LIB_FILES)[] | keyof typeof LIB_FILES) {
    if (typeof libs === 'string') libs = [libs];
    return libs.map(function(libName) {
        const { files, namespace } = LIB_FILES[libName];
        return `<script>\n${
            // send .gs file to client using ScriptApp.getResource()
            // see https://sites.google.com/a/mcpher.com/share/Home/excelquirks/gassnips/shareclientserver
            files.map(file => (ScriptApp as any).getResource(file).getDataAsString()).join('\n')
            }\n${ namespace !== undefined ? 
                `${namespace}.Client?.init?.();
                ${namespace} = { ...${namespace}, ...(${namespace}.Client ?? {}) };` : ''
            }</script>`;
    }).join('\n');
}