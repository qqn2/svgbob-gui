export function errorSvg(message: string): string {
  const safe = message.replace(/[<>&"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c] ?? c
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="40"><text x="10" y="24" fill="#c44" font-family="monospace" font-size="13">${safe}</text></svg>`;
}

export function isErrorSvg(svg: string): boolean {
  return (
    svg.includes('fill="#c44"') &&
    svg.includes('font-family="monospace"') &&
    svg.includes("<text")
  );
}
