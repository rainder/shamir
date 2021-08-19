import { baseEncoding } from './base-encoding.js';

export const mount = (app) => app.component('page-recover', {
  props: ['params'],
  template: `
        <div class="mb-3" v-for="num in numOfShares">
        <div class="row">
          <div class="col-sm-8 col-12">
            <label :for="\`share-\${num}\`">Share #{{ num }}</label>
            <div class="input-group">
              <input type="text" :id="\`share-\${num}\`" v-model="shares[num - 1]" class="form-control font-awesome"/>
              <button class="btn btn-outline-secondary" v-if="shares[num - 1]" @click="deleteItem(num - 1)">
                ⤫
              </button>
            </div>
          </div>

          <template v-if="shares[num - 1]">
            <div class="col-sm-2 col-6">
              <label>&nbsp</label>
              <div class="input-group">
                <div class="input-group-text">ID</div>
                <input type="text" class="form-control font-awesome" readonly :value="extractID(shares[num - 1])"
                       :class="{ 'is-invalid' : extractID(shares[num - 1]) !== extractID(shares[0]) }">
              </div>
            </div>
            <div class="col-sm-2 col-6">
              <label>&nbsp</label>
              <div class="input-group">
                <div class="input-group-text">SEQ</div>
                <input type="text" class="form-control font-awesome" readonly :value="extractSeq(shares[num - 1])">
              </div>
            </div>
          </template>
          <template v-else>
            <div class="col-sm-4" v-if="!success">
              <label>&nbsp</label>
              <div class="text-end text-sm-start">
                <button class="btn btn-secondary" :disabled="success" @click="scanQRCode()">
                  <template v-if="!scanningQRCode">Scan QR Code</template>
                  <template v-else>Cancel</template>
                </button>
              </div>
              <div class="py-3" v-if="scanningQRCode">
                <qrcode-scanner @code="processQRCodeData($event)"/>
              </div>
            </div>
          </template>
        </div>
        </div>

        <div v-if="shares.length">
        <h5>Secret data</h5>
        <div class="mb-3">
          <textarea v-model="result" readonly class="form-control font-awesome" rows="10"
                    :class="{ 'border-success':success, 'border-danger':!success }"></textarea>
        </div>
        </div>


      `,
  data: () => ({
    success: false,
    result: '',
    shares: [],
    scanningQRCode: false,
  }),
  methods: {
    processQRCodeData(data) {
      const urlMatch = data.match(/#\/recover\/([^/]+)/);

      if (urlMatch) {
        this.shares.push(urlMatch[1]);
      } else {
        this.shares.push(data);
      }

      this.scanningQRCode = false;
    },
    scanQRCode() {
      this.scanningQRCode = !this.scanningQRCode;
    },
    deleteItem(index) {
      this.shares.splice(index, 1);
    },
    extractID(tok) {
      return uint8ArrayToHex(baseEncoding.decode(tok).slice(1, 5));
    },
    extractSeq(tok) {
      return uint8ArrayToHex(baseEncoding.decode(tok).slice(0, 1));
    },
    async recover() {
      try {
        const shares = this.shares.filter((item) => !!item).map((shareHex) => baseEncoding.decode(shareHex));
        const recovered = Shamir.recover(shares);
        const decrypted = await decrypt(recovered);

        this.result = new TextDecoder().decode(decrypted);
        this.success = true;
      } catch (e) {
        this.result = `Error decoding: ${ e.message }\n\nInvalid shares or quorum is not satisfied? Try adding another share.`;
        this.success = false;
      }
    },
  },
  computed: {
    numOfShares() {
      return this.sharesLength + (this.success ? 0 : 1);
    },
    sharesLength() {
      return this.shares?.length ?? 0;
    },
  },
  watch: {
    shares: {
      deep: true,
      immediate: true,
      handler() {
        for (let i = this.sharesLength - 1; i >= 0; i--) {
          if (this.shares[i]) {
            break;
          }

          this.shares.splice(i, 1);
        }

        this.recover();
        // sessionStorage.setItem('shares', JSON.stringify(this.shares));
      },
    },
    params(params) {
      if (params) {
        params.forEach((param) => {
          if (this.shares.some((item) => item === param)) {
            return;
          }

          this.shares[this.shares.length] = param;
        });
      }
    },
  },
});
