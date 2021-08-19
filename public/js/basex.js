const Buffer = {
  from(input) {
    return new Uint8Array(input.split('').map((char) => char.charCodeAt(0)));
  },
  allocUnsafe(length) {
    return new Uint8Array(length);
  }
};

const BaseX = {
  create(alphabet) {

    if (alphabet.length >= 255) {
      throw new TypeError('Alphabet too long');
    }

    const BASE_MAP = new Uint8Array(256);

    for (let j = 0; j < BASE_MAP.length; j++) {
      BASE_MAP[j] = 255;
    }

    for (var i = 0; i < alphabet.length; i++) {
      var x = alphabet.charAt(i);
      var xc = x.charCodeAt(0);
      if (BASE_MAP[xc] !== 255) {
        throw new TypeError(x + ' is ambiguous');
      }
      BASE_MAP[xc] = i;
    }
    var BASE = alphabet.length;
    var LEADER = alphabet.charAt(0);
    var FACTOR = Math.log(BASE) / Math.log(256); // log(BASE) / log(256), rounded up
    var iFACTOR = Math.log(256) / Math.log(BASE); // log(256) / log(BASE), rounded up


    return {
      encode,
      decodeUnsafe,
      decode,
    };

    /**
     *
     * @param source {string | Buffer}
     * @returns {string}
     */
    function encode(source ) {
      if (typeof source === 'string') {
        return encode(Buffer.from(source));
      }

      if (source.length === 0) {
        return '';
      }

      // Skip & count leading zeroes.
      let zeroes = 0;
      let length = 0;
      let pbegin = 0;
      const pend = source.length;

      while (pbegin !== pend && source[pbegin] === 0) {
        pbegin++;
        zeroes++;
      }

      // Allocate enough space in big-endian base58 representation.
      const size = ((pend - pbegin) * iFACTOR + 1) >>> 0;
      const b58 = new Uint8Array(size);

      // Process the bytes.
      while (pbegin !== pend) {
        let carry = source[pbegin];

        // Apply "b58 = b58 * 256 + ch".
        let i = 0;

        for (let it1 = size - 1; (carry !== 0 || i < length) && (it1 !== -1); it1--, i++) {
          carry += (256 * b58[it1]) >>> 0;
          b58[it1] = (carry % BASE) >>> 0;
          carry = (carry / BASE) >>> 0;
        }

        if (carry !== 0) {
          throw new Error('Non-zero carry');
        }
        length = i;
        pbegin++;
      }

      // Skip leading zeroes in base58 result.
      let it2 = size - length;

      while (it2 !== size && b58[it2] === 0) {
        it2++;
      }

      // Translate the result into a string.
      let str = LEADER.repeat(zeroes);
      for (; it2 < size; ++it2) {
        str += alphabet.charAt(b58[it2]);
      }

      return str;
    }

    /**
     *
     * @param source {string}
     */
    function decodeUnsafe(source) {
      if (source.length === 0) {
        return Buffer.alloc(0);
      }

      let psz = 0;

      // Skip leading spaces.
      if (source[psz] === ' ') {
        return;
      }

      // Skip and count leading '1's.
      let zeroes = 0;
      let length = 0;

      while (source[psz] === LEADER) {
        zeroes++;
        psz++;
      }

      // Allocate enough space in big-endian base256 representation.
      const size = (((source.length - psz) * FACTOR) + 1) >>> 0; // log(58) / log(256), rounded up.
      const b256 = new Uint8Array(size);

      // Process the characters.
      while (source[psz]) {
        // Decode character
        let carry = BASE_MAP[source.charCodeAt(psz)];

        // Invalid character
        if (carry === 255) {
          return;
        }

        let i = 0;

        for (let it3 = size - 1; (carry !== 0 || i < length) && (it3 !== -1); it3--, i++) {
          carry += (BASE * b256[it3]) >>> 0;
          b256[it3] = (carry % 256) >>> 0;
          carry = (carry / 256) >>> 0;
        }

        if (carry !== 0) {
          throw new Error('Non-zero carry');
        }

        length = i;
        psz++;
      }

      // Skip trailing spaces.
      if (source[psz] === ' ') {
        return;
      }

      // Skip leading zeroes in b256.
      let it4 = size - length;

      while (it4 !== size && b256[it4] === 0) {
        it4++;
      }

      const vch = Buffer.allocUnsafe(zeroes + (size - it4));
      vch.fill(0x00, 0, zeroes);

      let j = zeroes;
      while (it4 !== size) {
        vch[j++] = b256[it4++];
      }

      return vch;
    }

    /**
     *
     * @param {string} input
     * @returns {Buffer}
     */
    function decode(input) {
      const buffer = decodeUnsafe(input);

      if (buffer) {
        return buffer;
      }

      throw new Error('Non-base' + BASE + ' character');
    }
  },
};
