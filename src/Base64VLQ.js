/**
 * Implements the Base64 VLQ in the sourcemaps V3 spec
 * @flow
 */

const base64 = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H',
  'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P',
  'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X',
  'Y', 'Z', 'a', 'b', 'c', 'd', 'e', 'f',
  'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
  'o', 'p', 'q', 'r', 's', 't', 'u', 'v',
  'w', 'x', 'y', 'z', '0', '1', '2', '3',
  '4', '5', '6', '7', '8', '9', '+', '/'
];

export default function decodeBase64VLQ(s: string): number[] {
  const result = [];

  if (s === '') {
    return result;
  }

  let temp = 0;
  let shift = 0;

  for (const code of s.split('')) {
    let index = base64.indexOf(code);
    if (index === -1) {
      throw new Error(`${code} is not a valid base-64 character.`);
    }

    temp |= ((index & 0x1F) << shift);
    if ((index & 0x20) == 0) {
      result.push(temp);
      temp = 0;
    } else {
      shift += 5;
    }
  }

  return result;
}
