window.Dac = window.Dac || {};

window.Dac.Definition = class {

    constructor(id) {
        this.id = id || 'mainArticleSection';
        this.article = document.getElementById(this.id);
        this.dfns = this.article ? this.article.querySelectorAll('dfn') : [];
        this.template = document.querySelector('template.definitionTemplate');
        this.openPopup = this.openPopup.bind(this);
        this.closePopup = this.closePopup.bind(this);
        this.setup();
    }

    setup() {
        this.dfns.forEach((dfn) => {
            dfn.addEventListener('click', this.openPopup);
            dfn.addEventListener('keydown', this.openPopup);
        });
    }

    closePopup() {
        const popup = document.querySelector('.definitionPopup');
        if (popup) {
            popup.remove();
        }
    }

    openPopup(event) {
        if (event.type === 'click' || (event.type === 'keydown' && event.key === 'Enter')) {
            event.stopPropagation();
            this.closePopup();

            let dfn;
            if (event.target.tagName === 'DFN') {
                dfn = event.target;
            } else if (event.target.tagName === 'SPAN' && event.target.parentElement.tagName === 'DFN') {
                dfn = event.target.parentElement;
            }

            if (this.template) {
                const clone = this.template.content.firstElementChild.cloneNode(true);

                if (dfn.parentNode.tagName === 'SPAN') {
                    dfn.parentNode.parentNode.style.position = 'relative'; // target grandparent paragraph instead
                } else {
                    dfn.parentNode.style.position = 'relative';
                }

                dfn.after(clone);
                const word = dfn.textContent;
                clone.querySelector('p').textContent = word;
                const info = dfn.getAttribute('title');
                clone.querySelector('span').textContent = info;

                clone.querySelector('button').addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.closePopup();
                });

                document.body.addEventListener('click', (e) => {
                    if (!clone.contains(e.target)) {
                        this.closePopup();
                    }
                });

                clone.style.display = 'flex';
                clone.style.top = `(${ dfn.offsetTop } + ${ dfn.offsetHeight } + 10)px`;
                const popup = document.querySelector('.definitionPopup');
                if (popup.clientWidth + dfn.offsetLeft < window.innerWidth) {
                    clone.style.left = `${ dfn.offsetLeft }px`;
                } else {
                    clone.style.left = '0.7rem';
                    clone.style.right = '0.7rem';
                }
            }
        }
    }

};
