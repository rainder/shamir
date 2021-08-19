export const load = async () => {
  const app = Vue.createApp({
    template: '<container/>',
  });

  await Promise.all([
    import('./components/container.js'),
    import('./components/page-split.js'),
    import('./components/page-recover.js'),
    import('./components/page-about.js'),
    import('./components/qrcode.js'),
    import('./components/qrcode-scanner.js'),
  ]).then((components) => {
    components.forEach((component) => {
      component.mount(app);
    });
  });

  return app;
};
