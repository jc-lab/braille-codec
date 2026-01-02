import { decodeUnicode } from './utils';

export const NUMBERS: Record<number, string> = {
  [decodeUnicode('⠁')]: '1',
  [decodeUnicode('⠃')]: '2',
  [decodeUnicode('⠉')]: '3',
  [decodeUnicode('⠙')]: '4',
  [decodeUnicode('⠑')]: '5',
  [decodeUnicode('⠋')]: '6',
  [decodeUnicode('⠛')]: '7',
  [decodeUnicode('⠓')]: '8',
  [decodeUnicode('⠊')]: '9',
  [decodeUnicode('⠚')]: '0',
};
