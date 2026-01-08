/**
 *  Documentation
 *  https://docs.cypress.io/app/get-started/why-cypress
 */
import 'cypress-real-events';
/* eslint-disable no-undef */

const bodytext = `The old adage about the interregnum between an election and an inauguration is that there is only one president at a time. Try telling that to the rest of the world now. \nWhile one president, the one actually still living in the White House, attends international summit meetings and brokers a Middle East cease-fire to cap his tenure, another president, the one who has not actually taken office yet, is busy conducting a foreign policy of his own from his Spanish-tiled Florida estate.`;

const baseUrl = Cypress.env('baseUrl') || 'labrador-e2e-test.labdevs.com';
const urlTagPage = 'https://forskning--www-e2e-test.labdevs.com/tag/';
const AuthUsername = Cypress.env('username') || 'labrador';
const AuthPassword = Cypress.env('password') || '8zEsiJebBzG9E2Z';
const githubDescription = Cypress.env('description') || 'Cypress E2E test';
const githubPullRequestId = Cypress.env('pullRequestId') || '-';
const getCurrentTimeStamp = new Date().getTime().toString();
const currentDate = new Date().toJSON();
/*
const formatDate = (date) => {
    const d = new Date(date);
    const day = (`0${d.getDate()}`).slice(-2);
    const month = (`0${d.getMonth() + 1}`).slice(-2);
    const year = d.getFullYear();
    const hours = (`0${d.getHours()}`).slice(-2);
    const minutes = (`0${d.getMinutes()}`).slice(-2);
    return `${day}.${month} ${year} - ${hours}:${minutes}`;
};*/

//const formattedDate = formatDate(currentDate);
let getCurrentArticleUrl = '';
const articleTitle = `PR ${ githubPullRequestId }: ${ currentDate }`;

// Create a buffer from the username and password
const authString = `${ AuthUsername }:${ AuthPassword }`;
const buf = Buffer.from(authString);
const base64Auth = buf.toString('base64');

const labSession = Cypress.env('session') || 'ecdad5077867e4b62770c2b23a28a182';

const headers = {
    Authorization: `Basic ${ base64Auth }`,
    Cookie: `LABACTIVE=1; LABSESSID=${ labSession };`
};

const ifElementExistsClick = async(element) => {
    cy.get('body').then((body) => {
        if (body.find(element).length > 0) {
            cy.get(element).click();
        }
    });
};

// Custom command to get into the iframe's body
Cypress.Commands.add('getIframeBody', (iframeSelector) => cy
    .get(iframeSelector)
    .its('0.contentDocument.body')
    .should('not.be.empty')
    .then(cy.wrap));

Cypress.Commands.add('dropToArea', (iframeSelector, dragLocator, dropLocator) => cy
    .get(iframeSelector)
    .its('0.contentDocument.body')
    .should('not.be.empty')
    .then(cy.wrap)
    .then(() => {
        cy.get(dragLocator)
            .realMouseDown({ button: 'left', position: 'center' })
            .realMouseMove(0, 10, { position: 'center' })
            .wait(200);
        cy.get(dropLocator)
            .realMouseMove(0, 0, { position: 'center' })
            .realMouseUp();
    }));

// Custom command to wait for an interception
function waitForInterception(requestMethod, requestUrl, timeout = 60000) {
    cy.intercept(requestMethod, requestUrl).as('interception');
    return cy.wait('@interception', { timeout });
}

