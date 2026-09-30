import { getAddressDecoder, type Address } from '@solana/kit';

/** Token-2022 extension type for in-mint token metadata. */
const TOKEN_METADATA_EXTENSION = 19;
/** Extensions start after the 165-byte base (mint padded to account size) and a 1-byte account type. */
const EXTENSIONS_OFFSET = 166;

export interface OnChainTokenMetadata {
  updateAuthority: Address;
  mint: Address;
  name: string;
  symbol: string;
  uri: string;
  fields: Record<string, string>;
}

/** Parse in-mint Token-2022 metadata from raw mint account data, or null if absent. */
export function parseTokenMetadata(data: Uint8Array): OnChainTokenMetadata | null {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let offset = EXTENSIONS_OFFSET;
  while (offset + 4 <= data.byteLength) {
    const type = view.getUint16(offset, true);
    const length = view.getUint16(offset + 2, true);
    const start = offset + 4;
    if (start + length > data.byteLength) return null;
    if (type === TOKEN_METADATA_EXTENSION) return decode(data.subarray(start, start + length));
    if (type === 0 && length === 0) return null;
    offset = start + length;
  }
  return null;
}

function decode(bytes: Uint8Array): OnChainTokenMetadata | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = new TextDecoder('utf-8', { fatal: true });
  const addresses = getAddressDecoder();
  let offset = 0;
  const take = (length: number) => {
    if (offset + length > bytes.byteLength) throw new Error('truncated');
    const slice = bytes.subarray(offset, offset + length);
    offset += length;
    return slice;
  };
  const u32 = () => {
    const value = view.getUint32(take(4).byteOffset - bytes.byteOffset, true);
    return value;
  };
  const string = () => text.decode(take(u32()));
  try {
    const updateAuthority = addresses.decode(take(32));
    const mint = addresses.decode(take(32));
    const name = string();
    const symbol = string();
    const uri = string();
    const count = u32();
    if (count > 32) return null;
    const fields: Record<string, string> = {};
    for (let index = 0; index < count; index += 1) {
      const key = string();
      fields[key] = string();
    }
    return { updateAuthority, mint, name, symbol, uri, fields };
  } catch {
    return null;
  }
}
