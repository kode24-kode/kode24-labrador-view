Lab.View.Filters.content.external_feed_search = function(viewModel) {

    const articleSourceList = [
        {
            value: 'ritzau',
            text: 'Ritzau',
        }
    ];

    const articleSourceValue = viewModel.get('fields.articleSourceList') || '';
    articleSourceList.forEach((item) => {
        item.selected = item.value == articleSourceValue;
    });
    viewModel.setFiltered('articleSourceList', articleSourceValue);

    const siteList = []
    
    const siteIdValue = viewModel.get('fields.siteId') || '';
    siteList.forEach((item) => {
        item.selected = item.value == siteIdValue;
    });
    viewModel.setFiltered('siteId', siteIdValue);

    // For admin-view: Site-list
    // Todo: parent.Lab.Cache.sites may not be available on page draw ...
    let currentSiteId = viewModel.get('filtered.siteId') || 0;
    currentSiteId = parseInt(currentSiteId, 10);


    const sectionList = [
        { "key": "Indland", "value": 1 },
        { "key": "Udlandt", "value": 2 },
        { "key": "Kriminal", "value": 3 },
        { "key": "Politik", "value": 4 },
        { "key": "Article (finans)", "value": 5 },
        { "key": "Erhverv", "value": 6 },
        { "key": "Sport", "value": 7 },
        { "key": "Underholdning", "value": 8 },
        { "key": "Pressemedd.", "value": 13 },
        { "key": "Guidance (finans)", "value": 31 },
        { "key": "Estimat (finans)", "value": 32 },
        { "key": "Børskalender (finans)", "value": 33 },
        { "key": "Market commentary (finans)", "value": 34 },
        { "key": "Alert (finans)", "value": 39 },
        { "key": "Flash (finans)", "value": 40 },
        { "key": "Penge, Forbrug og Sundhed", "value": 48 },
        { "key": "Topweb (20)", "value": 1000 },
        { "key": "Prioterede nyheder (5)", "value": 1001 }
    ]

    console.log(sectionList);
    const sectionValue = viewModel.get('fields.sectionList') || '';
    sectionList.forEach((item) => {
        console.log(item);
        item.selected = item.value == sectionValue;
    });
    viewModel.setFiltered('sectionList', sectionValue);


    // Text-search
    const textSearch = viewModel.get('fields.textSearch');
    if (textSearch) {
        if (Lab.Util.String.isNumeric(textSearch)) { // ID-search
            viewModel.setFiltered('textSearch', `(id:(${  textSearch  })) AND`);
        } else {
            viewModel.setFiltered('textSearch', `(title:(${  textSearch  }) OR subtitle:(${  textSearch  }) OR bodytext:(${  textSearch  })) AND`);
        }
    } else {
        viewModel.setFiltered('textSearch', '');
    }

};
