import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'webpack';

// TODO
// do we have another way to inline constants (without
// importing backend specific stuff here)?
import { constants } from './src/physics/components/jolt/constants.mjs';

const { DefinePlugin } = pkg;
const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const config = {
    entry: './src/index.mjs',
    output: {
        filename: 'physics-components.js',
        path: path.resolve(dirname, 'dist'),
        library: 'PhysicsComponents',
        libraryTarget: 'umd',
        libraryExport: 'default'
    },
    optimization: {
        chunkIds: 'named'
    }
};

export default (env, argv) => {
    if (argv.mode === 'development') {
        config.mode = 'development';
        config.devtool = 'eval-source-map';
        config.output.filename = 'physics-components.dbg.js';
        config.plugins = [ new DefinePlugin({ DEBUG: true, ...constants }) ];
    }

    if (argv.mode === 'production') {
        config.mode = 'production';
        config.output.filename = 'physics-components.min.js';
        config.plugins = [ new DefinePlugin({ DEBUG: false, ...constants }) ];
    }

    return config;
};
