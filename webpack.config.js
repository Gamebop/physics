import path from 'path';
import { fileURLToPath } from 'url';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const config = {
    entry: './src/index.mjs',
    output: {
        filename: 'physics-components.js',
        path: path.resolve(dirname, 'dist'),
        library: 'PhysicsComponents',
        libraryTarget: 'umd',
        libraryExport: 'default',
        
        // TODO
        // a bug? without it, the path to worker chunk becomes:
        // https://playcanvas.com/static/platform/js/onetrust/
        workerPublicPath: 'https://launch.playcanvas.com'
    },
    optimization: {
        chunkIds: 'named'
    }
};

export default (env, argv) => {
    if (argv.mode === 'development') {
        config.mode = 'development';
        // config.devtool = 'eval-cheap-source-map';
        config.devtool = 'eval-source-map';
        config.output.filename = 'physics-components.dbg.js';
    }

    if (argv.mode === 'production') {
        config.mode = 'production';
        config.output.filename = 'physics-components.min.js';
    }

    return config;
};
