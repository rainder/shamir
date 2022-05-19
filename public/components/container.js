export const mount = (app) => app.component('container', {
  template: `
    <div class="container">
      <div class="py-4 mb-5">
        <div class="row">
          <div class="col">
            <h2 class="mb-4">Shamir's Secret Sharing</h2>
    
            <div class="card">
              <div class="card-header d-print-none">
                <ul class="nav nav-tabs card-header-tabs">
                  <li class="nav-item" v-for="page in pages">
                    <a class="nav-link" :class="{ active: page.id === currentPage }" href="#"
                       @click.prevent="currentPage = page.id">{{ page.title }}</a>
                  </li>
                </ul>
              </div>
              <div class="card-body">
                <div v-show="currentPage === 'split'">
                  <page-split/>
                </div>
                <div v-show="currentPage === 'recover'">
                  <page-recover :params="pageParams"/>
                </div>
                <div v-show="currentPage === 'about'">
                  <page-about/>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>  
  `,
  data: () => ({
    pageParams: [],
    currentPage: 'split',
    pages: [
      {
        id: 'split',
        title: 'Split',
      }, {
        id: 'recover',
        title: 'Recover',
      }, {
        id: 'about',
        title: 'About',
      },
    ],
  }),
  mounted() {
    const url = new URL(top.location.href);
    if (url.hash) {
      const [page, ...params] = url.hash.slice(1).split('/').filter((item) => item);

      this.currentPage = page;
      this.pageParams = params;

      history.replaceState({}, '', `${ url.pathname }${ url.search }#/${ page }`);
    }
  },
  watch: {
    currentPage: {
      immediate: false,
      handler(page) {
        const url = new URL(top.location.href);
        history.replaceState({}, '', `${ url.pathname }${ url.search }#/${ page }`);
      },
    },
  },
})
