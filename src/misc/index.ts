export function mapLeftFromTo(
  from : number,
  to : number,
  sequence : Array<any>,
  fn : (...args : Array<any>) => any) {
    const result : Array<any> = new Array(to - from + 1)

    for (let e = 0, i = from; i <= to; ++i) {
      result[e++] = fn(sequence[i], i)
    }

    return result
  }
