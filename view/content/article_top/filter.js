/**
 * Filter for article node model.
 * The responsibility of the filter is to manipulate data and / or do simple business logic.
 * The supplied viewModel contains raw data and setter for manipulated data (setFiltered).
 *
 * This file is available to customers and is shipped with default functionality.
 */



Lab.View.Filters.content.article_top = function (viewModel) {

	var pageTemplate = viewModel.getPage().getTemplatePath();

    if (viewModel.isEditMode()) {
        viewModel.setFiltered('editMode', true);
    } else {
        viewModel.setFiltered('editMode', false);
    }
    var structureModel = viewModel.getStructureModel();
    var metadata = structureModel.metadata;

    if (metadata && typeof metadata.show_image === 'undefined') {
        metadata.show_image = true;
    }

    if (viewModel.get('fields.published')) {
        //Set publishdate in different formats

        var published_date = moment(viewModel.get('fields.published'), "X");
        var published_modified = moment(viewModel.get('fields.published'), "X");
        var published_modified_list = viewModel.get("fields.last_published_by");

        if (published_modified_list) {
            var log = JSON.parse(published_modified_list);
            var lastEntry = log.pop();
            published_modified_list = moment(lastEntry[1], 'X');

            var timeModified = {
                iso: published_modified_list.toISOString(),
                human: published_modified_list.format("LLL"),
                basic: published_modified_list.format("YYYY-MM-DD")
            };

            viewModel.setFiltered("timeModified", timeModified);
		}

        viewModel.setFiltered("datePublished", {
            iso: published_date.toISOString(),
            human: published_date.format("LLL"),
            basic: published_date.format("YYYY-MM-DD")
        });

        viewModel.setFiltered("dateModified", published_modified.toISOString());
    }

    var url = viewModel.get('fields.published_url') || '';

    //Add lables
    var labels = [];

    // Get section
	var section = '';
	if (viewModel.getContentModel().data.primaryTags){
		section = viewModel.getContentModel().data.primaryTags.section;
	}

	// Get tagss
	var tags = '';
	if (viewModel.getContentModel().data.tags){
		tags = viewModel.getContentModel().data.tags;
	}

	var host = Lab.Runtime.Request.Headers.Host;
    var site = Lab.conf.getConfig("site").alias;

    if ((section === "kultur" || site === 'borsen') && tags.indexOf("meninger") > -1) {
        if (tags.indexOf("kommentar") > -1) {
            labels.push({ 'text': 'Kommentar', 'class': 'teal' });
        } else if (tags.indexOf("debattinnlegg") > -1) {
            labels.push({ 'text': 'Debattinnlegg', 'class': 'teal' });
        } else if (tags.indexOf("leder") > -1) {
            labels.push({ 'text': 'Leder', 'class': 'teal' });
        } else if (tags.indexOf("blogg") > -1) {
            labels.push({ 'text': 'Blogg', 'class': 'teal' });
        } else {
            labels.push({ 'text': 'Meninger', 'class': 'teal' });
        }
    } else if (section === "kultur" && tags.indexOf("arkivglimt") > -1) {
        labels.push({ 'text': 'Arkivglimt', 'class': 'green' });
    }

    var ia_section = '';
    if (section) {
        ia_section = section.charAt(0).toUpperCase() + section.slice(1);
    }

    viewModel.setFiltered('ia_section', ia_section);

    if (site === "default") {
        site = "dagbladet";
	}

	var disableDataFromNow = false;
	if (site === "borsen") {
		disableDataFromNow = true;
	}
	viewModel.setFiltered("disableDataFromNow", disableDataFromNow);

    if (viewModel.get("fields.published_url")) {
        if (host.indexOf("www.dagbladet.no") > -1 && viewModel.isEditMode() === false) {
            host = "https://www.dagbladet.no";
            viewModel.setFiltered("fb_share_url", "https://www.facebook.com/sharer.php?u=" + host + viewModel.get("fields.published_url"));
        } else if (host.indexOf("www.dinside.no") > -1 && viewModel.isEditMode() === false) {
            viewModel.setFiltered("fb_share_url", "https://www.facebook.com/sharer.php?u=" + "https://www.dinside.no" + viewModel.get("fields.published_url"));
        } else if (host.indexOf("www.seher.no") > -1 && viewModel.isEditMode() === false) {
            viewModel.setFiltered("fb_share_url", "https://www.facebook.com/sharer.php?u=" + "https://www.seher.no" + viewModel.get("fields.published_url"));
        } else if (host.indexOf("www.kk.no") > -1 && viewModel.isEditMode() === false) {
            viewModel.setFiltered("fb_share_url", "https://www.facebook.com/sharer.php?u=" + "https://www.kk.no" + viewModel.get("fields.published_url"));
        } else if (site === 'sol' && viewModel.isEditMode() === false) {
            viewModel.setFiltered("fb_share_url", "https://www.facebook.com/sharer.php?u=" + "https://sol.no" + viewModel.get("fields.published_url"));
        } else if (site === 'lommelegen' && viewModel.isEditMode() === false) {
			viewModel.setFiltered("fbHidden", true);
            // viewModel.setFiltered("fb_share_url", "https://www.facebook.com/sharer.php?u=" + "https://www.lommelegen.no" + viewModel.get("fields.published_url"));
        }
        else {
            viewModel.setFiltered("fb_share_url", "");
		}

		if (Lab.conf.getDevice() == 'amp' && site === 'lommelegen') {
			viewModel.setFiltered("datePublished", {
				iso: published_modified_list.toISOString(),
                human: published_modified_list.format("LLL"),
                basic: published_modified_list.format("YYYY-MM-DD")
			});
		}
    }

    viewModel.setFiltered("labels", labels);

    /* setting article top type */
    var nodeModel = structureModel.getNodeModel();
    var articleTopType = "";

    if (metadata && structureModel.metadata.article_top_type !== undefined) {
        articleTopType = structureModel.metadata.article_top_type;
    }

    if (site === "dinside" && articleTopType != "image_first") {
        articleTopType = "text_first";
    }

    //title first for all articles on Dagbladet (desktop) that are not ads or have manually set article top or full bleed image
    if ((site === "dagbladet" || site === 'seher')
        && Lab.conf.getDevice() === 'desktop'
        && tags.indexOf("annonse") < 0
        && (articleTopType === "" || articleTopType.indexOf("text_first") > -1)
        && viewModel.get("fields.articlTopTextFullBleed") !== "on") {
            articleTopType = 'text_first';
    }

    // Text First for batmagasinet and sol
    if (site === "batmagasinet" || site === "sol") {
        articleTopType = 'text_first';
    }

    if (Lab.conf.getDevice() == 'amp') {
        nodeModel.template = Lab.templates['content/article_top/templates/amp'];
    } else if (Lab.NodeData.fields.isSpesial === '1') {
        nodeModel.template = Lab.templates['content/article_top/templates/spesial'];
    } else {
        if (articleTopType === 'herounit') {
            nodeModel.template = Lab.templates['content/herounit/templates/default'];
        } else if (articleTopType === "text_first") {
			nodeModel.template = Lab.templates['content/article_top/templates/text_first'];
		} else if (articleTopType === "celebrity") {
			nodeModel.template = Lab.templates['content/article_top/templates/celeb_top'];
        } else {
            var templatePath = nodeModel.templatePath;
            nodeModel.template = Lab.templates[templatePath];
        }
    }
    /* end article top type */

    var domain = Lab.conf.getConfig("site").domain;
    if (domain.indexOf(":") > -1) {
        domain = domain.substr(domain.indexOf(":") + 1);
    }
    viewModel.setFiltered('domain', domain);

    viewModel.setFiltered('showMetadata', true);

    var width = [];
    if (viewModel.get('fields.articlTopWidth_json.small')) {
        width.push('small-' + viewModel.get('fields.articlTopWidth_json.small'));
    } else {
        width.push('small-12');
    }

    if (viewModel.get('fields.articlTopWidth_json.medium')) {
        width.push('medium-' + viewModel.get('fields.articlTopWidth_json.medium'));
    } else {
        width.push('medium-10');
    }

    if (viewModel.get('fields.articlTopWidth_json.large')) {
        width.push('large-' + viewModel.get('fields.articlTopWidth_json.large'));
    } else {
        width.push('large-8');
    }
    viewModel.setFiltered('articlTopWidth', width.join(' '));

    var align = [];
    if (viewModel.get('fields.articlTopAlign_json.small')) {
        align.push(viewModel.get('fields.articlTopAlign_json.small'));
    } else {
        align.push('');
    }

    if (viewModel.get('fields.articlTopAlign_json.medium')) {
        align.push(viewModel.get('fields.articlTopAlign_json.medium'));
    } else {
        align.push('medium-centered');
    }

    if (viewModel.get('fields.articlTopAlign_json.large')) {
        align.push(viewModel.get('fields.articlTopAlign_json.large'));
    } else {
        align.push('large-uncentered');
    }

    viewModel.setFiltered('articlTopAlign', align.join(' '));

    var textAlign = 'text-left';
    if (articleTopType === 'herounit') {
        textAlign = 'text-center';
    }
    if (viewModel.get('fields.articlTopTextAlign')) {
        textAlign = viewModel.get('fields.articlTopTextAlign');
    }
    viewModel.setFiltered('articlTopTextAlign', textAlign);

    if (viewModel.getContentModel().data.fields.isContentMarketing) {
        viewModel.setFiltered("isContentMarketing", true);
    }

    viewModel.setFiltered('isChecked', function () {
        return function (text, render) {
            text = text.split('|');
            if (viewModel.get(text[0]) == text[1]) {
                return 'checked';
            }
        };
    });

    if (articleTopType === 'herounit') {
        var herounitTextHorizontalPosition = structureModel.metadata.text_position_horizontal,
            herounitTextVerticalPosition = structureModel.metadata.text_position_vertical,
            vertical = 'vertical-bottom',
            horizontal = 'text-center';

        switch (herounitTextHorizontalPosition) {
            case 'left':
                horizontal = 'text-left';
                break;

            case 'center':
                horizontal = 'text-center';
                break;

            case 'right':
                horizontal = 'text-right';
                break;
        }

        switch (herounitTextVerticalPosition) {
            case 'top':
                vertical = 'vertical-top';
                break;

            case 'middle':
                vertical = 'vertical-center';
                break;

            case 'bottom':
                vertical = 'vertical-bottom';
                break;
        }

        viewModel.setFiltered('herounitVerticalTextPosition', vertical);
        viewModel.setFiltered('herounitHorizontalTextPosition', horizontal);

        if (viewModel.isEditMode() && viewModel.getStructureModel().getChildByType('image')) {
            Lab.structureController.addToRedrawQueue(viewModel.getStructureModel().getChildByType('image'), true);
        }
	}

    if (Lab.conf.getDevice() == 'amp') {
		var dateTitle = 'Publisert';
        var ampTitle = viewModel.get("fields.title") || "";
        var ampSubtitle = viewModel.get("fields.subtitle") || "";
        var ampIntro = viewModel.get("fields.intro") || "";

        ampTitle = ampTitle.replace(/(\sstyle=\"([^\"]+)?\"|\slede=\"([^\"]+)?\")/g, "").replace(/(<font[^>]+>|<\/font>)/g, "");
        ampSubtitle = ampSubtitle.replace(/(\sstyle=\"([^\"]+)?\"|\slede=\"([^\"]+)?\")/g, "").replace(/(<font[^>]+>|<\/font>)/g, "");
        ampIntro = ampIntro.replace(/(\sstyle=\"([^\"]+)?\"|\slede=\"([^\"]+)?\")/g, "").replace(/(<font[^>]+>|<\/font>)/g, "");

        viewModel.setFiltered("title", ampTitle);
        viewModel.setFiltered("subtitle", ampSubtitle);
        viewModel.setFiltered("intro", ampIntro);
        viewModel.setFiltered("isAmp", true);

		if (site === 'lommelegen') {
			dateTitle = 'Sist revidert'
		}
        viewModel.setFiltered("dateTitle", dateTitle);
        
        if(section === "kultur") {
            viewModel.setFiltered("title", dblab.removeTags.removeTagsFromString(ampTitle));
            viewModel.setFiltered("subtitle", dblab.removeTags.removeTagsFromString(ampSubtitle));
        }
    }

    var disclaimers = [];
    var TEXT_LABEL = {
        leder: {
            title: 'LEDER',
            text: 'Dette er en lederartikkel fra Dagbladet, og gir uttrykk for avisas syn. Dagbladets politiske redaktør svarer for lederartikkelen.',
            type: 'LEDER',
        },
        interne: {
            title: 'KOMMENTARER',
            text: 'Dette er en kommentar. Kommentaren gir uttrykk for skribentens holdning.',
            type: 'INTERN KOMMENTAR'
        },
        eksterne: {
            title: 'DEBATT',
            text: 'Dette er en debattartikkel. Analyse og standpunkt er skribentens egen.',
            type: 'EKSTERNT BIDRAG'
        }
    }

    if (section === "kultur") {
        if (tags.includes("leder1") && tags.includes("meninger")) {
            disclaimers.push(TEXT_LABEL.leder);
        } else if (tags.includes("meninger") && tags.includes("hovedkommentar")) {
            disclaimers.push(TEXT_LABEL.interne);
        } else if (tags.includes("meninger") && tags.includes("debatt")) {
            disclaimers.push(TEXT_LABEL.eksterne);
        }
        viewModel.setFiltered("disclaimers", disclaimers);
    }

    if (
        dblab.checkAbTestHeaders.checkAbTestCondition(viewModel, 'db-pluss-article-label') && 
        site === "dagbladet"
        ) {
		viewModel.setFiltered("showPlussLabel", false);
	} else {
        viewModel.setFiltered("showPlussLabel", true);
    }

    if (site === 'lommelegen') {
        viewModel.setFiltered('askDoctorUsual', true);
    }
};
