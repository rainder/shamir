import { expect } from 'chai';
import { TextDecoder, TextEncoder } from 'util';
import { Shamir } from './shamir';

describe('shamir', () => {
  const bufferToBigInt = (input: ArrayBufferLike) => BigInt(`0x${Buffer.from(input).toString('hex')}`);

  const bigIntToHex = (int: bigint) => {
    const hex = int.toString(16);

    return hex.padStart(Math.round(hex.length / 2) * 2, '0');
  };

  function CDM(input: number[]): [number, number[]] {
    const nums = [...input].sort((a, b) => b - a);
    const indexes = input.map((num, index) => nums.indexOf(num));
    const result = new Array(nums.length).fill(1);

    for (let i = 1; i < nums.length; i++) {
      const a = nums[i - 1];
      const b = nums[i];

      if (nums[i - 1] % nums[i] === 0) {
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

  function pickRandomArrayItems<T>(arr: T[], count: number) {
    const source = [...arr];

    while (source.length > count) {
      source.splice(Math.floor(Math.random() * source.length), 1);
    }

    return source;
  }

  describe('CDM', () => {
    it('should 6,3,2', async () => {
      expect(CDM([6, 3, 2])).to.deep.equals([6, [1, 2, 3]]);
    });
    it('should 7,3,2', async () => {
      expect(CDM([7, 3, 2])).to.deep.equals([42, [6, 14, 21]]);
    });
    it('should 3,9,7', async () => {
      expect(CDM([3, 9, 7])).to.deep.equals([63, [21, 7, 9]]);
    });
  });

  describe('proof of concept', () => {
    it('should do the magic', async () => {
      const parts = 3;
      const split = 6;

      const randomNumbers = new Array(parts - 1).fill(0).map(() => Math.round(Math.random() * 10000));
      const allNumbers = [1234, ...randomNumbers];

      const fn = (x: number) => allNumbers.reduce((r, item, index) => r + item * x ** index, 0);

      const points = new Array(split).fill(0).map((item, index): [number, number] => {
        return [index + 1, fn(index + 1)];
      });

      const availablePoints = [...points];

      while (availablePoints.length > parts) {
        const index = Math.floor(availablePoints.length * Math.random());
        availablePoints.splice(index, 1);
      }

      const flipSign = (upper: number, lower: number) => {
        if (lower < 0) {
          return [-upper, -lower];
        }

        return [upper, lower];
      };

      const l = (n: number) => {
        const filteredPoints = availablePoints.filter((_, index) => index !== n);
        const upper = filteredPoints.reduce((r, i) => r * -i[0], 1);
        const lower = filteredPoints.reduce((r, i) => r * (availablePoints[n][0] - i[0]), 1);

        return [availablePoints[n][1], ...flipSign(upper, lower)];
      };

      const a1 = availablePoints.map((_, index) => {
        const [a, b, c] = l(index);

        return [a * b, c];
      }, 0);

      const [base, multipliers] = CDM(a1.map(([, divisor]) => divisor));
      const a2 = a1.map(([a, b], index) => [a * multipliers[index], b * multipliers[index]]);
      const result = a2.reduce((r, i) => r + i[0], 0) / base;

      console.log(base, multipliers);

      console.log(result);

      {
        // const P = 16127;
        const P = 1;
        const shares = availablePoints;

        const _extended_gcd = (a: number, b: number) => {
          // """
          // Division in integers modulus p means finding the inverse of the
          // denominator modulo p and then multiplying the numerator by this
          // inverse (Note: inverse of A is B such that A*B % p == 1) this can
          // be computed via extended Euclidean algorithm
          // http://en.wikipedia.org/wiki/Modular_multiplicative_inverse#Computation
          // """
          let x = 0;
          let last_x = 1;
          let y = 1;
          let last_y = 0;
          while (b != 0) {
            let quot = Math.floor(a / b);

            // a, b = b, a % b
            let tmpB = b;
            b = a % b;
            a = tmpB;

            // let x, last_x = last_x - quot * x, x
            // let y, last_y = last_y - quot * y, y
            let tmpX = x;
            x = last_x - quot * x;
            last_x = tmpX;

            // y, last_y = last_y - quot * y, y
            let tmpY = y;
            y = last_y - quot * y;
            last_y = tmpY;
          }
          return [last_x, last_y];
        };

        const _divmod = (num: number, den: number, p: number) => {
          // """Compute num / den modulo prime p

          // To explain what this means, the return value will be such that
          // the following is true: den * _divmod(num, den, p) % p == num
          // """
          const [inv] = _extended_gcd(den, p);

          return num * inv;
        };

        const sum = (arr: number[]) => {
          return arr.reduce((r, i) => r + i, 0);
        };

        const _lagrange_interpolate = (x = 0, x_s: number[], y_s: number[], p = P) => {
          const k = x_s.length;
          const PI = (vals: number[]) => {
            let accum = 1;
            for (const v of vals) {
              accum *= v;
            }
            return accum;
          };

          const nums: number[] = [];
          const dens: number[] = [];

          for (let i = 0; i < shares.length; i++) {
            const others = [...x_s];
            const curr = others[i];
            others.splice(i, 1);

            nums.push(PI(others.map((o) => x - o)));
            dens.push(PI(others.map((o) => curr - o)));
          }

          const den = PI(dens);
          console.log(nums);
          console.log(dens);

          const numsDivMod: number[] = new Array(k).fill(0).map((_, i) => {
            return _divmod((nums[i] * den * y_s[i]) % p, dens[i], p);
          });
          const num = numsDivMod.reduce((r, i) => r + i, 0);

          return (_divmod(num, den, p) + p) % p;
        };

        const recover_secret = (shares: [number, number][], prime = P) => {
          // """
          // Recover the secret from share points
          // (x, y points on the polynomial).
          // """
          if (shares.length < 2) {
            throw new Error('need at least two shares');
          }
          const x_s = shares.map((item) => item[0]);
          const y_s = shares.map((item) => item[1]);

          return _lagrange_interpolate(0, x_s, y_s, prime);
        };

        console.log(recover_secret(shares));
      }
    });

    it('should do the magic with bigint', async () => {
      const quorum = 3;
      const shares = 6;

      const randomizer = () => {
        let i = 1n;

        return (length: number) => {
          return Buffer.from(bigIntToHex(i++).padStart(length * 2, '0'), 'hex');
        };
      };

      const randomBytes2 = randomizer();

      const message = Buffer.from('Hello world!!!');

      const messageInt = bufferToBigInt(message);
      const randomNumbers = new Array(quorum - 1).fill(0).map(() => bufferToBigInt(randomBytes2(message.length)));
      const allNumbers = [messageInt, ...randomNumbers];

      const fn = (x: number): bigint =>
        allNumbers.reduce<bigint>((r, item, index) => r + item * BigInt(x) ** BigInt(index), 0n);

      const points = new Array(shares).fill(0).map((_, index) => {
        return [BigInt(index + 1), fn(index + 1)];
      });

      console.log(
        points.map(([seq, num]) => {
          return bigIntToHex(seq) + bigIntToHex(num);
        }),
      );

      const availablePoints = [...points];

      while (availablePoints.length > quorum) {
        const index = Math.floor(availablePoints.length * Math.random());
        availablePoints.splice(index, 1);
      }

      const flipSign = (upper: bigint, lower: bigint) => {
        if (lower < 0) {
          return [-upper, -lower];
        }

        return [upper, lower];
      };

      const l = (n: number) => {
        const filteredPoints = availablePoints.filter((_, index) => index !== n);
        const upper = filteredPoints.reduce((r, i) => r * -i[0], 1n);
        const lower = filteredPoints.reduce((r, i) => r * (availablePoints[n][0] - i[0]), 1n);

        return [availablePoints[n][1], ...flipSign(upper, lower)];
      };

      console.log(availablePoints);

      const a1 = availablePoints.map((_, index) => {
        const [a, b, c] = l(index);

        return [a * b, c];
      }, 0);

      const [base, multipliers] = Shamir.GCD(a1.map(([, divisor]) => divisor));
      const a2 = a1.map(([a, b], index) => [a * multipliers[index], b * multipliers[index]]);
      const result = a2.reduce((r, i) => r + i[0], 0n) / base;

      expect(result).to.equals(messageInt);
      console.log(Buffer.from(bigIntToHex(result), 'hex').toString());
    });
  });

  describe('UInt8Array', () => {
    const uInt8ArrayToBigInt = (arr: Uint8Array): bigint => {
      let hex = '0x';

      for (let i = 0; i < arr.length; i++) {
        hex += arr[i].toString(16).padStart(2, '0');
      }

      return BigInt(hex);
    };

    it('should ', async () => {
      const num = 123456789123455678653n;
      const hex = bigIntToHex(num);

      const bigInt = uInt8ArrayToBigInt(Buffer.from(hex, 'hex'));

      console.log(num);
      console.log(bigInt);
    });
  });

  describe('Shamir', () => {
    let i = 0;
    const randomBytes = (length: number): Uint8Array => {
      const buffer = Buffer.alloc(length);
      buffer[buffer.length - 1] = i++;

      return buffer;
      // return Uint8Array.from(crypto.randomBytes(length));
    };

    it('should split', async () => {
      const message = Buffer.from('Hello World!');

      const shares = Shamir.split(message, 6, 3, randomBytes);

      console.log(shares);
    });
    it('should recover', async () => {
      const quorum = 3;
      const numShares = 6;
      const message = new TextEncoder().encode('Hello world. I am here to stay. With love, Bitcoin.');

      const parts = Shamir.split(message, numShares, quorum, randomBytes);

      console.group('shares start');
      parts.forEach((item) => {
        console.log(Buffer.from(item).toString('hex'));
        // console.log(Base58.encode(Buffer.from(item)));
      });
      console.groupEnd();
      console.log('shares end');

      // const result = Shamir.recover(pickRandomArrayItems(parts, quorum));
      const result = Shamir.recover(pickRandomArrayItems(parts, quorum));

      expect(result).to.deep.equals(message);
      console.log(new TextDecoder().decode(result));
    });

    type Share = [number, number];

    it('should debug', async () => {
      const o = [1234, 166, 94];
      const shares: Share[] = [
        [1, 1494],
        [2, 1942],
        [3, 2578],
        [4, 3402],
        [5, 4414],
        [6, 5614],
      ];
      const items: Share[] = shares.slice(0, 3);

      const ls = [
        [1494, 6, 2],
        [1942, -3, 1],
        [2578, 2, 2],
      ];

      console.log([
        (ls[0][0] * ls[0][1]) / ls[0][2],
        (ls[1][0] * ls[1][1]) / ls[1][2],
        (ls[2][0] * ls[2][1]) / ls[2][2],
      ]);

      console.log([4482 + -5826 + 2578]);
    });

    it('should debug P', async function () {
      this.timeout(0);

      const p = 1613;
      const o = [1234, 166, 94];
      const shares: Share[] = [
        [1, 1494],
        [2, 329],
        [3, 965],
        [4, 176],
        [5, 1188],
        [6, 775],
      ];
      const items: Share[] = shares.slice(0, 3);

      const ls = [
        [1494, 6, 2],
        [329, 3, -1],
        [965, 2, 2],
      ];

      const extendedGCD = (a: number, b: number) => {
        let x = 0;
        let last_x = 1;
        let y = 1;
        let last_y = 0;

        while (b != 0) {
          const quot = Math.floor(a / b);
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

      const divmod = (num: number, den: number) => {
        const [inv, _] = extendedGCD(den, p);

        return num * inv;
      };

      const posMod = (a: number, b: number) => ((a % b) + b) % b;

      const ys = ls.map((i) => i[0]);
      const nums = ls.map((i) => i[1]);
      const dens = ls.map((i) => i[2]);
      const den = dens.reduce((r, i) => r * i, 1);

      const sum = ls
        .map((_, index) => {
          const a = nums[index] * den * ys[index];

          return divmod(posMod(a, p) + p, dens[index]);
        })
        .reduce((r, i) => r + i, 0);

      const result = posMod(divmod(sum, den), p);

      expect(result).to.equals(1234);
    });
  });
});
