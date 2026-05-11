Lab.View.Filters.content.apnews = function (viewModel) {

    var limit = viewModel.get("fields.limit") || 5;
    limit = parseInt(limit, 10);

    // For admin-view and box-title: Site-list
    var currentSiteId = viewModel.get("fields.site_id") || 0;
    currentSiteId = parseInt(currentSiteId, 10);
    var sites = [];

    var currentSiteAlias = '';
    var siteArr = Lab.conf.getSites();
    for (var i in siteArr) {
        var site = siteArr[i];
        if (currentSiteId === site.id) {
            currentSiteAlias = site.alias;
        }
        if (site.is_default) {
            var defaultSite = site;
        }
        sites.push({
            name: site.alias, value: site.id, selected: currentSiteId === site.id
        });
    }

    if (currentSiteAlias == '') {
        currentSiteAlias = defaultSite.alias;
    }
    viewModel.setFiltered("site_id_list", sites);
    viewModel.setFiltered('site_alias', currentSiteAlias);

    // Cursor-based pagination using next_page/previous_page URLs from AP API
    var pageNumber = viewModel.get("filtered.pageNumber") || 1;
    pageNumber = parseInt(pageNumber, 10);

    var nextPageUrl = viewModel.get("filtered.next_page_url") || '';
    var previousPageUrl = viewModel.get("filtered.previous_page_url") || '';

    var goNext = viewModel.get("filtered.next_page");
    viewModel.setFiltered("next_page", false);

    var goPrevious = viewModel.get("filtered.previous_page");
    viewModel.setFiltered("previous_page", false);

    var pageUrl = '';

    if (goNext && nextPageUrl) {
        pageUrl = nextPageUrl;
        pageNumber += 1;
    } else if (goPrevious && previousPageUrl) {
        pageUrl = previousPageUrl;
        pageNumber -= 1;
    }

    if (pageNumber < 1) pageNumber = 1;

    var currentCategory = viewModel.get("fields.category") || '';
    var categoryOptions = [
        { value: '',  name: 'All' },
        { value: 'a', name: 'Domestic/National news' },
        { value: 'i', name: 'International news' },
        { value: 's', name: 'Sports' },
        { value: 'f', name: 'Financial/Business' },
        { value: 'w', name: 'Washington/Politics' },
        { value: 'e', name: 'Entertainment' },
        { value: 'd', name: 'Food & diet' },
        { value: 'l', name: 'Lifestyles' },
        { value: 'p', name: 'Political copy' }
    ];
    viewModel.setFiltered("category_list", categoryOptions.map(function (opt) {
        return { value: opt.value, name: opt.name, selected: currentCategory === opt.value };
    }));

    var urgencyMin = parseInt(viewModel.get("fields.urgency_min"), 10) || 1;
    var urgencyMax = parseInt(viewModel.get("fields.urgency_max"), 10) || 4;
    if (urgencyMin > urgencyMax) urgencyMin = urgencyMax;

    viewModel.setFiltered("pageNumber", pageNumber);
    viewModel.setFiltered("limit", limit);
    viewModel.setFiltered("siteId", currentSiteId);
    viewModel.setFiltered("pageUrl", encodeURIComponent(pageUrl));
    viewModel.setFiltered("urgency", urgencyMin + "," + urgencyMax);
    viewModel.setFiltered("category", currentCategory);
};
