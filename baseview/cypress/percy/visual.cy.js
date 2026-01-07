/* eslint-disable no-undef */

// https://percy.io/8591b42a/web/Baseview

import '@percy/cypress';

describe('Baseview visual testing.', () => {

    it('Front page - row_01', () => {
        cy.visit('localhost:8000/test/visual-frontpage?data=row_01');
        cy.get('div.page-content').should('be.visible');
        cy.percySnapshot('row_01');
    });

    it('Front page - row_02', () => {
        cy.visit('localhost:8000/test/visual-frontpage?data=row_02');
        cy.get('div.page-content').should('be.visible');
        cy.percySnapshot('row_02');
    });

});
