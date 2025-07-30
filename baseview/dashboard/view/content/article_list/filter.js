Lab.View.Filters.content.article_list = function(viewModel) {

    // For admin-view, author:
    const userQueryValue = viewModel.get('fields.userQuery') || '';
    const userQuery = [
        {
            value: '',
            text: 'Any user'
        },
        {
            value: '(has_published:me OR created_by:me) AND',
            text: 'Current user'
        }
    ];
    userQuery.forEach((item) => {
        item.selected = item.value == userQueryValue;
    });
    viewModel.setFiltered('userQuery', userQuery);

    // For admin-view, published-status
    const visibilityStatusValue = viewModel.get('fields.visibilityStatusQuery') || '';
    const visibilityStatusQuery = [
        {
            value: '',
            text: 'Any status'
        },
        {
            value: 'visibility_status:P AND',
            text: 'Published visible'
        },
        {
            value: 'visibility_status:H AND',
            text: 'Published hidden'
        },
        {
            value: '(visibility_status:H OR visibility_status:P) AND',
            text: 'Published visible or hidden'
        },
        {
            value: 'NOT visibility_status:P AND',
            text: 'Unpublished or Published hidden'
        },
        {
            value: 'NOT visibility_status:H AND NOT visibility_status:P AND',
            text: 'Unpublished'
        }
    ];
    visibilityStatusQuery.forEach((item) => {
        item.selected = item.value == visibilityStatusValue;
    });
    viewModel.setFiltered('visibilityStatusQuery', visibilityStatusQuery);

    // For admin-view, section
    const sectionValue = viewModel.get('fields.sectionQuery') || '';
    const sectionList = Lab.conf.get('tags.section');
    const sectionQuery = [
        {
            value: '',
            text: 'All'
        }
    ];
    for (let i = 0; i < sectionList.length; i++) {
        const value = `section:${  sectionList[i]  } AND`;
        sectionQuery.push({ value, text: sectionList[i], selected: value == sectionValue });
    }
    viewModel.setFiltered('sectionQuery', sectionQuery);

    // For admin-view: Site-list
    // Todo: parent.Lab.Cache.sites may not be available on page draw ...
    let currentSiteId = viewModel.get('fields.site_id') || 0;
    currentSiteId = parseInt(currentSiteId, 10);

    const sites = [{
        name: 'Any site',
        id: 0,
        selected: false,
        approvalSetup: {
            approved: {
                enable: true
            },
            proofRead: {
                enable: true
            },
            sentToDistribution: {
                enable: true
            },
            typeset: {
                enable: true
            }
        }
    }];

    // default setup
    viewModel.setFiltered('articleApprovalStatus', {
        approved: {
            enable: true
        },
        proofRead: {
            enable: true
        },
        sentToDistribution: {
            enable: true
        },
        typeset: {
            enable: true
        }
    });

    for (const site of Lab.Config.sites) {
        // Fetch article approval config for each site
        const siteApprovalSetup = lab_api.v1.config.get('articleApprovalStatus', { site: site.alias });

        sites.push({
            name: site.alias, value: site.id, selected: currentSiteId === site.id, approvalSetup: siteApprovalSetup
        });

        if (currentSiteId === site.id) {
            const articleApprovalStatus = lab_api.v1.config.get('articleApprovalStatus', { site: site.alias });
            viewModel.setFiltered('articleApprovalStatus', articleApprovalStatus);
        }

    }

    viewModel.setFiltered('site_id_list', sites);

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

    // Only display "approved" articles. (fields.lab_approved = true)
    const approvedOptions = [{
        value: '',
        text: 'Any status'
    }, {
        value: '1',
        text: 'Only approved'
    }, {
        value: '0',
        text: 'Only unapproved'
    }];
    const approved = viewModel.get('fields.approved');
    if (approved === '1') {
        viewModel.setFiltered('approved', 'lab_approved:1 AND');
        approvedOptions[1].selected = true;
    } else if (approved === '0') {
        viewModel.setFiltered('approved', 'NOT lab_approved:1 AND');
        approvedOptions[2].selected = true;
    } else {
        viewModel.setFiltered('approved', '');
        approvedOptions[0].selected = true;
    }
    viewModel.setFiltered('approvedOptions', approvedOptions);

    // Only display "proof read" articles. (fields.lab_proofRead = true)
    const proofReadOptions = [{
        value: '',
        text: 'Any status'
    }, {
        value: '1',
        text: 'Only proof read'
    }, {
        value: '0',
        text: 'Only not proof read'
    }];

    const proofRead = viewModel.get('fields.proofRead');
    if (proofRead === '1') {
        viewModel.setFiltered('proofRead', 'lab_proofRead:1 AND');
        proofReadOptions[1].selected = true;
    } else if (proofRead === '0') {
        viewModel.setFiltered('proofRead', 'NOT lab_proofRead:1 AND');
        proofReadOptions[2].selected = true;
    } else {
        viewModel.setFiltered('proofRead', '');
        proofReadOptions[0].selected = true;

    }
    viewModel.setFiltered('proofReadOptions', proofReadOptions);

    // Only display "proof read" articles. (fields.lab_proofRead = true)
    const sentToDistributionOptions = [{
        value: '',
        text: 'Any status'
    }, {
        value: '1',
        text: 'Only sent to distribution'
    }, {
        value: '0',
        text: 'Only not sent to distribution'
    }];

    const sentToDistribution = viewModel.get('fields.sentToDistribution');
    if (sentToDistribution === '1') {
        viewModel.setFiltered('sentToDistribution', 'lab_sentToDistribution:1 AND');
        sentToDistributionOptions[1].selected = true;
    } else if (sentToDistribution === '0') {
        viewModel.setFiltered('sentToDistribution', 'NOT lab_sentToDistribution:1 AND');
        sentToDistributionOptions[2].selected = true;
    } else {
        viewModel.setFiltered('sentToDistribution', '');
        sentToDistributionOptions[0].selected = true;
    }
    viewModel.setFiltered('sentToDistributionOptions', sentToDistributionOptions);

    // Only display "typeset" articles. (fields.lab_typeset = true)
    const typesetOptions = [{
        value: '',
        text: 'Any status'
    }, {
        value: '1',
        text: 'Only typeset'
    }, {
        value: '0',
        text: 'Only not typeset'
    }];

    const typeset = viewModel.get('fields.typeset');
    if (typeset === '1') {
        viewModel.setFiltered('typeset', 'lab_typeset:1 AND');
        typesetOptions[1].selected = true;
    } else if (typeset === '0') {
        viewModel.setFiltered('typeset', 'NOT lab_typeset:1 AND');
        typesetOptions[2].selected = true;
    } else {
        viewModel.setFiltered('typeset', '');
        typesetOptions[0].selected = true;

    }
    viewModel.setFiltered('typesetOptions', typesetOptions);

    // Tag-search
    let tagSearch = viewModel.get('fields.tagSearch');
    if (tagSearch) {
        tagSearch = tagSearch.replace(/,/g, ' ');
        viewModel.setFiltered('tagSearch', `tag:(${  tagSearch  }) AND`);
    } else {
        viewModel.setFiltered('tagSearch', '');
    }

    // Author-search
    const author = viewModel.get('fields.author');
    if (author) {
        viewModel.setFiltered('author', `(child.byline:(${ author }) OR created_by_name:(${ author })) AND`);
    } else {
        viewModel.setFiltered('author', '');
    }

    // Get image-server:
    viewModel.setFiltered('image_server', Lab.conf.getConfig('image_server'));

    // Get front-server:
    viewModel.setFiltered('customer_front_url', Lab.conf.getConfig('customer_front_url'));

    // Allow copying of articles?
    viewModel.setFiltered('showCopyButton', Lab.conf.get('showDashboardCopyButton'));

    // Paging.
    // Menu sets boolean "filtered.previous_page" and "filtered.next_page" on the node (non-persistent, outside "fields")
    // Use these flags to determin paging. Reset after read.
    let page = viewModel.get('filtered.page') || 0;
    page = parseInt(page, 10);
    let limit = viewModel.get('fields.limit') || 5;
    limit = parseInt(limit, 10);

    const previous_page = viewModel.get('filtered.previous_page');
    viewModel.setFiltered('previous_page', false);

    const next_page = viewModel.get('filtered.next_page');
    viewModel.setFiltered('next_page', false);

    if (previous_page) {
        page -= limit;
    }

    if (next_page) {
        page += limit;
    }

    if (page < 0) page = 0;

    viewModel.setFiltered('page', page);
    viewModel.setFiltered('pageNumber', (page / limit) + 1);

    // Sorting:
    viewModel.setFiltered('sortOrder', viewModel.getStructureModel().get('sortOrder') || 'desc'); // asc, desc
    viewModel.setFiltered('sortOrderBy', viewModel.getStructureModel().get('sortOrderBy') || 'created'); // created, published, modified

};
