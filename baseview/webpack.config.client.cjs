const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
    mode: 'production',
    // mode: 'development',
    entry: {
        client_modules: './index_client.js'
    },
    output: {
        filename: '[name].js',
        path: `${ __dirname }/build/modules/`,
        libraryTarget: 'module',
        chunkFormat: 'module'
    },
    experiments: {
        outputModule: true
    },
    // Todo: Uglify ...
    optimization: {
        minimize: true,
        minimizer: [new TerserPlugin({})],
        concatenateModules: true
    },
    target: 'web',
    watch: false
};
