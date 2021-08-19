export const mount = (app) => app.component('qrcode', {
  template: `<img v-if="src" :src="src" class="qrcode"/>`,
  props: ['data'],
  data: () => ({
    src: '',
  }),
  watch: {
    data: {
      immediate: true,
      handler() {
        QRCode.toDataURL(this.data, {
          errorCorrectionLevel: 'H',
        }).then((url) => this.src = url);
      },
    },
  },
});
