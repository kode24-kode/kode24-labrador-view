export default class Vimond {

    constructor(api) {
        this.api = api;
        this.isEditor = this.api.v1.app.mode.isEditor();
        this.options = {};
    }

    onRender(model, view) {
        // Fetch data for players from Vimond API if in editor mode.
        if (this.isEditor) {
            const playersApiUrl = this.api.v1.config.get('contentbox_settings.vimond.playersApiUrl') || false;
            const currentPlayerId = model.get('fields.player');

            if (playersApiUrl) {
                fetch(playersApiUrl)
                    .then((response) => {
                        if (!response.ok) {
                            throw new Error(`Network response was not ok: ${ response.statusText }`);
                        }
                        return response.json();
                    })
                    .then((data) => {
                        /*
                        Response looks like this:
                        {
                            "id": "CcL0YLFy-ithwMLDrc1G0",
                            "name": "Playlist – Frontpage – Vertical",
                            "contentType": "list",
                            "componentType": "playlists",
                            "aspectRatio": "9/16",
                            "player": {
                                "carouselType": "small",
                                "fontFamily": "Inter, \"Helvetica Neue\", Helvetica, Arial, \"Lucida Grande\", sans-serif",
                                "nextVideoText": "Neste",
                                "player": "videojs",
                                "primaryColor": "#F50A29",
                                "highlightColor": "#f50929",
                                "language": "nb",
                                "vertical": true,
                                "shuffle": true,
                                "preview": "true",
                                "showDescriptionOverlay": "true"
                            }
                        */
                        const dataArray = Array.isArray(data) ? data : Object.values(data.data);

                        // Filter the data to get only the playlists.
                        this.options = dataArray
                            .map((item) => ({
                                id: item.id,
                                name: item.name,
                                aspectRatio: item.aspectRatio,
                                selected: currentPlayerId && item.id === currentPlayerId
                            }));

                        // If no player is selected and players are available, select the first one
                        if ((currentPlayerId === null || currentPlayerId === undefined) && this.options.length > 0) {
                            const defaultPlayer = this.options[0];
                            model.set('fields.player', defaultPlayer.id);
                            defaultPlayer.selected = true;
                            
                            // Set aspect ratio for the default player
                            if (defaultPlayer.aspectRatio) {
                                model.set('fields.aspectRatio', defaultPlayer.aspectRatio.replace('/', '-'));
                                model.set('fields.aspectRatioStyle', defaultPlayer.aspectRatio);
                            }
                        }

                        model.setFiltered('playersSettingsString', JSON.stringify(this.options));
                        model.setFiltered('playersSettings', this.options);

                        // Set the aspect ratio for the selected player if it exists.
                        const selectedPlayer = this.options.find((player) => player.id === currentPlayerId);
                        if (selectedPlayer && selectedPlayer.aspectRatio) {
                            model.set('fields.aspectRatio', selectedPlayer.aspectRatio.replace('/', '-'));
                            model.set('fields.aspectRatioStyle', selectedPlayer.aspectRatio);
                        }
                    })
                    .catch((error) => {
                        Sys.logger.warn('[Vimond] There was a problem with the fetch operation:', error);
                    });
            }

            if (currentPlayerId === '0') {
                model.set('fields.aspectRatio', null);
                model.set('fields.aspectRatioStyle', null);
            }
        }

        // Display caption on article-pages:
        let displayCaption = this.api.v1.model.root.getType() === 'page_article';
        if (this.api.v1.app.mode.isFront() && !view.get('fields.caption')) {
            displayCaption = false;
        }
        model.setFiltered('displayCaption', displayCaption);

        if (!this.api.v1.app.mode.isEditor() && this.api.v1.config.get('cookieConsent.enabled') === true) {
            const cookieConsentConfig = this.api.v1.config.get('cookieConsent');
            const vimondConsent = cookieConsentConfig.contentboxes.filter((box) => box.name === 'vimond')[0];

            if (vimondConsent) {
                model.setFiltered('requiredCookieConsent', vimondConsent.requiredConsent || false);
                model.setFiltered('insufficientConsentMessage', vimondConsent.insufficientConsentMessage || this.api.v1.config.get('cookieConsent.insufficientConsentMessage') || '');
            }
        }

        if (model.get('fields.verticalVideo')) {
            model.setFiltered(
                'playerUrl',
                `${ model.get('fields.playerUrl') }&aspectRatio=9:16`
            );
        } else {
            model.setFiltered('playerUrl', model.get('fields.playerUrl'));
        }

    }

    onRendered(model, view) {
        if (this.isEditor) {
            // The iframe from remote production player captures events on the element of the iframe disabling drag/drop in the editor.
            // Disable pointer-events when hovering the drag-handle.
            const iframe = view.getMarkup().querySelector('iframe');
            const dragHandle = view.getMarkup().querySelector('.video-drag-handle');
            if (iframe && dragHandle) {
                dragHandle.addEventListener('mouseenter', (event) => { iframe.style.pointerEvents = 'none'; }, false);
                dragHandle.addEventListener('mouseleave', (event) => { iframe.style.pointerEvents = ''; }, false);
            }
        }
    }

}
