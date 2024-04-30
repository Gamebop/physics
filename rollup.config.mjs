import { nodeResolve } from '@rollup/plugin-node-resolve';
import strip from '@rollup/plugin-strip';
import jscc from 'rollup-plugin-jscc';
import terser from '@rollup/plugin-terser';

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

const jscOptsProd = {
	values: {
		_DEBUG: 1
	},
	asloader: false,
	keepLines: true
};

const jscOptsDev = {
	...jscOptsProd,
	values: {
		_DEBUG: 0
	}
};


export default args => {
	const isDev = args.config_dev;
	
	const plugins = [nodeResolve()];
	
	if (isDev) {
		plugins.push(jscc(jscOptsProd));
	} else {
		plugins.push(
			strip({ functions: STRIP_FUNCTIONS }),
			jscc(jscOptsDev),
			terser()
		)
	}

	return {
		input: 'src/index.mjs',
		output: {
			file: 'dist/physics.mjs',
			format: 'es',
			sourcemap: isDev ? 'inline' : false
		},
		plugins
	};
};