// const path = require('path');
import path from 'path';
import { fileURLToPath } from 'url';
import RequireFrom from 'webpack-require-from';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

// TODO
// https://github.com/agoldis/webpack-require-from

const config = {
    entry: './src/index.mjs',
    output: {
        filename: 'physics-components.js',
        path: path.resolve(dirname, 'dist'),
        library: 'PhysicsComponents'
    }
};

export default (env, argv) => {
    if (argv.mode === 'development') {
        config.mode = 'development';
        config.devtool = 'eval-cheap-source-map';
        config.output.filename = 'physics-components.dbg.js';
        // config.output.chunkFilename = "worker.pc.js";
        // config.plugins = [
        //     new RequireFrom({
        //         methodName: '__globalCustomDomain',
        //     })
        // ];        
    }

    if (argv.mode === 'production') {
        config.mode = 'production';
        config.output.filename = 'physics-components.min.js';
    }

    return config;
};
