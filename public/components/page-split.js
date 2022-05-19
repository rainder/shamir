import { baseEncoding } from './base-encoding.js';

const baseUrl = (path) => {
  const url = new URL(top.location.href);
  url.hash = path;

  return url.toString();
};

export const mount = (app) => app.component('page-split', {
  template: `
    <div class="row d-print-none">
      <div class="col-6">
        <div class="mb-3">
          <label for="shares">Number of shares</label>
          <input type="number" id="shares" :min="numQuorum" v-model="numOfShares" class="form-control font-awesome"/>
        </div>
      </div>
      <div class="col-6">
        <div class="mb-3">
          <label for="quorum">Quorum</label>
          <input type="number" id="quorum" v-model="numQuorum" class="form-control font-awesome" :max="numOfShares"/>
        </div>
      </div>
    </div>

    <div class="mb-3 d-print-none">
      <label for="data">Secret data</label>
      <textarea id="data" v-model="data" class="form-control font-awesome" rows="5"></textarea>
    </div>

    <div class="mb-3 d-print-none">
      <label>
        <input type="checkbox" v-model="generateQRCodes"/>
        Generate QR codes
      </label>
    </div>

    <div class="mb-3 d-print-none" v-if="generateQRCodes">
      <label>
        <input type="checkbox" v-model="embedLinksIntoQRCodes"/>
        Embed recover URL into QR codes
      </label>
    </div>

    <div v-if="data">
      <hr class="my-3 d-print-none"/>

      <h5 class="d-print-none">Result</h5>
      <div class="row">
        <div class="col-12 col-xs-6 col-md-3
         
         
         text-center mb-3" v-for="share in shares">
          <div v-if="generateQRCodes">
            <qrcode v-if="embedLinksIntoQRCodes" :data="recoverUrl(share)"></qrcode>
            <qrcode v-else :data="share"></qrcode>
          </div>
          <textarea wrap="soft" readonly class="form-control font-awesome d-print-none" rows="5">{{ share }}</textarea>
        </div>
      </div>
    </div>
  `,
  data: () => ({
    data: '',
    numOfShares: 3,
    numQuorum: 2,
    shares: null,
    generateQRCodes: false,
    embedLinksIntoQRCodes: false,
  }),
  methods: {
    recoverUrl: (hex) => baseUrl(`/recover/${ hex }`),
    async splitSecret() {
      const encoded = new TextEncoder().encode(this.data);
      const encrypted = await encrypt(encoded);
      const shares = Shamir.split(encrypted, this.numOfShares, this.numQuorum, randomBytes);

      this.shares = shares.map((share) => baseEncoding.encode(share));
    },
  },
  watch: {
    data() {
      this.splitSecret();
    },
    numOfShares() {
      this.splitSecret();
    },
    numQuorum() {
      this.splitSecret();
    },
  },
});
