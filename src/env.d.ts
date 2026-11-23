// The Workers runtime has crypto.subtle.timingSafeEqual
// (worker-configuration.d.ts declares it), but the DOM lib's SubtleCrypto type
// takes precedence in this project and hides it. This adds the method back.
interface SubtleCrypto {
  timingSafeEqual(
    a: ArrayBuffer | ArrayBufferView,
    b: ArrayBuffer | ArrayBufferView,
  ): boolean;
}
