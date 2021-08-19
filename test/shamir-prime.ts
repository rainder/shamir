export namespace Shamir {
  console.time('p');
  const P = 2n ** 9941n - 1n;
  console.timeEnd('p');

  export const bigIntToUInt8Array = (int: bigint): Uint8Array => {
    const str0 = int.toString(16);
    const str = str0.padStart(Math.round(str0.length / 2) * 2, '0');
    const result = new Uint8Array(str.length / 2);

    for (let i = 0; i < result.length; i++) {
      result[i] = parseInt(str.slice(i * 2, i * 2 + 2), 16);
    }

    return result;
  };

  const uInt8ArrayToBigInt = (arr: Uint8Array): bigint => {
    let hex = '0x';

    for (let i = 0; i < arr.length; i++) {
      hex += arr[i].toString(16).padStart(2, '0');
    }

    return BigInt(hex);
  };

  const fn = (allNumbers: bigint[], x: number): bigint => {
    return allNumbers.reduce<bigint>((r, item, index) => r + item * BigInt(x) ** BigInt(index), 0n);
  };

  const createArray = <T>(fill: T, length: number): T[] => {
    return new Array(length).fill(fill);
  };

  export function GCD(input: bigint[]): [bigint, bigint[]] {
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

  const l = (availablePoints: [string, bigint, bigint][], n: number): [bigint, bigint, bigint] => {
    const filteredPoints = availablePoints.filter((_, index) => index !== n);
    const num = filteredPoints.reduce((r, i) => r * -i[1], 1n);
    const den = filteredPoints.reduce((r, i) => r * (availablePoints[n][1] - i[1]), 1n);
    const a = availablePoints[n][2];

    return [a, num, den];
  };

  const extendedGCD = (a: bigint, b: bigint): [bigint, bigint] => {
    let x = 0n;
    let last_x = 1n;
    let y = 1n;
    let last_y = 0n;

    while (b != 0n) {
      const quot = a / b;
      const [tb, tx, ty] = [b, x, y];

      b = posMod(a, b);
      a = tb;
      x = last_x - quot * x;
      last_x = tx;
      y = last_y - quot * y;
      last_y = ty;
    }

    return [last_x, last_y];
  };

  const divmod = (num: bigint, den: bigint): bigint => {
    const [inv, _] = extendedGCD(den, P);

    return num * inv;
  };

  const posMod = (a: bigint, b: bigint) => ((a % b) + b) % b;

  /**
   *
   * @param {Uint8Array} message
   * @param {number} shares
   * @param {number} quorum
   * @param {(length: number) => Uint8Array} randomBytes
   * @returns {Uint8Array[]}
   */
  export function split(
    message: Uint8Array,
    shares: number,
    quorum: number,
    randomBytes: (length: number) => Uint8Array,
  ): Uint8Array[] {
    const id = randomBytes(4);
    const allNumbers = [
      uInt8ArrayToBigInt(message),
      ...createArray(0, quorum - 1).map(() => uInt8ArrayToBigInt(randomBytes(message.byteLength))),
    ];

    const result = createArray(0, shares).map((_, index): [number, Uint8Array, Uint8Array] => {
      const a = index + 1;
      const b = bigIntToUInt8Array(fn(allNumbers, a) % P);

      {
        const e = fn(allNumbers, a);
        const b = P;
        console.log(e % P === e);
      }

      return [a, id, b];
    });

    const maxLength = Math.max(...result.map((item) => item[2].byteLength));

    return result.map(([a, id, b]) => {
      const padding = new Uint8Array(maxLength - b.byteLength);

      return Uint8Array.from([a, ...id, ...padding, ...b]);
    });
  }

  /**
   *
   * @param {Uint8Array[]} shares
   * @returns {Uint8Array}
   */
  export function recover(shares: Uint8Array[]): Uint8Array {
    const availablePoints = shares.map((share): [string, bigint, bigint] => {
      const a = BigInt(share[0]);
      const id = uInt8ArrayToBigInt(share.slice(1, 4)).toString(16);
      const b = uInt8ArrayToBigInt(share.slice(5));

      return [id, a, b];
    });

    if (new Set(availablePoints.map((item) => item[0])).size !== 1) {
      throw new Error('invalid share');
    }

    const equation = createArray(0, shares.length).map((_, index) => l(availablePoints, index));

    // const [base, multipliers] = GCD(equation.map(([, divisor]) => divisor));
    // const multiplied = equation.map(([a, b], index) => [a * multipliers[index], b * multipliers[index]]);
    // const sum = multiplied.reduce((r, i) => r + i[0], 0n);
    // const result = sum / base;

    const ys = equation.map((i) => i[0]);
    const nums = equation.map((i) => i[1]);
    const dens = equation.map((i) => i[2]);
    const den = dens.reduce((r, i) => r * i, 1n);

    const sum = equation
      .map((_, index) => {
        const a = nums[index] * den * ys[index];

        return divmod(posMod(a, P) + P, dens[index]);
      })
      .reduce((r, i) => r + i, 0n);

    const result = posMod(divmod(sum, den), P);

    return bigIntToUInt8Array(result);
  }
}
