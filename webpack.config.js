const path = require('path');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
const getModuleFederationConfig = require('@jahia/webpack-config/getModuleFederationConfig');
const packageJson = require('./package.json');

module.exports = (env, argv) => {
    const config = {
        entry: {
            main: path.resolve(__dirname, 'src/javascript/index')
        },
        output: {
            path: path.resolve(__dirname, 'src/main/resources/javascript/apps/'),
            filename: 'jahia.bundle.js',
            chunkFilename: '[name].jahia.[chunkhash:6].js'
        },
        resolve: {
            mainFields: ['module', 'main'],
            extensions: ['.mjs', '.js', '.jsx', '.json'],
            alias: {
                '~': path.resolve(__dirname, 'src/javascript')
            }
        },
        module: {
            rules: [
                {test: /\.m?js$/, type: 'javascript/auto'},
                {
                    test: /\.jsx?$/,
                    include: [path.join(__dirname, 'src')],
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: [
                                ['@babel/preset-env', {modules: false}],
                                ['@babel/preset-react', {runtime: 'classic'}]
                            ]
                        }
                    }
                },
                {
                    test: /\.s[ac]ss$/i,
                    use: [
                        'style-loader',
                        {loader: 'css-loader', options: {modules: true}},
                        'sass-loader'
                    ]
                }
            ]
        },
        plugins: [
            new ModuleFederationPlugin(getModuleFederationConfig(packageJson, {
                // Consumed at runtime from the app shell, exactly as jcontent consumes jahia-ui-root.
                // Everything this module borrows from jcontent comes through this one remote.
                remotes: {
                    '@jahia/jcontent': 'appShell.remotes.jcontent',
                    '@jahia/jahia-ui-root': 'appShell.remotes.jahiaUi'
                }
            })),
            new CleanWebpackPlugin({verbose: false}),
            new CopyWebpackPlugin({patterns: [{from: './package.json', to: ''}]})
        ],
        mode: 'development'
    };

    config.devtool = (argv.mode === 'production') ? 'source-map' : 'eval-source-map';
    return config;
};
