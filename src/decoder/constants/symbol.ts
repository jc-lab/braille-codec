import { decodeUnicode } from './utils';

export const SYMBOLS: Record<string, string> = {
  [`${decodeUnicode('⠖')}`]: '!',
  [`${decodeUnicode('⠲')}`]: '.',
  [`${decodeUnicode('⠐')}`]: ',',
  [`${decodeUnicode('⠦')}`]: '?',
  [`${decodeUnicode('⠐')},${decodeUnicode('⠂')}`]: ':',
  [`${decodeUnicode('⠰')},${decodeUnicode('⠆')}`]: ';',
  [`${decodeUnicode('⠤')}`]: '-',
  [`${decodeUnicode('⠤')},${decodeUnicode('⠤')}`]: '―',
  [`${decodeUnicode('⠦')}`]: '"', // opening
  [`${decodeUnicode('⠴')}`]: '"', // closing
  [`${decodeUnicode('⠠')},${decodeUnicode('⠦')}`]: "'",
  [`${decodeUnicode('⠈')},${decodeUnicode('⠔')}`]: '~',
  [`${decodeUnicode('⠲')},${decodeUnicode('⠲')},${decodeUnicode('⠲')}`]: '…',
  [`${decodeUnicode('⠠')},${decodeUnicode('⠠')},${decodeUnicode('⠠')}`]: '⋯',
  [`${decodeUnicode('⠦')},${decodeUnicode('⠄')}`]: '(',
  [`${decodeUnicode('⠠')},${decodeUnicode('⠴')}`]: ')',
  [`${decodeUnicode('⠦')},${decodeUnicode('⠂')}`]: '{',
  [`${decodeUnicode('⠐')},${decodeUnicode('⠴')}`]: '}',
  [`${decodeUnicode('⠦')},${decodeUnicode('⠆')}`]: '[',
  [`${decodeUnicode('⠰')},${decodeUnicode('⠴')}`]: ']',
  [`${decodeUnicode('⠐')},${decodeUnicode('⠆')}`]: '·',
  [`${decodeUnicode('⠐')},${decodeUnicode('⠦')}`]: '「',
  [`${decodeUnicode('⠴')},${decodeUnicode('⠂')}`]: '」',
  [`${decodeUnicode('⠰')},${decodeUnicode('⠦')}`]: '『',
  [`${decodeUnicode('⠴')},${decodeUnicode('⠆')}`]: '』',
  [`${decodeUnicode('⠸')},${decodeUnicode('⠌')}`]: '/',
  [`${decodeUnicode('⠐')},${decodeUnicode('⠶')}`]: '〈',
  [`${decodeUnicode('⠶')},${decodeUnicode('⠂')}`]: '〉',
  [`${decodeUnicode('⠰')},${decodeUnicode('⠶')}`]: '《',
  [`${decodeUnicode('⠶')},${decodeUnicode('⠆')}`]: '》',
};
