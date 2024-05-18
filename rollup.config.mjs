import { nodeResolve } from '@rollup/plugin-node-resolve';
import strip from '@rollup/plugin-strip';
import jscc from 'rollup-plugin-jscc';
import terser from '@rollup/plugin-terser';
import json from '@rollup/plugin-json';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const joltPkg = JSON.parse(readFileSync(new URL('./node_modules/jolt-physics/package.json', import.meta.url), 'utf8'));

const STRIP_FUNCTIONS = [
    'Debug.log',
    'Debug.logOnce',
    'Debug.warn',
    'Debug.warnOnce',
    'Debug.error',
    'Debug.errorOnce',
    'Debug.assert',
    'Debug.checkRange',
    'Debug.checkInt',
    'Debug.checkUint',
    'Debug.checkFloat',
    'Debug.checkFloatPositive',
    'Debug.checkBool',
    'Debug.checkVec',
    'Debug.checkVecPositive',
    'Debug.checkQuat',
    'Debug.checkSpringSettings',
    'Debug.verifyProperties'
];

const versions = {
    _VERSION: JSON.stringify(pkg.version),
    _JOLT_VERSION: JSON.stringify(joltPkg.version)
};

const jscOptsProd = {
    values: {
        ...versions,
        _DEBUG: 1
    },
    asloader: false,
    keepLines: true
};

const jscOptsDev = {
    ...jscOptsProd,
    values: {
        ...versions,
        _DEBUG: 0
    }
};

export default (args) => {
    const isDev = args.config_dev;
    const file = isDev ? 'dist/physics.dbg.mjs' : 'dist/physics.min.mjs';
    const plugins = [json(), nodeResolve()];

    if (isDev) {
        plugins.push(jscc(jscOptsProd));
    } else {
        plugins.push(
            strip({ functions: STRIP_FUNCTIONS }),
            jscc(jscOptsDev),
            terser()
        );
    }

    return {
        input: 'src/index.mjs',
        output: {
            file,
            format: 'es',
            sourcemap: isDev ? 'inline' : false
        },
        external: ['playcanvas'],
        plugins
    };
};
