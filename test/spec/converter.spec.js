const Converter = require('../../lib/converter');

describe('config', () => {
  let converter;
  /* eslint no-debugger: "off" */
  debugger;

  beforeEach(() => {
    converter = new Converter();
  });

  it('should init with default values', () => {
    expect(converter).toBeDefined();
  });
});
