const fs = require('fs');
const path = require('path');
const glob = require('glob');
const parse5 = require('parse5');
const _ = require('lodash');
const chalk = require('chalk');
const asciidoctor = require('asciidoctor.js')();


class AsciiDocRevalPlugin {

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
		this.srcFiles = [];
		const self = this;
		if (!!this.options.src) {
			glob(this.options.src, options, function (err, files) {
				if (err) {
					throw new Error(
						`Given src path not found via options: ${JSON.stringify(
							options
						)}`
					);
				}
				self.srcFiles = files;
			});
		}
	}
    /**
     * check if a node is a valid external section
     * @param {Object} node - parse5 documentFragment
     * @returns {boolean}
     *
     */
	isNodeValidExternalSection(node) {
		return !!(
			node.nodeName === 'section' &&
			_.filter(node.attrs, { name: 'data-external' }).length);
	}

    /**
     * get a count for how many sections the html document contains
     * @param {Object} documentFragment - parse5 processed html
     * @param {array} sections
     * @returns {array}
     *
     */
	getSections(documentFragment, sections) {
		if (!sections) sections = [];

		if (documentFragment.childNodes && documentFragment.childNodes.length) {
			documentFragment.childNodes.forEach((childNode) => {
				if (this.isNodeValidExternalSection(childNode)) {
					sections.push(childNode);
				} else {
					sections = this.getSections(childNode, sections);
				}
			});
		}
		return sections;
	}

    /**
     * get the section and replace it with  correct external ref
     * @returns {Promise}
     *
     */
	processSection(html, section, srcPath, outputPath) {
		return new Promise((resolve, reject) => {
			try {
				section.attrs.forEach((attr) => {
					if (attr.name === 'data-external') {
						const adocSectionFilename = attr.value;
						const htmlSectionFilename = adocSectionFilename.replace('.adoc', '.html');
						if (this.options.inline) {
							let converted = this.convertAsciiDocToHTML(path.join(srcPath, adocSectionFilename));
							const start = section.sourceCodeLocation.startOffset;
							const end = section.sourceCodeLocation.endOffset;
							resolve(html.replace(html.substring(start, end), converted));
						} else {
							const destinationFile = path.join(outputPath, this.options.dest, htmlSectionFilename);
							if (!fs.existsSync(path.dirname(destinationFile))) {
								fs.mkdirSync(path.dirname(destinationFile), { recursive: true });
							}
							this.writeAsciiDocFile(path.join(srcPath, adocSectionFilename), destinationFile);
							resolve(html.replace(adocSectionFilename, (this.options.dest.length > 0 ? '/' : '') + htmlSectionFilename));
						}
					}
				});
			} catch (err) { reject(err); }
		});
	}

    /**
     * run the Promises in a synchronous order
     * allows us to ensure we have completed processing of sectionss
     * before the next ones Promise is called (via then chaining)
     * @param {object} html
     * @param {array} sections
     * @returns {Promise}
     *
     */
	updateHTML(html, sections, srcPath, outputPath) {
		return sections.reduce((promise, sectionNode) => {
			return promise.then((html) => {
				return this.processSection(html, sectionNode, srcPath, outputPath);
			});
		}, Promise.resolve(html));
	}

	processSections(compilation, html, srcPath, outputPath) {
		return new Promise((resolve, reject) => {
			const documentFragment = parse5.parseFragment(html, {
				sourceCodeLocationInfo: true
			});
			const sections = this.getSections(documentFragment);
			sections.forEach((section) => {
				section.attrs.forEach((attr) => {
					if (attr.name === 'data-external') {
						const adocSectionFilename = attr.value;
						// add file watches
						compilation.fileDependencies.add(path.join(srcPath, adocSectionFilename));
					}
				});
			});
			// process the imageNodes
			this.updateHTML(html, sections, srcPath, outputPath)
				.then((html) => resolve(html))
				.catch((err) => {
					console.log(chalk.underline.red('processSections hit error'));
					console.log(chalk.red(err));
					reject(err);
				});
		});
	}

	writeAsciiDocFile(srcFile, destinationFile) {
		try {
			// Convert the document using the reveal.js converter
			let result = this.convertAsciiDocToHTML(srcFile);
			fs.writeFileSync(destinationFile, result);
		} catch (err) {
			throw new Error(err);
		}
	}

	convertAsciiDocToHTML(srcFile) {
		// Convert the document using the reveal.js converter
		return asciidoctor.convert(fs.readFileSync(srcFile, { encoding: 'utf8' }), this.options.adocOptions);
	}

	/**
	 * apply is called by the webpack main compiler during the start phase
	 * @param {WebpackCompiler} compiler
	 */
	apply(compiler) {
		const self = this,
			options = self.options;

		compiler.hooks.make.tapAsync('AsciiDocRevalPlugin', (compilation, callback) => {
			callback();
		});

		// Hook into the html-webpack-plugin processing
		compiler.plugin('compilation', (compilation) => {
			const { outputOptions } = compilation;
			compilation.plugin('html-webpack-plugin-after-html-processing', (htmlPluginData, callback) => {
				return this.processSections(compilation, htmlPluginData.html, options.srcFolder, outputOptions.path)
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

		compiler.hooks.emit.tapAsync('AsciiDocRevalPlugin',
			/**
			 * Hook into the webpack emit phase
			 * @param {WebpackCompilation} compilation
			 * @param {() => void} callback
			*/
			(compilation, callback) => {
				const { outputOptions } = compilation;
				glob(this.options.src, options, (err, files) => {
					files.forEach(adocFile => {
						self.writeAsciiDocFile(adocFile, path.join(outputOptions.path, options.dest, filename.replace('.adoc', '.html')));
					});
				});
				callback();
			});

		compiler.hooks.done.tap('AsciiDocRevalPlugin', (
			stats /* stats is passed as argument when done hook is tapped.  */
		) => {
			// TODO stats
		});
	}

}
module.exports = AsciiDocRevalPlugin;