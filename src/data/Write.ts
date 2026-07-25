import { format, type Displayable } from '../write.js'

export interface Write {
  write_fmt(...args: Displayable[]): void
}

class StringWriter implements Write {
  public value: string[] = []
  write_fmt(...args: Displayable[]): void {
    this.value.push(format(...args))
  }
  unwrap() {
    return this.value.join('')
  }
}

export const mkStringWriter = () => new StringWriter()
