const AsciiDocPlugin = require('../../lib/plugin');

describe('config', () => {
  let plugin;
  /* eslint no-debugger: "off" */
  debugger;

  beforeEach(() => {
    plugin = new AsciiDocPlugin();
  });

  it('should init with default values', () => {
    expect(plugin).toBeDefined();
  });

});