describe('Create a new article', () => {
    it('Should visit dashboard, create a new article, modify fields, open article settings to modify section and publish article', () => {
        cy.request({
            method: 'POST',
            url: `https://${ baseUrl }`,
            headers
        }).then(async() => {
            // Log in to dashboard
            await cy.visit({
                url: `https://${ baseUrl }/login`,
                headers,
                auth: {
                    username: AuthUsername,
                    password: AuthPassword
                }
            });

            // Navigate in Dashboard to create a new article
            await cy.viewport('macbook-16');
            await cy.get('#loginForm > li:nth-child(1) > a').click();
            await cy.get('#lab-application-menu').invoke('addClass', 'labFn-open');
            await cy.get('#lab-application-menu > section > div:nth-child(1) > ul:nth-child(2) > li:nth-child(3) > span').click();
            await cy.get('div > div.lab-modal-content > div > div > div:nth-child(1) > label > select').select('2');
            await cy.get('input[type="submit"]').click();

            // Go to the new article
            await waitForInterception('POST', '/ajax/user-settings/set-field');

            // Overwrite title
            await cy.getIframeBody('iframe[data-lab-viewport="desktop"]')
                .find('.articleHeader > h1')
                .should('contain.text', 'Default E2E')
                .click({ force: true })
                .invoke('text', articleTitle);

            // Go to article setting to change section
            await cy.get('li[data-collection="no-collection"]:visible').eq(0).click();
            await cy.get('#sections').select('e2e');
            await cy.get('#closeBtn').click();

            // Overwrite bodytext
            await cy.getIframeBody('iframe[data-lab-viewport="desktop"]')
                .find('.bodytext')
                .click({ force: true })
                .invoke('addClass', 'lab-editActive')
                .invoke('attr', 'contenteditable', 'true')
                .invoke('attr', 'data-is-bodytext', '1')
                .invoke('attr', 'data-lab-is-editing', '1')
                .invoke('removeAttr', 'disabled')
                .type(githubDescription, { force: true });

            await cy.get('div.lab-collection-drawer')
                .invoke('addClass', 'lab-is-expanded');

            // Publish article
            await cy.get('li.lab-publish-btn span').click();
            await cy.get('input[value="Publish"]').click();

            // Go to the article
            await waitForInterception('POST', '/ajax/publish/save-article');
            await cy.get('.lab-item-content').contains('Go to').click();
            await cy.get('.lab-item-content').contains('Published Page').click();
            // Log the current URL
            await cy.url().then((url) => {
                cy.task('log', `Current URL: ${ url }`);
            });

        });
    });
});

