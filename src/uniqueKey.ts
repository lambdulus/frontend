// Unique keys for boxes and notebooks. Date.now() alone is not enough:
// entities created within the same millisecond (e.g. the two default
// notebooks) would share a key and React would render one of them twice.
let keyCounter : number = 0

export function uniqueKey () : string {
  keyCounter++

  return `${Date.now().toString()}-${keyCounter}-${Math.floor(Math.random() * 1000000).toString()}`
}
