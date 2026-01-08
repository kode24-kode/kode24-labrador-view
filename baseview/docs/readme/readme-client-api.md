# ClientAPI

The API can be used by integrations like statistics tools, ad managers and paywalls to register listeners for events happening client side. Features delivered by Baseview or other views may emit events that each listener may act upon.

The API is globally available on the window object as `labClientAPI`.

## Interface

Method      | Arguments                             | Description
---         | ---                                   | ---
on          | event (string), callback (function)   | Register a listener for the named event
off         | event (string), callback (function)   | Unregister a listener for the named event
emit        | event (string), data (any)            | Emit an event that will trigger excecution of all listeners

## Supported events
- pageChanged
- accessGranted
- accessDenied

## Payload
When an event is emitted each listener receives an object with the following properties:

Property    | Type      | Description
---         | ---       | ---
event       | String    | Name of event
pageData    | Object    | General page info. See below
data        | Any       | Data passed on from function emiting the event

The `pageData` object:

Property        | Type      | Description
---             | ---       | ---
bylines         | Array     | List of bylines (for articles)
cmsVersion      | String    | Labrador version number
contentLanguage | String    | Language code (`en-GB`)
description     | String    | Subtitle for articles, description for other page types
device          | String    | Name of viewport (`mobile`)
pageId          | String    | ID of main page
pageType        | String    | Page type (`article`, `front`, `gallery` etc)
published       | String    | ISO date
section         | String    | Section name (for article)
seodescription  | String    | Page description for search engines
seotitle        | String    | Page title for search engines
site            | Object    | Site info
site.domain     | String    | Domain (`https://example.com`)
site.id         | String    | Labrador site ID
site.alias      | String    | Name of site
somedescription | String    | Page description for social media
sometitle       | String    | Page title for social media
tags            | Array     | List of tags (for articles)
title           | String    | Page title
url             | String    | Current URL

Implementation examples:

## Log stats for each displayed image in a Gallery
The gallery feature delivered by Baseview will emit the event `pageChanged` each time the url is updated for a new display of an image.
Listeners may act on this.

### Google Tag Manager
A GTM component want to log each displayed image in a gallery:
```
window.labClientAPI.on('pageChanged', ({ event, data, pageData }) => {
    if (data.type === 'galleryImage') {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            event: data.direction === 'prev' ? 'gallery_previous' : 'gallery_next',
            gallery: {
                type: "commonGallery",
                content: {
                    id: `${ data.gallery }`,
                    name: `${ data.title }`,
                    imageCount: data.imageCount || 0,
                    page: `${ pageData.pageId }`
                },
                position: data.photo
            }
        });
    }
});
```
Note: This will require setup of the event 'commonGallery' and the rest of the payload in Google Tag Manager.

### Kilkaya
A Kilkaya component want to log each displayed image in a gallery:
```
window.labClientAPI.on('pageChanged', ({ event, data, pageData }) => {
    if (data.type === 'galleryImage') {
        kilkaya.pageview({
            event: data.type,
            gallery: data.gallery,
            photo: data.photo,
            url: data.url,
            pageType: pageData.pageType,
        });
    }
});
```

## Emit an event
Some features delivered by Baseview emits events listeners can act on.
If you build features in a custom view you can emit events yourself to allow all listeners to act on them.

Assume you build a single-page application (SPA) running on a Labrador page and you want to log pageviews when user action triggers a new view:

```
function appStateUpdated({ nameOfState }) {
    window.labClientAPI.emit('pageChanged', {
        type: nameOfState,
        url: '<current-url>',
        some_key: '<value>',
        some_other_key: '<other-value>'
    });
}
```

Whenever you call `appStateUpdated` because your app has changed state all listeners will be called with the supplied payload and may act on it as needed.

## Ads
The built in ad management tools of Labrador and Baseview allows you to set up ads that refresh client side.
Adding a placement with property `stickyAdminPlacement` set to `true` will allow admin user to enable this placement once on a page.
The placement can add an `options` object with the following properties that are used by the Baseview Gallery feature:

`index`: (int) The index to insert the ad into.
`interval`: (int) If set a placeholder is inserted at this interval after the `index`. 
`preloadIndex`: (int) A number specifying when to preload the ad. A value of `1` will reload the ad when the image next to the placement is displayed. Must be `1` or larger.
`refresh`: (bool) Flag indicating if refresh of the ad should be used

### Placeholders
Based on `options.interval` Baseview will insert one or more placeholders.
These dom elements can be used client side to display a refreshed ad. Either by placing the ad with a sticky position in the background and let the placeholder be transparent or by moving the ad into the placeholder.

### Logic
Partials are used for each supported vendor and service.
The Gallery feature listens to the `pageChanged` event emitted by the Gallery feature via the client API to update ads.
See the file `view/partial/lab4/ads/google/api_consumer.template.mustache` for an example.

The page template for the gallery (`view/page/gallery/default/template/default.template.mustache`) checks for active services and includes partials accordingly.

For this to work the ad template will have to set data on the client API. The partial will then read this data and use it to refresh ads correctly.

Example for ad template:
```
<script type="module">
    const data = labClientAPI.get('adData') || [];
    data.push({
        format: '{{ get.current.fields.format }}',
        code: '{{ get.current.filtered.adData.code }}',
        interval: {{ get.current.metadata.options.interval }},
        index: {{ get.current.metadata.options.index }},
        preloadIndex: {{ get.current.metadata.options.preloadIndex }}
    });
    labClientAPI.set('adData', data);
</script>
```

The api_consumer-template can then read out this data:
```
<script type="module">
window.labClientAPI.on('pageChanged', ({ event, data, pageData }) => {
    if (data.type === 'galleryImage') {
        const adData = labClientAPI.get('adData') || [];
        for (const item of adData) {
            // Refresh ad ...
        }
    }
});
</script>
```

### Customization
With developer access you can easily replace any partial used by the client API to implement your own logic.
