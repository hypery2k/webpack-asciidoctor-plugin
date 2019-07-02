const fs = require("fs");

it('renders correctly', () => {
    const expectedHtml = fs.readFileSync(__dirname + '/generate.index.expect.html', 'utf8');
    const html = fs.readFileSync(__dirname + '/../dist/index.html', 'utf8');
    expect(html).toMatch(expectedHtml);
});