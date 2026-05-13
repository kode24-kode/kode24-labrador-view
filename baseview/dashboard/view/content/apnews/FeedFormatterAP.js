const FeedFormatterAP = {

    filterExternalData: (viewModel) => {
        var externalData = viewModel.get('external');
        if (!externalData) return;
        if (!externalData.feed) return;
        var dateHandler = new Labrador.Date.DateTime();
        for (const item of externalData.feed) {
            if (item.labFrontPublishedDate) {
                item.publishedString = dateHandler.timestampToNiceDate(Math.round(item.labFrontPublishedDate));
            }
        }

        // Store pagination URLs from AP API response
        viewModel.setFiltered("next_page_url", externalData.next_page || '');
        viewModel.setFiltered("previous_page_url", externalData.previous_page || '');

        var model = Lab.nodeController.getModelByLabId(viewModel.getLabId());
        if (!model) return;

        model.addPostInitHandler('.import_ap', {
            trigger: ['click'],
            param: null,
            fn: function(params, element) {
                const ap_id = element.getAttribute('data-ap-id');
                const domElement = document.querySelector(`.ap-${ ap_id }`);
                if (!domElement || !ap_id) {
                    Sys.logger.warn('Cannot find ap id or dom-element. Article will not import.');
                    return;
                }
                lab_api.v1.article.ui.import('apnews', ap_id);
            }
        });
    }

};
