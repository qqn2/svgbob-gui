import { Layer } from "#asciiflow/client/layer";
import {
  IStringifier,
  JSONStringifier,
} from "#asciiflow/common/stringifiers";
import { Base64 } from "js-base64";
import * as pako from "pako";

export const MAX_SHARED_DRAWING_ENCODED_BYTES = 100_000;
const MAX_SHARED_DRAWING_INFLATED_BYTES = 2_000_000;

export interface IDrawing {
  name: string;
  layer: Layer;
}

interface IDrawingPartial {
  name: string;
  layer: string;
}

export class DrawingStringifier implements IStringifier<IDrawing> {
  public serialize(value: IDrawing) {
    const jsonString = new JSONStringifier<IDrawingPartial>().serialize({
      ...value,
      layer: Layer.serialize(value.layer),
    });
    const jsonBytes = new TextEncoder().encode(jsonString);
    const deflatedBytes = pako.deflate(jsonBytes);
    const base64 = Base64.fromUint8Array(deflatedBytes);
    return base64;
  }
  public deserialize(value: string) {
    if (value.length > MAX_SHARED_DRAWING_ENCODED_BYTES) {
      throw new Error("Shared drawing is too large");
    }
    const deflatedBytes = Base64.toUint8Array(value);
    const inflator = new pako.Inflate();
    const chunks: Uint8Array[] = [];
    let inflatedSize = 0;
    inflator.onData = (chunk: Uint8Array) => {
      inflatedSize += chunk.length;
      if (inflatedSize > MAX_SHARED_DRAWING_INFLATED_BYTES) {
        throw new Error("Shared drawing expands beyond the supported size");
      }
      chunks.push(chunk);
    };
    inflator.push(deflatedBytes, true);
    if (inflator.err) {
      throw new Error(inflator.msg || "Invalid shared drawing");
    }
    const jsonBytes = new Uint8Array(inflatedSize);
    let offset = 0;
    for (const chunk of chunks) {
      jsonBytes.set(chunk, offset);
      offset += chunk.length;
    }
    const jsonString = new TextDecoder("utf8").decode(jsonBytes);
    const object = new JSONStringifier<IDrawingPartial>().deserialize(
      jsonString
    );
    return {
      ...object,
      layer: Layer.deserialize(object.layer),
    };
  }
}
