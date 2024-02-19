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
    },
    plugins: [new DefinePlugin({
        DEBUG: process.env.NODE_ENV === 'development',
        ...constants
    })]
};

export default (env, argv) => {
    if (argv.mode === 'development') {
        config.mode = 'development';
        config.devtool = 'eval-source-map';
        config.output.filename = 'physics-components.dbg.js';
    }

    if (argv.mode === 'production') {
        config.mode = 'production';
        config.output.filename = 'physics-components.min.js';
    }

    return config;
};
