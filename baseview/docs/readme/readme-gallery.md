# Baseview image gallery
Updated September 2025.

Slideshows can be set to display in a separate page. The default url structure of the gallery page is `/gallery/<page-id>/<slideshow-id>`.
The `page-id` is the ID of the article or front page where the slideshow is placed. The `slideshow-id` is the ID of the slideshow.

## Override options
We have made it easy to customize the gallery pages. You can replace the following templates as needed:

Template path                                               | Description
---                                                         | ---
view/page/gallery/default/template/default                  | Page template for the gallery page
view/page/gallery/default/template/partials/galleryHeader   | Header partial used by the page template
view/page/gallery/default/template/partials/style           | CSS variables used for styling
view/page/gallery/default/template/partials/script          | JS logic for the gallery page
modules/behaviours/page/Gallery.js                          | Behaviour for the Gallery page
view/content/slideshow/_slideshow.scss                      | CSS for the gallery page. Selectors prefixed with `body.gallery`

Note: The file extension `.template.mustache` is omitted for template files in the above table.

You can of course also modify the resource map of the slideshow to use custom template or properties.

### Config
The behaviour reads config `page_settings.gallery` and adds default values for the following properties:

Property                | Default value   | Description
---                     | ---             | ---
active                  | false           | Should the gallery feature be used?
displayHeader           | true            | Should standard page header be displayed?
displayFooter           | true            | Should standard page footer be displayed?
pageBackgroundColor     | #000000       | Background color on the main area of the page
pageTextColor           | #ffffff       | Text color on the main area of the page
logImageView            | false           | Should external statistic tools log each image as a page view?

## Logging
Add `debug=1` to the url to have the slideshow log events to the console.
