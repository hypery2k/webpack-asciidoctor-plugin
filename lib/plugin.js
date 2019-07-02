const path = require('path');
const glob = require('glob');
const Converter = require('./converter');


class AsciiDocPlugin {

	constructor(options) {
		const userOptions = options || {};
		// Default options
		const defaultOptions = {
			srcFolder: 'src',
			src: 'index.adoc',
			inline: false,
			dest: '',
			adocOptions: { safe: 'safe', backend: 'html', base_dir: '..' }
		};
		this.options = Object.assign(defaultOptions, userOptions);
		this.converter = new Converter(this.options);
	}
	/**
	 * apply is called by the webpack main compiler during the start phase
	 * @param {WebpackCompiler} compiler
	 */
	apply(compiler) {
		const self = this,
			options = self.options;

		compiler.hooks.make.tapAsync('AsciiDocPlugin', (compilation, callback) => {
			callback();
		});

		// Hook into the html-webpack-plugin processing
		compiler.plugin('compilation', (compilation) => {
			const { outputOptions } = compilation;
			compilation.plugin('html-webpack-plugin-after-html-processing', (htmlPluginData, callback) => {
				return this.converter.processSections(compilation, htmlPluginData.html, options.srcFolder, outputOptions.path)
					.then((html) => {
						htmlPluginData.html = html || htmlPluginData.html;
						return typeof callback === 'function' ?
							callback(null, htmlPluginData) :
							htmlPluginData;

					})
					.catch((err) => {
						console.log(err);
						return typeof callback === 'function' ?
							callback(null, htmlPluginData) :
							htmlPluginData;
					});

			});
		});

		compiler.hooks.emit.tapAsync('AsciiDocPlugin',
			/**
			 * Hook into the webpack emit phase
			 * @param {WebpackCompilation} compilation
			 * @param {() => void} callback
			*/
			(compilation, callback) => {
				const { outputOptions } = compilation;
				glob(this.options.src, options, (err, files) => {
					files.forEach(adocFile => {
						this.converter.writeAsciiDocFile(adocFile, path.join(outputOptions.path, options.dest, adocFile.replace('.adoc', '.html')));
					});
				});
				callback();
			});
	}

}
module.exports = AsciiDocPlugin;