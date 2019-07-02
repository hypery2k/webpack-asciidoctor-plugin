const webpack = require('webpack');
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const exec = require('child_process').exec;
const AsciiDocRevalPlugin = require('../..');
const asciidoctorRevealjs = require('asciidoctor-reveal.js');
const HtmlWebpackPlugin = require('html-webpack-plugin');

asciidoctorRevealjs.register();

async function getConfig() {

  // Configurable options for the build
  const userConfig = {

    /* Languages to be supported by syntax highlighting in Reveal
     (the more fonts, the heavier the bundle will be) */
    HIGHLIGHT_LANGUAGES: ['xml', 'javascript', 'python', 'bash'],

  }

  const entries = { 'index': './src/index.js' }

  const htmlPluginList = [
    new HtmlWebpackPlugin({
      template: `./src/index.html`,
      filename: `./index.html`,
      chunks: ['index', 'app'],
      chunksSortMode: 'manual',
    })
  ]



  return {
    entry: entries,
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'lib/js/[name].js'
    },

    optimization: {
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              // // see https://github.com/FortAwesome/Font-Awesome/
              // // and https://github.com/fabiosantoscode/terser/issues/50
              // collapse_vars: true,
            },
            output: null,
          },
          sourceMap: false
        }),
        new OptimizeCSSAssetsPlugin({})
      ]
    },

    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader'
          }
        }, {
          test: /\.(sa|sc|c)ss$/,
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: "css-loader",
              // options: {
              //   modules: true,
              //   sourceMap: true,
              //   importLoader: 2
              // }
            },
            'sass-loader',
          ],
        }, {
          test: /(eot|woff|woff2|ttf|svg)(\?\S*)?$/,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: '[name].[ext]',
                // publicPath: './../../',
                publicPath: '../webfonts/',
                outputPath: 'lib/webfonts/',
                emitFile: true
              }
            }
          ]
        }
      ]
    },

    resolve: {
      alias: {
        nodePath: path.join(__dirname, 'node_modules'),
        stylesPath: path.join(__dirname, 'src/styles'),
      }
    },

    devServer: {
      contentBase: path.join(__dirname, "dist/"),
      port: 9000
    },

    plugins: [
      ...htmlPluginList,

      new AsciiDocRevalPlugin({
        adocOptions: { safe: 'safe', backend: 'revealjs', base_dir: '..' }, inline: true
      }),
      new webpack.ProvidePlugin({
        Reveal: 'reveal.js',
      }),
      /* Copy some needed files in hierarchy */
      new CopyWebpackPlugin([
        // speaker note base window
        { from: 'node_modules/reveal.js/plugin/notes/notes.html', to: 'lib/js/reveal.js-dependencies/notes.html' },
        // styles for slides export to to pdf
        { from: { glob: 'node_modules/reveal.js/css/print/*.css' }, to: 'lib/css/[name].css' },
        // any images
        {
          context: 'src/images',
          from: '**/*',
          to: 'images/'
        }
      ]),

      new CopyWebpackPlugin([
        // Style from reveal.js-menu, css (not compatible with svg inline)
        { from: 'node_modules/reveal.js-menu/menu.css', to: 'lib/css/menu.css' },
      ]),

      /* Include only Highlights.js languages that are specified in configEnv.HIGHLIGHT_LANGUAGES */
      new webpack.ContextReplacementPlugin(
        /highlight\.js\/lib\/languages$/,
        new RegExp(`^./(${userConfig.HIGHLIGHT_LANGUAGES.join('|')})$`),
      ),

      new MiniCssExtractPlugin({
        filename: 'lib/css/[name].css',
        // chunkFilename: "lib/css/[name].css"
      }),

      // clean up generatedEntries folder of file-specific tree shaking for FA icons
      // only when not in dev-server
      {
        apply: (compiler) => {
          compiler.hooks.afterEmit.tap('AfterEmitPlugin', (compilation) => {
            if (process.env.NODE_ENV != 'dev-server') {
              exec('rm -R ./src/scripts/_generatedEntries');
            }
          });
        }
      },
    ].filter((plugin) => plugin !== false) // filter out skipped conditions
  };

}

const isEnv = (name) => process.env.NODE_ENV === name

module.exports = getConfig();
