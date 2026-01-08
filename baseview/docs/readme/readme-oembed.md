# Oembed support in Baseview
https://oembed.com

The Baseview implementation of oEmbed uses `type=rich` with the actual embed code in the `html` property.

## Options for oEmbed

Option                          | Argument                  | Description
---                             | ---                       | ---
Display full article (default)  | `<none>`                  | Show the full article
Display article teaser          | embed_type_teaser         | Show article teaser only
Hide title                      | embed_no_title            | Hide the article title
Hide subtitle                   | embed_no_subtitle         | Hide the article subtitle
Hide image                      | embed_no_image            | Hide the article image
Extra margins                   | embed_padding             | Add extra margins
Hide site link                  | embed_no_sitelink         | Hide the site link
Hide logo                       | embed_no_sitelink_logo    | Hide the site logo
Hide poweredby                  | embed_no_poweredby        | Hide the "powered by" text

## Accessing oEmbed for a page
Append `lab_viewport=oembed` and each option in `lab_opts`, comma separated.

## Examples

Use default settings:
https://www.example.com/a/123456?lab_viewport=oembed

Hide site link and logo:
https://www.example.com/a/123456?lab_viewport=oembed&lab_opts=embed_no_sitelink,embed_no_sitelink_logo

Display article teaser, only show image and title:
https://www.example.com/a/123456?lab_viewport=oembed&lab_opts=embed_type_teaser,embed_no_subtitle,embed_no_sitelink,embed_no_sitelink_logo,embed_no_poweredby
