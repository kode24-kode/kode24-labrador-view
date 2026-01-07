export class BrowserFeed {

    constructor(params) {
        this.target = params.target;
        this.observer = null;
        this.request = {
            type: params.type || 'fragment', // 'fragment'. Type of url to fetch. 'fragment' = Labrador Fragment API
            pageId: params.pageId, // Required for type=fragment
            contentType: params.contentType || 'row', // Required for type=fragment
            contentCount: params.contentCount || 4, // Required for type=fragment
            apiUrl: params.apiUrl // Required for type=fragment
        };
        this.state = {
            isFetching: false,
            page: 0,
            currentElement: this.target,
            isDebug: params.isDebug || false
        };
        this.log(`Instance ready, this.request: ${ JSON.stringify(this.request, null, 4) }`);
        this.registerListener();
    }

    log(message, override = false) {
        if (this.state.isDebug || override) {
            console.log(`[BrowserFeed] ${ (message && typeof message === 'object') ? JSON.stringify(message, null, 4) : message }`);
        }
    }

    registerListener() {
        this.log('+ Registering intersection observer for current element ...');
        if (!this.observer) {
            const options = {
                root: null,
                rootMargin: '500px'
                // threshold: [0, 0.5, 1]
            };
            this.observer = new IntersectionObserver((entries, theObserver) => {
                for (const entry of entries) {
                    if (entry.target === this.state.currentElement) {
                        this.log(`IntersectionObserver triggered. Intersecting: ${ entry.isIntersecting }, ratio: ${ entry.intersectionRatio }`);
                        if (entry.isIntersecting) {
                            this.requestContent();
                        }
                    }
                }
            }, options);
        }
        this.observer.observe(this.state.currentElement);
    }

    requestContent() {
        if (this.state.isFetching) {
            return;
        }
        this.state.isFetching = true;
        this.updatePager();
        const url = this.getUrl();

        this.log(`Request content for url: ${ url }`);

        this.log('- Unregistering intersection observer for current element ...');
        this.observer.unobserve(this.state.currentElement);

        fetch(url).then((response) => response.text()).then((content) => {
            this.state.isFetching = false;
            if (!content) {
                this.log('No content, aborting ...');
                return;
            }
            const documentFragment = document.createRange().createContextualFragment(content);
            this.log(`Will append elements: ${ documentFragment.children.length }`);

            while (documentFragment.children.length > 0) {
                this.target.appendChild(documentFragment.children[0]);
            }
            this.state.currentElement = this.target.lastElementChild;
            this.registerListener();
        });
    }

    updatePager() {
        this.state.page++;
    }

    getUrl() {
        if (this.request.type === 'fragment') {
            // api.example.com/fragment/structure/?pageId=100233&structureType=row&start=0&count=2
            const start = this.state.page > 1 ? (this.state.page - 1) * this.request.contentCount : 0;
            return `${ this.request.apiUrl }/fragment/structure/?pageId=${ this.request.pageId }&structureType=${ this.request.contentType }&start=${ start }&count=${ this.request.contentCount }`;
        }
        return null;
    }

}
