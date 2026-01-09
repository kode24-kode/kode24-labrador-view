// const TerserPlugin = require("terser-webpack-plugin");
const webpack = require('webpack');

module.exports = {
    // mode: 'production',
    mode: 'development',
    entry: {
        editor_modules: './modules/index_editor.js'
    },
    output: {
        filename: '[name].js',
        path: `${ __dirname }/build/modules/`,
        libraryTarget: 'module',
        chunkFormat: 'module',
        chunkLoading: false
    },

    experiments: {
        outputModule: true
    },

    target: 'web',
    devtool: 'source-map',
    watch: false,
    plugins: [
        new webpack.BannerPlugin({
            banner: `Baseview.\nBuild: [fullhash]\n(c) Labrador CMS AS\nhttps://www.labradorcms.com\n`
        })
    ]
};
