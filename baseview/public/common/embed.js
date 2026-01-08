/*
Example of embed-code
<div class="labrador-cms-embed" data-lab-content="full" data-lab-id="120796" data-lab-site="jo--www-default.localhost"><script async defer src="http://jo--www-default.localhost/embed.js"></script></div>
<div class="labrador-cms-embed" data-lab-content="teaser" data-lab-id="120796" data-lab-site="jo--www-default.localhost"><script async defer src="http://jo--www-default.localhost/embed.js"></script></div>

Front-page with path:
<div class="labrador-cms-embed" data-lab-name="jo-3" data-lab-path="dropZone[0]/row[1]" data-lab-site="jo--www-default.localhost"><script async defer src="http://jo--www-default.localhost/embed.js"></script></div>

*/

(function() {

    // Articles: data-lab-site, data-lab-id
    // Front:    data-lab-site, data-lab-name, data-lab-path or data-lab-guid
    const getUrl = (element, protocol) => {

        // Note: Several instances of this script may be embedden on a page. Make sure each element is only handled once.
        if (element.getAttribute('data-lab-embedded')) {
            return null;
        }
        element.setAttribute('data-lab-embedded', 1);
        const input = {
            site: element.getAttribute('data-lab-site'),
            id: element.getAttribute('data-lab-id'),
            path: element.getAttribute('data-lab-path'),
            guid: element.getAttribute('data-lab-guid'),
            name: element.getAttribute('data-lab-name'),
            content: element.getAttribute('data-lab-content') || 'teaser' // 'teaser', 'full'
        };

        if (!input.site) { return null; }
        if (!input.id && ((!input.path && !input.guid) || !input.name)) { return null; }

        input.domain = `${ protocol }//${ input.site }`;
        input.url = input.domain + (input.id ? `/a/${ input.id }?lab_viewport=embed&lab_content=${ input.content }` : `/${ input.name }?lab_viewport=embed&${ input.guid ? `lab_guid=${ input.guid }` : `lab_path=${ input.path }` }`);

        return input;
    };

    // Return [chars] char random hex.
    const unique = (chars) => {
        const multiplier = `0x${  10 ** (chars - 1) }`;
        return Math.floor((1 + Math.random()) * multiplier).toString(16);
    };

    const embed = (element) => {
        const input = getUrl(element, document.location.protocol);
        if (!input) {
            // Missing data in input-element or already processed (if multiple instances of this script)
            return;
        }
        const loader = document.createElement('div');
        loader.innerHTML = 'Loading content from Labrador CMS ...';
        loader.setAttribute('style', 'margin: 4rem 2rem; color: gray; text-align: center; font-family: Helvetica; font-size: 16px;');
        element.appendChild(loader);
        const frame = document.createElement('iframe');
        const frameId = unique(12);
        frame.setAttribute('id', frameId);
        frame.setAttribute('src', input.url);
        frame.setAttribute('style', 'width:100%; height:500px; border:0;');
        frame.addEventListener('load', (event) => {
            loader.remove();
            // Ask the loaded document for its height. Answer handled in method receiveMessage.
            // Also send css-classes to the loaded document.
            const cssList = (element.getAttribute('data-lab-style') || '').split(' ').filter((css) => !!css);
            frame.contentWindow.postMessage({
                request: 'labCmsGetPageHeight', frameId, cssList, viewportHeight: Math.min(window.innerHeight, 2000)
            }, '*');
        }, false);
        element.appendChild(frame);
    };

    // A MessageEvent is posted from a document of an iframe.
    // Validate and get document-height:
    function receiveMessage(event) {
        // Require data:
        if (!event.data || !event.data.request || !event.data.result || event.data.frameId === undefined) {
            return;
        }
        const { frameId } = event.data;
        if (frameId) {
            const frame = document.getElementById(frameId);
            if (frame) {
                frame.style.height = `${ event.data.result }px`;
                if (event.data.hasParallax) {
                    frame.style.maxHeight = '100vh';
                }
            }
        }
    }

    // Listen for MessageEvent (postMessage)
    window.addEventListener('message', receiveMessage, false);

    // Get all embed-instances:
    const elements = [...document.querySelectorAll('div.labrador-cms-embed')];
    for (const element of elements) {
        embed(element);
    }

}());
