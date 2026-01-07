# Embeddable content from Labrador / Baseview

To enable the UI for embedding articles, follow these steps:

1. **Enable the Feature in Admin Page**
    - Navigate to the admin page at `/settings/cp?page=articleSettings`.
    - Enable the embedding feature.

2. **Enable Per Article in Article Settings**
    - Open the article settings by pressing `Shift+S`.
    - Under "Article Styling", enable the embedding option.

When embedding is enabled for an article, an embed button is displayed below the article. When end users click this, a popup is displayed allowing preview and customization of the embed.
Embedding of parts of a front page is also possible, but no UI exists to let end users create embed codes for this.

## Embed Code Example

The embed code consists of a `div` with data attributes and a JavaScript file located in Baseview or another Labrador view. Here is an example:

```html
<div class="labrador-cms-embed" data-lab-content="full" data-lab-id="137017" data-lab-site="www.example.com">
     <script async defer src="https://www.example.com/embed.js?v=123"></script>
</div>
```

The JavaScript will read data attributes and build an iframe requesting the specified page using the viewport `embed`. This allows us to customize the page when embedded.

## Customization

Style settings can be added to the `data-lab-style` attribute. The embed popup will populate this based on input from the user. The value will be added as class names to the body element of the embedded article.

Supported values:

Key                 | Description
---                 | ---
dac-no-title        | Will hide the title
dac-no-subtitle     | Will hide the subtitle
dac-no-image        | Will hide the main image or teaser image
dac-padding         | Will add space left and right of the embed

Example of an embed with styling:
```html
<div class="labrador-cms-embed" data-lab-style="dac-no-subtitle dac-padding" data-lab-content="teaser" data-lab-id="137017" data-lab-site="www.example.com">
    <script async defer src="https://www.example.com/embed.js?v=123"></script>
</div>
```

## Options for articles

Data attribute      | Description
---                 | ---
data-lab-style      | CSS classes for the body of the embedded page
data-lab-content    | `teaser` (default) or `full` (entire article without header and footer)
data-lab-id         | ID of embedded page
data-lab-site       | Domain, no protocol, e.g., `www.example.com`

## Options for front pages

In addition to options for articles, front pages support these attributes:

Data attribute      | Description
---                 | ---
data-lab-path       | Path for content to embed. `dropZone/row[3]` will embed the 4th row (index is zero-based)
data-lab-guid       | GUID for content to embed. Ex: `96f33ba9-52b4-4474-81dc-0bbc734e8d5c`
data-lab-name       | Host path of front page. For `https://example.com/my_page` this would be `my_page`. Replaces `data-lab-id` for articles

Example of an embed of a row on a front page:
```html
<div class="labrador-cms-embed" data-lab-name="my_page" data-lab-path="dropZone[0]/row[0]" data-lab-site="www.example.com">
    <script async defer src="https://www.example.com/embed.js?v=123"></script>
</div>
```