describe('Create a new article with a tag, publish and check if exists in tagboard, delete tag, check if doesnt exist i tag board', () => {
    it('Should visit dashboard, create a new article, modify fields, open article settings to modify section, modify tags, and publish article', () => {
        cy.request({
            method: 'POST',
            url: `https://${ baseUrl }`,
            headers
        }).then(async() => {
            // Log in to dashboard
            await cy.visit({
                url: `https://${ baseUrl }/login`,
                headers,
                auth: {
                    username: AuthUsername,
                    password: AuthPassword
                }
            });

            // Navigate in Dashboard to create a new article
            await cy.viewport('macbook-16');
            await cy.get('#loginForm > li:nth-child(1) > a').click();
            await cy.get('#lab-application-menu').invoke('addClass', 'labFn-open');
            await cy.get('#lab-application-menu > section > div:nth-child(1) > ul:nth-child(2) > li:nth-child(3) > span').click();
            await cy.get('div > div.lab-modal-content > div > div > div:nth-child(1) > label > select').select('2');
            await cy.get('input[type="submit"]').click();

            // Go to the new article
            await waitForInterception('POST', '/ajax/user-settings/set-field');

            // Overwrite title
            await cy.getIframeBody('iframe[data-lab-viewport="desktop"]')
                .find('.articleHeader > h1')
                .should('contain.text', 'Default E2E')
                .click({ force: true })
                .invoke('text', articleTitle);

            // Go to article setting to change section
            await cy.get('li[data-collection="no-collection"]:visible').eq(0).click();
            await cy.get('#sections').select('e2e');
            await cy.get('#closeBtn').click();

            // Add tags
            await cy.get('li[data-collection="no-collection"]:visible').eq(0).click();

            // Add common tag 'cypress'
            await cy.get('input[placeholder="Add tag ..."]').type('cypress');
            await cy.get('div[class="lab-tags-suggestions"]').click();
            ifElementExistsClick('input[id="add_btn"');

            // Add unique tag with [timestamp]
            await cy.get('input[placeholder="Add tag ..."]').type(getCurrentTimeStamp);
            await cy.get('div[class="lab-tags-suggestions"]').click();
            ifElementExistsClick('input[id="add_btn"');

            // Add unique tag with [timestamp]_deletable
            await cy.get('input[placeholder="Add tag ..."]').type(`${ getCurrentTimeStamp }_deletable`);
            await cy.get('div[class="lab-tags-suggestions"]').click();
            ifElementExistsClick('input[id="add_btn"');

            await cy.get('#closeBtn').click();
            await cy.url().then((url) => {
                [, getCurrentArticleUrl] = url.split('.com');
            });

            // Overwrite bodytext
            await cy.getIframeBody('iframe[data-lab-viewport="desktop"]')
                .find('.bodytext')
                .click({ force: true })
                .invoke('addClass', 'lab-editActive')
                .invoke('attr', 'contenteditable', 'true')
                .invoke('attr', 'data-is-bodytext', '1')
                .invoke('attr', 'data-lab-is-editing', '1')
                .invoke('removeAttr', 'disabled')
                .type(githubDescription, { force: true });

            await cy.get('div.lab-collection-drawer')
                .invoke('addClass', 'lab-is-expanded');

            // Publish article
            await cy.get('li.lab-publish-btn span').click();
            await cy.get('input[value="Publish"]').click();

            // Go to the article
            await waitForInterception('POST', '/ajax/publish/save-article');
            // Log the current URL
            await cy.url().then((url) => {
                cy.task('log', `Current URL: ${ url }`);
            });
        });
    });
    it('Check if tag article is in the tag page', () => {
        Cypress.on('uncaught:exception', () => false);
        cy.visit(`${ urlTagPage }${ getCurrentTimeStamp }_deletable`);
        cy.get('h2').contains(articleTitle).should('be.visible');
    });
    it('Should visit dashboard, find new tag article, remove the tag workshop,', () => {
        cy.request({
            method: 'POST',
            url: `https://${ baseUrl }`,
            headers
        }).then(async() => {
            await cy.visit({
                url: `https://${ baseUrl }/login`,
                headers,
                auth: {
                    username: AuthUsername,
                    password: AuthPassword
                }
            });

            // Navigate in Dashboard to open admin
            await cy.viewport('macbook-16');
            await cy.get('#loginForm > li:nth-child(1) > a').click();
            await cy.getIframeBody('iframe[id="lab-cms-viewport-desktop"]')
                .find(`div.article > a[href="${ getCurrentArticleUrl }"]`)
                .invoke('attr', 'target', '_parent')
                .click();
            await waitForInterception('POST', '/ajax/user-settings/set-field');

            // remove tag
            await cy.get('li[data-collection="no-collection"]:visible').eq(0).click();
            await cy.get('div[class="lab-label lab-tag lab-deletable labicon-remove labicon-status"]').contains(`${ getCurrentTimeStamp }_deletable`).click();
            await cy.get('#closeBtn').click();

            // publish article
            await cy.get('li.lab-publish-btn span').click();
            await ifElementExistsClick('input[value="Publish"]');
            await waitForInterception('POST', '/ajax/publish/save-article');
        });
    });
    it('Tag article should not be found in the tag page', () => {
        Cypress.on('uncaught:exception', () => false);
        cy.request({ url: `${ urlTagPage }${ getCurrentTimeStamp }_deletable`, failOnStatusCode: false }).its('status').should('equal', 404);
    });
});

