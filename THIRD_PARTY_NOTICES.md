# Third-Party Notices

svgbob GUI is an independent community project. It is not affiliated with or
endorsed by the svgbob or ASCIIFlow maintainers. The names of third-party
projects are used only to identify the software this project modifies or uses.

## ASCIIFlow

The `asciiflow-upstream/` directory contains a modified, vendored copy of
[ASCIIFlow](https://github.com/lewish/asciiflow).

Copyright (c) 2021 Lewis Hemens

ASCIIFlow is distributed under the MIT License. Its original license is
preserved at [`asciiflow-upstream/LICENSE`](asciiflow-upstream/LICENSE), with a
production copy at
[`asciiflow-upstream/client/public/licenses/ASCIIFlow-MIT.txt`](asciiflow-upstream/client/public/licenses/ASCIIFlow-MIT.txt).

## svgbob-wasm

SVG rendering uses
[svgbob-wasm](https://github.com/agoose77/svgbob-wasm), a WebAssembly wrapper
around [svgbob](https://github.com/ivanceras/svgbob).

svgbob is distributed under the Apache-2.0 license. The installed
`svgbob-wasm` package also declares Apache-2.0, and its upstream repository
includes an MIT license. Copies of the applicable license texts are shipped in
production builds:

- [`svgbob-and-svgbob-wasm-APACHE-2.0.txt`](asciiflow-upstream/client/public/licenses/svgbob-and-svgbob-wasm-APACHE-2.0.txt)
- [`svgbob-wasm-MIT.txt`](asciiflow-upstream/client/public/licenses/svgbob-wasm-MIT.txt)

The Apache-2.0 license does not grant permission to use third-party trade
names, trademarks, service marks, or product names except for customary
attribution and identification.

## svgbob GUI

Original svgbob GUI code is distributed under the MIT License. The source
license is preserved at [`LICENSE`](LICENSE), with a production copy at
[`PROJECT-MIT.txt`](asciiflow-upstream/client/public/licenses/PROJECT-MIT.txt).

## Production distribution

Vite copies the complete license set and a plain-text version of these notices
from `asciiflow-upstream/client/public/licenses/` into `dist/licenses/`.

## Other npm dependencies

Additional runtime and development dependencies are listed in `package.json`
and `package-lock.json`. Their licenses and copyright notices remain the
property of their respective authors.
