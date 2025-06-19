# Client side ads - Livefeed

The Baseview implementation of ads define `placements` inserted programmatically server side.
Self service is available for users at url `/settings/cp?page=ads`.

This solution uses the same config with some additions:

From file `config/presentation/v2/placements.json`:
```
{
    {
        "key": "livefeed",
        "client": true,
        "requireElement": "livefeed",
        "name": "Livefeed - Client side - Initial",
        "domSelector": ".livefeed ul.notices",
        "options": {
            "itemsSelector": "li"
        }
    },
    {
        "key": "livefeed_updates",
        "client": true,
        "requireElement": "livefeed",
        "name": "Livefeed - Client side - Updates",
        "domSelector": ".livefeed ul.notices",
        "options": {
            "itemsSelector": "li",
            "renderOnUpdates": true
        }
    }
}
```

The property `requireElement` is used by class `DynamicDataHelper` to prepare data for ads to render client side.
`domSelector` and `options.itemsSelector` are used for dom-queries.
`options.renderOnUpdates` is used for ads that should render when new notices are rendered in the Livefeed.
Placements without this is rendered after page load.

Rendering is handled by the class `ClientAds`.

This is initiated by a Mustache template like this:
```
<script type="module">
    import { ClientAds } from '/view-resources/baseview/public/common/baseview/ClientAds.js{{ #helper.cachebuster }}{{ /helper.cachebuster }}';
    const clientAds = new ClientAds({
        items: {{{ get.current.filtered.clientSidePlacements }}},
        resources: {{{ get.current.filtered.clientSideResources }}}
    });
</script>
```

## Admin page for ads
Note: For placements used for updates of notices of Livefeed (`options.renderOnUpdates: true`) the `index` property has a different meaning:
This tells on what interval to insert the ad. An index of `1` will insert an ad above each new notice, index `2` will insert at every second new notice, etc. Index `0` will never insert.