describe('Open admin, verify config, add an article to front page, remove through contextual menu, and verify throughout', () => {
    it('Should visit admin, verify configuration, go to front page, verify articles, publish page without adding article, verify zero articles in published', () => {
        cy.request({
            method: 'POST',
            url: `https://${ baseUrl }`,
            headers
        }).then(async() => {
            await cy.visit({
                url: `https://${ baseUrl }/login`,
                headers,
                auth: {
                    username: AuthUsername,
                    password: AuthPassword
                }
            });

            // Navigate in Dashboard to open admin
            await cy.viewport('macbook-16');
            await cy.get('#loginForm > li:nth-child(1) > a').click();
            await cy.get('#lab-application-menu').invoke('addClass', 'labFn-open');
            await cy.get('#lab-application-menu > section > div:nth-child(1) > ul:nth-child(2) > li:nth-child(2) > a').click();

            // In admin, verify configuration
            // await cy.get('div.row.main ul.custom-pages li a[href="/settings/cp?page=articleSettings"]').click({ force: true });
            // await cy.get('body > div.row.main > section > div > div > ul.custom-pages > li:nth-child(3) > a').click();
            await cy.get('body > div.row.main > nav > ul:nth-child(1) > li:nth-child(4) > a').click();
            await cy.get('#page_list > li[title="index"]').click();

            // remove target attribute from edit frontpage button, so it opens in the same window
            await cy.get('#edit_frontpage_btn').invoke('removeAttr', 'target').click();

            // Go to the new article
            await waitForInterception('POST', '/ajax/user-settings/set-field');

            // click Article in right menu items
            await cy.get('li[data-collection="ArticlesLatest"]').first().click();

            // click hamburger menu when articles is expanded
            await cy.get('body > div.lab-collection-drawer.lab-content.lab-is-expanded.lab-overlay > div > div.lab-collection-header > form > a').click();

            // click the tag input optional field
            await cy.get('input[placeholder="Tag (optional)"]').type(getCurrentTimeStamp);

            // Todo: Replace wait
            await cy.get('.lab-offstage-title').contains(articleTitle).should('be.visible');
            cy.get('div.lab-collection-items div.lab-offstage-item[data-lab-type="article"]').then((offstageItems) => {
                cy.wrap(offstageItems.length).should('be.gt', 1);

            });

            // Publish front without articles
            await cy.get('li.lab-publish-btn span').click();
            await ifElementExistsClick('input[value="Publish"]');
            await waitForInterception('POST', '/ajax/publish/save-front');

            // Verify zero articles
            await cy.get('.lab-item-content').contains('Go to').click();
            // Intercept and stub window.open() so that Cypress stays in the same tab:
            await cy.window().then((win) => {
                cy.stub(win, 'open').callsFake((url) => {
                    cy.visit(url);
                });
            });
            await cy.get('.lab-item-content').contains('Published Page').click();
            // Verify
            cy.get('h2').contains(getCurrentTimeStamp).should('not.exist');

            // Log the current URL
            await cy.url().then((url) => {
                cy.task('log', `Current URL: ${ url }`);
            });
        });
    });
    it('Should visit admin, verify configuration, go to front page, add article programatically, then verify it is published', () => {
        cy.request({
            method: 'POST',
            url: `https://${ baseUrl }`,
            headers
        }).then(async() => {
            await cy.visit({
                url: `https://${ baseUrl }/login`,
                headers,
                auth: {
                    username: AuthUsername,
                    password: AuthPassword
                }
            });

            // Navigate in Dashboard to open admin
            await cy.viewport('macbook-16');
            await cy.get('#loginForm > li:nth-child(1) > a').click();
            await cy.get('#lab-application-menu').invoke('addClass', 'labFn-open');
            await cy.get('#lab-application-menu > section > div:nth-child(1) > ul:nth-child(2) > li:nth-child(2) > a').click();

            // In admin, verify configuration
            // await cy.get('div.row.main ul.custom-pages li a[href="/settings/cp?page=articleSettings"]').click({ force: true });
            // await cy.get('body > div.row.main > section > div > div > ul.custom-pages > li:nth-child(3) > a').click();
            await cy.get('body > div.row.main > nav > ul:nth-child(1) > li:nth-child(4) > a').click();
            await cy.get('#page_list > li[title="index"]').click();

            // remove target attribute from edit frontpage button, so it opens in the same window
            await cy.get('#edit_frontpage_btn').invoke('removeAttr', 'target').click();

            // Go to the new article
            await waitForInterception('POST', '/ajax/user-settings/set-field');

            // click Article in right menu items
            await cy.get('li[data-collection="ArticlesLatest"]').first().click();

            // click hamburger menu when articles is expanded
            await cy.get('body > div.lab-collection-drawer.lab-content.lab-is-expanded.lab-overlay > div > div.lab-collection-header > form > a').click();

            // click the tag input optional field
            await cy.get('input[placeholder="Tag (optional)"]').type(getCurrentTimeStamp);

            // Todo: Replace wait
            await cy.get('.lab-offstage-title').contains(articleTitle).should('be.visible');
            cy.get('div.lab-collection-items div.lab-offstage-item[data-lab-type="article"]').then((offstageItems) => {
                cy.wrap(offstageItems.length).should('be.gt', 1);

            });

            // Go to editor, add article programaticaly
            cy.window().then((win) => {
                win.lab_api.v1.model.insert.atPath({
                    path: 'page_front/dropZone',
                    data: {
                        type: 'article',
                        contentdata: {
                            fields: {
                                title: getCurrentTimeStamp,
                                subtitle: ''
                            }
                        }
                    },
                    options: {
                        index: 0
                    }
                });
            });

            // Publish
            await cy.get('li.lab-publish-btn span').click();
            await ifElementExistsClick('input[value="Publish"]');
            await waitForInterception('POST', '/ajax/publish/save-front');

            // Verify one article
            await cy.get('.lab-item-content').contains('Go to').click();
            // Intercept and stub window.open() so that Cypress stays in the same tab:
            await cy.window().then((win) => {
                cy.stub(win, 'open').callsFake((url) => {
                    cy.visit(url);
                });
            });
            await cy.get('.lab-item-content').contains('Published Page').click();
            // Verify
            cy.get('h2').contains(getCurrentTimeStamp);

            // Log the current URL
            await cy.url().then((url) => {
                cy.task('log', `Current URL: ${ url }`);
            });
        });
    });
    it('Should visit admin, verify configuration, go to front page, remove article through the contextual menu, then publish, then visit published front page and verify zero articles', () => {
        cy.request({
            method: 'POST',
            url: `https://${ baseUrl }`,
            headers
        }).then(async() => {
            await cy.visit({
                url: `https://${ baseUrl }/login`,
                headers,
                auth: {
                    username: AuthUsername,
                    password: AuthPassword
                }
            });

            // Navigate in Dashboard to open admin
            await cy.viewport('macbook-16');
            await cy.get('#loginForm > li:nth-child(1) > a').click();
            await cy.get('#lab-application-menu').invoke('addClass', 'labFn-open');
            await cy.get('#lab-application-menu > section > div:nth-child(1) > ul:nth-child(2) > li:nth-child(2) > a').click();

            // In admin, verify configuration
            // await cy.get('div.row.main ul.custom-pages li a[href="/settings/cp?page=articleSettings"]').click({ force: true });
            // await cy.get('body > div.row.main > section > div > div > ul.custom-pages > li:nth-child(3) > a').click();
            await cy.get('body > div.row.main > nav > ul:nth-child(1) > li:nth-child(4) > a').click();
            await cy.get('#page_list > li[title="index"]').click();

            // remove target attribute from edit frontpage button, so it opens in the same window
            await cy.get('#edit_frontpage_btn').invoke('removeAttr', 'target').click();

            // Go to the new article
            await waitForInterception('POST', '/ajax/user-settings/set-field');

            // click Article in right menu items
            await cy.get('li[data-collection="ArticlesLatest"]').first().click();

            // click hamburger menu when articles is expanded
            await cy.get('body > div.lab-collection-drawer.lab-content.lab-is-expanded.lab-overlay > div > div.lab-collection-header > form > a').click();

            // click the tag input optional field
            await cy.get('input[placeholder="Tag (optional)"]').type(getCurrentTimeStamp);

            // Todo: Replace wait
            await cy.get('.lab-offstage-title').contains(articleTitle).should('be.visible');
            cy.get('div.lab-collection-items div.lab-offstage-item[data-lab-type="article"]').then((offstageItems) => {
                cy.wrap(offstageItems.length).should('be.gt', 1);
            });

            await cy.get('div[title="Close menu (Escape)"]').click();
            // Go to editor, delete article on front page - click on contextual menu

            // Click on the article title
            await cy.getIframeBody('iframe[data-lab-viewport="desktop"]')
                .find('h2.headline')
                .contains(getCurrentTimeStamp)
                .click({ force: true });
            // Hit escape after to activate the contextual menu for the article we have just clicked
            await cy.getIframeBody('iframe[data-lab-viewport="desktop"]').type('{esc}');

            // Click delete
            await cy.get('span[class="lab-item-label labicon-delete"]').click({ force: true });

            // Publish
            await cy.get('li.lab-publish-btn span').click();
            await ifElementExistsClick('input[value="Publish"]');
            await waitForInterception('POST', '/ajax/publish/save-front');

            // Verify zero articles
            await cy.get('.lab-item-content').contains('Go to').click();
            // Intercept and stub window.open() so that Cypress stays in the same tab:
            await cy.window().then((win) => {
                cy.stub(win, 'open').callsFake((url) => {
                    cy.visit(url);
                });
            });
            await cy.get('.lab-item-content').contains('Published Page').click();
            // Verify
            cy.get('h2').contains(getCurrentTimeStamp).should('not.exist');

            // Add log out

            // https://labrador-e2e-test.labdevs.com/settings/front-pages
        });
    });
});

