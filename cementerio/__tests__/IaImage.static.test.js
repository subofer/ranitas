const fs = require('fs')
const path = require('path')

describe('IaImage static checks', () => {
  test('uses next/image and no inline <img> base64 usage', () => {
    const p = path.join(__dirname, '..', 'app', 'components', 'ia', 'IaImage.jsx')
    const src = fs.readFileSync(p, 'utf8')
    expect(src).toMatch(/import\s+Image\s+from\s+['"]next\/image['"]/)
    expect(src).not.toMatch(/<img\s+src={`data:image/)
  })
})
