const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { stripBase64 } = require('../js/arpa-cloud-sync.js');

describe('stripBase64', () => {
  it('anula data: como elementos de array (bug de fotosAntes)', () => {
    const input = {
      fotosAntes: ['data:image/jpeg;base64,ABC', 'data:image/jpeg;base64,XYZ']
    };
    assert.deepEqual(stripBase64(input), { fotosAntes: [null, null] });
  });

  it('anula data: como valor directo de una propiedad', () => {
    const input = { logo: 'data:image/png;base64,AAA', nombre: 'Acme' };
    assert.deepEqual(stripBase64(input), { logo: null, nombre: 'Acme' });
  });

  it('anula data: en array dentro de objeto dentro de array', () => {
    const input = {
      items: [
        { fotosDespues: ['data:image/jpeg;base64,ONE'] },
        { ok: true }
      ]
    };
    assert.deepEqual(stripBase64(input), {
      items: [
        { fotosDespues: [null] },
        { ok: true }
      ]
    });
  });

  it('deja intactos strings que no empiezan con data:', () => {
    const input = { url: 'https://example.com/foto.jpg', fotosAntes: ['https://cdn.example/a.jpg'] };
    assert.deepEqual(stripBase64(input), input);
  });
});
