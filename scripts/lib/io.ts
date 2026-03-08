export interface IO {
  log: (msg: string) => void;
  error: (msg: string) => void;
}

export const defaultIO: IO = {
  log: (msg) => console.log(msg),
  error: (msg) => console.error(msg),
};