describe('Open admin, verify config, then log out', () => {
    it('Should visit admin, verify configuration, then test logging out', () => {
        cy.request({
            method: 'POST',
            url: `https://${ baseUrl }`,
            headers
        }).then(async() => {
            await cy.visit({
                url: `https://${ baseUrl }/login`,
                headers,
                auth: {
                    username: AuthUsername,
                    password: AuthPassword
                }
            });

            // Navigate in Dashboard to open admin
            await cy.viewport('macbook-16');
            await cy.get('#loginForm > li:nth-child(1) > a').click();
            await cy.get('#lab-application-menu').invoke('addClass', 'labFn-open');
            await cy.get('#lab-application-menu > section > div:nth-child(1) > ul:nth-child(2) > li:nth-child(2) > a').click();

            // In admin, verify configuration
            await cy.get('body > div.row.main > nav > ul:nth-child(1) > li:nth-child(4) > a').click();

            // Click on log out button right after
            await cy.get('a[title="Log out"]').click();

            // Verify that we are logged out

            // Verify that we are redirected to the login page
            await cy.url().should('eq', `https://${ baseUrl }/login`);

            // Verify status code 401 on request to base url
            await cy.request({
                url: `https://${ baseUrl }`,
                failOnStatusCode: false
            }).its('status').should('eq', 401);

        });
    });
});

/*
describe('Open admin and verify configuration', () => {
    it('Should visit admin, verify configuration and log out', () => {
        cy.request({
            method: 'POST',
            url: `https://${ baseUrl }`,
            headers
        }).then(async() => {
            await cy.visit({
                url: `https://${ baseUrl }/login`,
                headers,
                auth: {
                    username: AuthUsername,
                    password: AuthPassword
                }
            });

            // Navigate in Dashboard to open admin
            await cy.viewport('macbook-16');
            await cy.get('#loginForm > li:nth-child(1) > a').click();
            await cy.get('#lab-application-menu').invoke('addClass', 'labFn-open');

            // Go to admin
            await cy.get('#lab-application-menu > section > div:nth-child(1) > ul:nth-child(2) > li:nth-child(2) > a').click();

            // Go to page 'front pages'

            // Identify page "index"

            // Edit page (do not open new tab)


        });
    });
});
*/