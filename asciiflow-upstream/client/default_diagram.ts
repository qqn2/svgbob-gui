/** Default RTL pipeline shown on first launch when the canvas is empty. */
export const DEFAULT_DIAGRAM = `
         +----------+     +----------+     +----------+
         |          |     |          |     |          |
  IN --->| DECODE   +---->|  EXEC    +---->| WRITEBACK+---> OUT
         |          |     |          |     |          |
         +----+-----+     +----+-----+     +----+-----+
              |                |                |
              v                v                v
         +----------+     +----------+     +----------+
         |  REG A   |     |  REG B   |     |  REG C   |
         +----------+     +----------+     +----------+

  CLK ---+----------------+----------------+
         |                |                |
         v                v                v
`.trim();
