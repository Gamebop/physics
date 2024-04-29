import json from '@rollup/plugin-json';

export default {
	input: 'src/index.mjs',
	output: {
		file: 'dist/physics.mjs',
		format: 'es',
	},
    plugins: [ json() ]
};