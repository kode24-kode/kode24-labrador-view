/*
 * Gets userId from JWTCookie
 * userId is used to get user name from paywall provider
 * Will work for customers of FSOnline
 * Log out buttons redirects to api/paywall/logout
 * Is used in clientData in function toggleAuthenticatedContent
 * Must be initiated in header template for each customer - see seilmagasinet for example of implementation
*/

if (!window.Dac) window.Dac = {};
window.Dac.Paywall = class {

    constructor() {
        if (window.Dac && window.Dac.JWTCookie) {
            this.JWTCookie = new window.Dac.JWTCookie({ debug: false });
        }
    }

    async getUserName() {
        let userId = '';

        if (this.JWTCookie.isAuthenticated()) {
            userId = await this.JWTCookie.get('sub');

            if (!userId || !userId.length) {
                return new Promise((resolve) => {
                    resolve('');
                });
            }
        } else {
            return new Promise((resolve) => {
                resolve(false);
            });
        }

        try {
            const responseFromApi = await fetch(`https://fsonline.no/service/xhrlookup/${  userId }`).then((response) => {
                if (response.status >= 400 && response.status < 600) {
                    console.error('Bad response from server', response.status);
                    return false;
                }
                return response.json();
            });

            return responseFromApi.fullName === 'N/A' ? '' : responseFromApi.fullName;
        } catch (error) {
            console.error('Network error', error);
            return false;
        }
    }

    updateDOM(authenticated, username = '', greeting = '') {
        const isUserAuthenticadedClass = authenticated ? 'dac-paywall-authenticated' : 'dac-paywall-not-authenticated';
        const paywallAuthenticatedItemsToShow = document.querySelectorAll(`.${  isUserAuthenticadedClass }`);
        // var logOutBtns = document.querySelectorAll(".dac-logout-paywall-btn a");
        // var siteAlias = window.Dac.clientData.siteAlias;
        // var logOutHref = `https://api.${siteAlias}.no/paywall/logout?&siteAlias=${siteAlias}&&contentUrl=${location.href}`;

        paywallAuthenticatedItemsToShow.forEach((authItem) => {
            if (username.length && authItem.firstElementChild && !authItem.classList.contains('dac-logout-paywall-btn')) {
                authItem.firstElementChild.innerText = greeting + username;
            }
            authItem.classList.remove(isUserAuthenticadedClass);
        });

        // logOutBtns.forEach((btn) => {
        //    btn.href = logOutHref;
        // })
    }

};
