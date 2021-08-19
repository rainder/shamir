export const mount = (app) => app.component('qrcode-scanner', {
  template: `
      <div class="ratio ratio-4x3">
        <video :id="videoId" style="width: 0; height: 0"></video>
        <canvas :id="canvasId"></canvas>
      </div>`,
  data: () => ({
    canvasId: `qrcode-scanner-canvas-${ uint8ArrayToHex(randomBytes(4)) }`,
    videoId: `qrcode-scanner-video-${ uint8ArrayToHex(randomBytes(4)) }`,
    active: true,
    stop: () => void 0,
  }),
  unmounted() {
    this.active = false;
    this.stop();
  },
  mounted() {
    const video = document.getElementById(this.videoId);
    const canvasElement = document.getElementById(this.canvasId);
    const canvas = canvasElement.getContext('2d');

    function drawLine(begin, end, color) {
      canvas.beginPath();
      canvas.moveTo(begin.x, begin.y);
      canvas.lineTo(end.x, end.y);
      canvas.lineWidth = 4;
      canvas.strokeStyle = color;
      canvas.stroke();
    }

    const tick = () => {
      if (!this.active) {
        return;
      }

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvasElement.height = video.videoHeight;
        canvasElement.width = video.videoWidth;
        canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
        const imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          drawLine(code.location.topLeftCorner, code.location.topRightCorner, '#ff3b58');
          drawLine(code.location.topRightCorner, code.location.bottomRightCorner, '#ff3b58');
          drawLine(code.location.bottomRightCorner, code.location.bottomLeftCorner, '#ff3b58');
          drawLine(code.location.bottomLeftCorner, code.location.topLeftCorner, '#ff3b58');

          setTimeout(() => {
            this.$emit('code', code.data);
          }, 500);

          return;
        }
      }

      requestAnimationFrame(tick);
    };

    // Use facingMode: environment to attemt to get the front camera on phones
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then((stream) => {
      video.srcObject = stream;
      video.setAttribute('playsinline', true); // required to tell iOS safari we don't want fullscreen
      video.play();
      requestAnimationFrame(tick);

      this.stop = () => stream.getTracks().forEach(function (track) {
        track.stop();
      });
    });
  },
});
