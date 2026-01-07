import 'cypress-real-events';
/* eslint-disable no-undef */

const bodytext = `The old adage about the interregnum between an election and an inauguration is that there is only one president at a time. Try telling that to the rest of the world now. \nWhile one president, the one actually still living in the White House, attends international summit meetings and brokers a Middle East cease-fire to cap his tenure, another president, the one who has not actually taken office yet, is busy conducting a foreign policy of his own from his Spanish-tiled Florida estate.`;

const baseUrl = Cypress.env('baseUrl') || 'labrador-e2e-test.labdevs.com';
const AuthUsername = Cypress.env('username') || 'labrador';
const AuthPassword = Cypress.env('password') || '8zEsiJebBzG9E2Z';
const githubDescription = Cypress.env('description') || 'Cypress E2E test';

// Create a buffer from the username and password
const authString = `${ AuthUsername }:${ AuthPassword }`;
const buf = Buffer.from(authString);
const base64Auth = buf.toString('base64');

const labSession = Cypress.env('session') || 'ecdad5077867e4b62770c2b23a28a182';

const headers = {
    Authorization: `Basic ${ base64Auth }`,
    Cookie: `LABACTIVE=1; LABSESSID=${ labSession };`
};

// Add drag and drop function.
const dragAndDrop = (dragLocator, dropLocator) => {
    cy.get(dragLocator)
        .realMouseDown({ button: 'left', position: 'center' })
        .realMouseMove(0, 10, { position: 'center' })
        .wait(200);
    cy.get(dropLocator)
        .realMouseMove(0, 0, { position: 'center' })
        .realMouseUp();
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
function waitForInterception(requestMethod, requestUrl) {
    cy.intercept(requestMethod, requestUrl).as('interception');
    // Bør vurdere timeout
    return cy.wait('@interception');
}

describe('Open admin and verify configuration', () => {
    it('Should visit admin, verify configuration and log out', () => {
        cy.request({
            method: 'POST',
            url: `https://${ baseUrl }`,
            headers
        }).then(async() => {
            // Go to admin
            // cy.intercept('GET', '/ajax/user-settings/get-settings').as('interception');
            /*
            await cy.intercept('/ajax/site/get-all', (req) => {
                req.continue((res) => {
                    // Assert successful responses
                    expect(res.statusCode).to.be.oneOf([200, 301, 302, 304]); // No error responses
                });
            }).as('allRequests');
    */
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
            await cy.get('ul.custom-pages').should('exist');
            await cy.get('ul.custom-pages').find('li');

            // Click on article settings in the main area:
            await cy.get('div.row.main .mainAdminPage ul.custom-pages li a[href="/settings/cp?page=articleSettings"]').click();
            await cy.get('#lab-modalContainer > div > form > input[type=submit]').click();
            await cy.get('div.lab-items').should('exist');

        });
    });
});

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
                .invoke('text', 'UPDATED TEXT');

            // Go to article setting to change section
            await cy.get('li[data-collection="no-collection"]').eq(0).click();
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
                .type('OPPDATERT BODYTEXT\nOPPDATERT BODYTEXT\nOPPDATERT BODYTEXT\nOPPDATERT BODYTEXT', { force: true });

            await cy.get('div.lab-collection-drawer')
                .invoke('addClass', 'lab-is-expanded');

            // Failed attempt to drag and drop
            // await cy.get('li[data-collection="Elements"]').click({ multiple: true, force: true });
            // .invoke('addClass', 'lab-selected');
            // Test dragging in content box from drawer
            // await cy.get('li[data-collection="Elements"]').click({ force: true });
            // await cy.dropToArea('iframe[data-lab-viewport="desktop"]', 'div["title="Factbox"]', '.bodytext > p');
            // await cy.getIframeBody('iframe[data-lab-viewport="desktop"]');

            // .type(bodytext, { force: true })
            // .wait(2000);

            // Test AI panel
            // Curl request shows --insecure as param. Cypress is used as a proxy between client and external service
            // https://docs.cypress.io/app/faq#Is-there-a-way-to-give-a-proper-SSL-certificate-to-your-proxy-so-the-page-doesnt-show-up-as-not-secure
            /*
            await cy.get('li.lab-generate span.labicon-magic_wand').click();
            await cy.wait(2000);
            await cy.get('#button-suggest').click();
            await cy.wait(10000);
            await cy.get('#button-insert').click();
            */

            // Test of opening collection, add factbox

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
