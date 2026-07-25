import { mkStringWriter, type Write } from './Write.js'

export interface Formatter {
  buf: Write
}

export const stringFormatter = () =>
  new (class implements Formatter {
    buf = mkStringWriter()
    unwrap() {
      return this.buf.unwrap()
    }
  })()
