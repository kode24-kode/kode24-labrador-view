import { LazyloadHelper } from '../../lib/helpers/LazyloadHelper.js';

export default class Graphic {

    constructor(api) {
        this.api = api;
        this.lazyloadHelper = new LazyloadHelper(api);
    }

    onRender(model, view) {
        model.setFiltered('lazyloadImages', this.lazyloadHelper.check(model, view));

        const alignmentDesktop = model.get('fields.graphicAlignmentDesktop');
        const alignmentMobile = model.get('fields.graphicAlignmentMobile');

        const alignmentOptionsDesktop = [
            {
                value: '',
                name: 'Default alignment',
                selected: alignmentDesktop === ''
            }, 
            {
                value: 'Center',
                name: 'Centered',
                selected: alignmentDesktop === 'Center'
            }, 
            {
                value: 'Left',
                name: 'Align left',
                selected: alignmentDesktop === 'Left'
            }, 
            {
                value: 'Right',
                name: 'Align right',
                selected: alignmentDesktop === 'Right'
            }
        ];

        const alignmentOptionsMobile = [
            {
                value: '',
                name: 'Default alignment',
                selected: alignmentMobile === ''
            }, 
            {
                value: 'Center',
                name: 'Centered',
                selected: alignmentMobile === 'Center'
            }, 
            {
                value: 'Left',
                name: 'Align left',
                selected: alignmentMobile === 'Left'
            }, 
            {
                value: 'Right',
                name: 'Align right',
                selected: alignmentMobile === 'Right'
            }
        ];

        model.setFiltered('alignmentOptionsDesktop', alignmentOptionsDesktop);
        model.setFiltered('alignmentOptionsMobile', alignmentOptionsMobile);
    }

}
