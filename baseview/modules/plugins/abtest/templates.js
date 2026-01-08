export default {
    ui: `<div class="lab-content lab-grid abtest-ui-container abtest-will-hide abtest-hidden{{ #displayArticleData }} abtest-article{{ /displayArticleData }}" data-ab-container="{{ id }}">
        <span class="abtest-close-btn labicon-remove" title="Close"></span>
        <ul class="abtest-tabs lab-list lab-grid-large-12">
            <li class="tab-variants-container lab-selected">Variants</li>
            {{ #displayTestData }}
                <li class="tab-tests-container">Settings</li>
                <li class="tab-test-results-container">Test results</li>
            {{ /displayTestData }}
        </ul>

        <div class="lab-formgroup lab-grid-large-{{ sizes.logo }} abtest-logo">
            <h3 class="lab-title labicon-ab_version">
                <strong>A/B testing for {{ type }} #{{ instanceOfId }}</strong>
                <span class="lab-ellipsis">{{{ title }}}</span>
                <a target="_blank" href="{{{ front }}}/a/{{ instanceOfId }}" class="lab-link">View{{ ^links.edit }} article{{ /links.edit }}</a> {{ #links.edit }}- <a target="_blank" href="/edit/article/id/{{ instanceOfId }}" class="lab-link">Edit</a>{{ /links.edit }}
                <span>
                    Estimated test time: <strong class="estimate-value">No estimate</strong>
                </span>
                <span>
                    <input type="button" value="Publish test" class="abtest-publish-btn lab-selected" title="Publish modifications to front-servers" disabled> &nbsp; 
                    <input type="button" value="Delete all" class="abtest-delete-btn" title="Delete test and variants for this article">
                    {{ #displayTestData }}
                        <br>
                        <input type="button" value="Reset test" class="abtest-reset-btn" title="Delete test for this article" disabled>
                        <input type="button" value="Start test" class="start-test-now-btn" title="Start the test using the selected variants" disabled>
                        <input type="button" value="End test" class="end-test-now-btn" title="End running AB test" disabled>
                    {{ /displayTestData }}
                </span>
            </h3>
        </div>


        <div class="lab-formgroup lab-grid-large-{{ sizes.variantsContainer }} lab-grid tests-container lab-hidden">            
            <div class="lab-formgroup lab-grid-large lab-grid test-info-container lab-valign-top">
                <h4 class="lab-title lab-grid-large-12 lab-grid-gap">A/B test for {{ type }}</h4>
                {{ #displayTestData }}
                    <div class="lab-formgroup-item lab-grid-gap lab-grid-large-4 lab-grid">
                        <div class="lab-formgroup-item lab-inline lab-grid-large-12 lab-grid">
                            <label for="test-is-published">Active</label>
                            <input type="checkbox" class="test-is-published" id="test-is-published">
                            <label class="name-label">- &nbsp;Status:</label>
                            <span class="test-status">{{ #test.status }}{{ test.status }}{{ /test.status }}{{ ^test.status }}Not started ...{{ /test.status }}</span>
                        </div>
                    </div>
                    <div class="lab-formgroup-item lab-grid-gap lab-grid-large-4 lab-grid">
                        <div class="lab-formgroup-item lab-grid-large-12 lab-grid">
                            <label class="name-label">Minimum increase in CTR to detect a winner</label>
                            <input type="range" class="min-variant-lift" min="10" max="50" step="1" value="{{ test.minVariantDifference }}" data-value="{{ test.minVariantDifference }}" oninput="event.target.setAttribute('data-value', event.target.value);">
                        </div>
                        <div class="lab-formgroup-item lab-grid-large-12 lab-grid test-test-method">
                            <label class="name-label">Test method</label>
                        </div>
                    </div>
                    <div class="lab-formgroup-item lab-grid-gap lab-grid-large-1 lab-grid"></div>
                    <div class="lab-formgroup-item lab-grid-gap lab-grid-large-3 lab-grid">
                        <div class="lab-formgroup-item lab-grid-large-12 lab-grid">
                            <label class="name-label" for="test-start-field-input">Test start time</label>
                            <input type="datetime-local" class="test-start-field" id="test-start-field-input" value="{{ test.start }}" placeholder="Start date (YYYY-MM-DD)">
                        </div>
                        <div class="lab-formgroup-item lab-grid-large-12 lab-grid">
                            <label class="name-label" for="test-end-field-input">Test end time</label>
                            <input type="datetime-local" class="test-end-field" id="test-end-field-input" value="{{ test.end }}" placeholder="End date (YYYY-MM-DD)">
                        </div>
                        <div class="lab-formgroup-item lab-grid-large-12 lab-grid">
                            <input type="button" class="set-test-now-btn" value="Now + 12 hours">
                        </div>
                    </div>
                {{ /displayTestData }}
    
                {{ ^displayTestData }}
                    <div class="lab-formgroup-item lab-grid-gap lab-grid-large-12 lab-grid">
                        <div class="abtest-text" style="flex-basis: auto;">A/B tests are added on the frontpage but will use the variants created here.</div>
                    </div>
                {{ /displayTestData }}
            </div>

        </div>

        <div class="lab-formgroup lab-grid-large-{{ sizes.variantsContainer }} lab-grid test-results-container lab-hidden">

            <div class="lab-formgroup lab-grid-large-12 results-container">
                No test results available yet. When enough data has been collected to determine a winning variant, the winner will be selected automatically as long as the A/B test is running and active.
                When the test period is over, only the original article will be shown.<br>
                <br>
                To continue to show the winning variant, make sure to keep the test running for as long as the article is present on the frontpage.
            </div>

        </div>

        <div class="lab-formgroup lab-grid-large-{{ sizes.variantsContainer }} lab-grid variants-container">

            <div class="lab-formgroup lab-grid-large-{{ sizes.variants }}">
                
                <h4 class="lab-title">Variants of {{ type }}</h4>

                <div class="variants lab-grid"><span class="lab-btn original">Original</span></div>

                <div class="lab-grid lab-bordered-top" style="padding-top: 14px;">
                    <input type="button" value="Duplicate selected" class="lab-btn lab-selected labicon-pluss_slim add-variant-btn" title="Add a variant based on the selected variant">
                    {{ ^displayArticleData }}<input type="button" value="Copy to original" class="lab-btn copy-to-orignal-btn" title="Use selected variant as original" style="margin-left: 0.5rem;" disabled>{{ /displayArticleData }}
                    <input type="button" value="Suggest" class="suggest-variant-btn" title="Get suggestions for variants" style="margin-left: auto;">
                    <input type="number" value="3" class="suggest-variant-count-btn" style="width: 50px; margin-left: 0.5rem;">
                </div>

                {{ ^displayArticleData }}<p class="lab-info lab-grid-large-12 lab-grid-gap lab-space-above-medium">Use the editor to modify variant details. All changes will be used in the test.</p>{{ /displayArticleData }}
            </div>

            <div class="lab-formgroup lab-grid-large-{{ sizes.selectedVariant }} lab-grid lab-valign-top">

                <h4 class="lab-title lab-grid-large-12 lab-grid-gap">Selected Variant{{ #displayArticleData }}<span class="abtest-helpertext-title"> - Click to edit text / image</span>{{ /displayArticleData }}</h4>

                {{ #displayArticleData }}
                <div class="lab-grid lab-grid-large-12 abtest-editables lab-grid-gap lab-bordered lab-autogrid" style="margin-bottom:14px; flex-wrap: nowrap;">
                    <div class="abtest-text" style="flex-basis: auto;">No variant added. Click the "Duplicate selected" button to create a variant based on the article.</div>
                    <div class="abtest-image"><div class="lab-empty-placeholder lab-color-light lab-bordered">
                        <div class="lab-inner">
                            <div class="lab-icon-large labicon-images"></div>
                        </div>
                    </div></div>
                </div>
                {{ /displayArticleData }}

                <div class="lab-formgroup-item lab-grid-gap lab-grid-large-{{ #displayArticleData }}4{{ /displayArticleData }}{{ ^displayArticleData }}12{{ /displayArticleData }} lab-grid">
                    <label class="name-label" for="variant-notes-field-input">Notes</label>
                    <textarea class="lab-grid-large-12 variant-notes-field" id="variant-notes-field-input" placeholder="Add notes here ...">{{ variant.notes }}</textarea>
                </div>

                <div class="lab-formgroup-item lab-grid-gap lab-inline lab-grid-large-{{ #displayArticleData }}5{{ /displayArticleData }}{{ ^displayArticleData }}12{{ /displayArticleData }}">
                    <label for="disable-variant-btn">Disabled</label>
                    <input type="checkbox" id="disable-variant-btn">
                    <button class="lab-btn labicon-delete delete-variant-btn" style="margin-left: auto;"> Delete variant</button>
                </div>

            </div>

        </div>

    </div>`,

    result: `<h2>Results</h2>
    <p>
        Article: <a href="/edit/article/id/{{ article.id }}" target="_blank">{{ article.id }}</a> <b>{{{ article.title }}}</b><br>
        Status: <b>{{ stats.status }}</b>. Winner: <b>{{ stats.winner }}</b>
    </p>
    <table class="lab-table lab-table-tight">
        <thead>
            <tr>
                <th>Name</th>
                <th>Score</th>
                <th>Views</th>
                <th>Clicks</th>
            </tr>
        </thead>
        <tbody>
        {{ #data }}
            <tr>
                <td>{{ name }}</td>
                <td title="{{ score }}">{{ scoreNice }}</td>
                <td>{{ views }}</td>
                <td>{{ clicks }}</td>
            </tr>
        {{ /data }}
        </tbody>
    </table>
    `
};
