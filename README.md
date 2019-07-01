# WebPack Plugin for AsciiDoc

[![Build Status](https://travis-ci.org/hypery2k/webpack-asciidoctor-plugin.svg?branch=master)](https://travis-ci.org/hypery2k/webpack-asciidoctor-plugin)

Instead of the [AsciiDoctor-Loader](https://github.com/exaptis/asciidoctor-loader) this plugin can be used together with the [HTML WebPack] plugin to load AsciiDoc fragments via `data-external`, e.g. for reveal.js Integration:

```
<section data-external="content/course.adoc"> </section>
```
## Config

Use the following

```
const AsciiDocRevalPlugin = require('webpack-asciidoctor-plugin');
const asciidoctorRevealjs = require('asciidoctor-reveal.js');

asciidoctorRevealjs.register();

return {

..


  return {
   ...
    plugins: [

      new AsciiDocRevalPlugin({
        adocOptions: { safe: 'safe', backend: 'revealjs', base_dir: '..' }, // for reveal.js use this backed
        inline: false // set to true, if you want to replace the data-external section with the converted HTML
      }),
     
    ]
  };

}

```