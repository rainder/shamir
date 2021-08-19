// const exports = window.exports = window.exports ?? {};

var Shamir;
(function (Shamir) {
  const P = 2n ** 127n - 1n;
  const bigIntToUInt8Array = (int) => {
    const str0 = int.toString(16);
    const str = str0.padStart(Math.round(str0.length / 2) * 2, '0');
    const result = new Uint8Array(str.length / 2);
    for (let i = 0; i < result.length; i++) {
      result[i] = parseInt(str.slice(i * 2, i * 2 + 2), 16);
    }
    return result;
  };
  const uInt8ArrayToBigInt = (arr) => {
    let hex = '0x';
    for (let i = 0; i < arr.length; i++) {
      hex += arr[i].toString(16).padStart(2, '0');
    }
    return BigInt(hex);
  };
  const fn = (allNumbers, x) => {
    return allNumbers.reduce((r, item, index) => r + item * BigInt(x) ** BigInt(index), 0n);
  };
  const flipSign = (upper, lower) => (lower < 0 ? [-upper, -lower] : [upper, lower]);
  const createArray = (fill, length) => {
    return new Array(length).fill(fill);
  };

  function GCD(input) {
    const nums = [...input].sort((a, b) => (b > a ? -1 : b === a ? 0 : 1));
    const indexes = input.map((num) => nums.indexOf(num));
    const result = new Array(nums.length).fill(1n);
    for (let i = 1; i < nums.length; i++) {
      const a = nums[i - 1];
      const b = nums[i];
      if (nums[i - 1] % nums[i] === 0n) {
        const m = a / b;
        result[i] *= m;
        nums[i] *= m;
      } else {
        result[i] *= a;
        nums[i] *= a;
        for (let j = i - 1; j >= 0; j--) {
          result[j] *= b;
          nums[j] *= b;
        }
      }
    }
    return [nums[0], indexes.map((index) => result[index])];
  }

  const l = (availablePoints, n) => {
    const filteredPoints = availablePoints.filter((_, index) => index !== n);
    const upper = filteredPoints.reduce((r, i) => r * -i[1], 1n);
    const lower = filteredPoints.reduce((r, i) => r * (availablePoints[n][1] - i[1]), 1n);
    const a = availablePoints[n][2];
    const [b, c] = flipSign(upper, lower);
    return [a * b, c];
  };

  /**
   *
   * @param {Uint8Array} message
   * @param {number} shares
   * @param {number} quorum
   * @param {(length: number) => Uint8Array} randomBytes
   * @returns {Uint8Array[]}
   */
  function split(message, shares, quorum, randomBytes) {
    const id = randomBytes(4);
    const allNumbers = [
      uInt8ArrayToBigInt(message),
      ...createArray(0, quorum - 1).map(() => uInt8ArrayToBigInt(randomBytes(message.byteLength))),
    ];
    const result = createArray(0, shares).map((_, index) => {
      const a = index + 1;
      const b = bigIntToUInt8Array(fn(allNumbers, a));
      return [a, id, b];
    });
    const maxLength = Math.max(...result.map((item) => item[2].byteLength));
    return result.map(([a, id, b]) => {
      const padding = new Uint8Array(maxLength - b.byteLength);

      return Uint8Array.from([a, ...id, ...padding, ...b]);
    });
  }

  Shamir.split = split;

  /**
   *
   * @param {Uint8Array[]} shares
   * @returns {Uint8Array}
   */
  function recover(shares) {
    const availablePoints = shares.map((share) => {
      const a = BigInt(share[0]);
      const id = uInt8ArrayToBigInt(share.slice(1, 4)).toString(16);
      const b = uInt8ArrayToBigInt(share.slice(5));
      return [id, a, b];
    });
    if (new Set(availablePoints.map((item) => item[0])).size !== 1) {
      throw new Error('invalid share');
    }
    const equation = createArray(0, shares.length).map((_, index) => l(availablePoints, index));
    const [base, multipliers] = GCD(equation.map(([, divisor]) => divisor));
    const multiplied = equation.map(([a, b], index) => [a * multipliers[index], b * multipliers[index]]);
    const sum = multiplied.reduce((r, i) => r + i[0], 0n);
    const result = sum / base;
    return bigIntToUInt8Array(result);
  }

  Shamir.recover = recover;
})(Shamir = {});
