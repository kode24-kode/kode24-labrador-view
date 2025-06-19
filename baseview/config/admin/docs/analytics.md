# Analytics


## Google Analytics ID

The analytics ID field can be used for both Universal Analytics (ID starting with UA-) and Google Analytics 4 (ID starting with G-). If you want to run both versions simultaneously you need to connect the UA and GA4 accounts. GA4 will then use the UA code to load the GA4 tracking and only the UA ID should be added to Labrador. When UA should be switched off, you can disconnect the accounts and replace the UA ID with the GA4 ID in Labrador. More information about connecting the accounts can be found <a href="https://support.google.com/analytics/answer/9973999?hl=en" target="_blank">here</a>.


## Google Tag Manager ID

Google Tag Manager ID (ID starting with GTM-), when Tag Manager is used to include tools like Google Analytics.


## Data layer for Google Tag Manager

Data layer is data that can be passed to Google Tag Manager on each page view. This data can be used in analytics to filter traffic, create triggers and so forth.
Each data layer item consists of three fields:


#### Data context
This field has 4 options: 
* `Section data`, data that will only be submitted on front pages, typically section id or section name.
* `Article data`, data that will only be submitted on articles, typically article title or author.
* `Configuration`, data that will be submitted on both front pages and articles. This is data coming from the configuration layer and may vary on different sites. An example might be if the user is authenticated or not.
* `JWT cookie data`, data that will be submitted on both front pages and articles. These data are collected from the JWT token if present in browser cookie.

#### Datalayer field name
The data key you will find in Tag manager.

#### Data source path
Path to the data you want to add to the data layer entry.

Data source path            | Data context       | Description                   
---                         | ---                | ---                           
`id`                        | Section            | Section id                    
`fields.name`               | Section            | Section name                  
`id`                        | Article            | Article id                    
`fields.title`              | Article            | Article title                 
`fields.subtitle`           | Article            | Article subtitle              
`fields.kicker`             | Article            | Article kicker                
`fields.seotitle`           | Article            | Article SEO title             
`fields.created_by`         | Article            | Author id                     
`fields.created_by_name`    | Article            | Author name                   
`fields.page_template_alias`| Article            | Article template name         
`fields.paywall`            | Article            | Article behind paywall        
`fields.published`          | Article            | Article published time        
`fields.published_url`      | Article            | Article url when published    
`paywall.active`            | Config             | If paywall is active          
`paywall.hasAccess`         | Config             | User can see full version of content
`sub`                       | JWT cookie data    | Paywall user id               


## Adnuntius Connect

Adnuntius Connect is Adnuntius' tag manager tool and can be used to include resources like JavaScript on the page. Network and container ID can be found on your Connect account. Environment should in in most cases be set to 'production'. 'Enable CMP' includes an additional script that is needed if you are using Adnuntius Connect's cookie consent solution.

## Linkpulse

Linkpulse is used internally in Labrador to generate content based on statistics, like most read. The field should contain the url to the Linkpulse script. This is the default account used by Labrador: '//pp.lp4.io/app/58/98/43/5898439ee45a1d4f62ee85dc.js'.

## Kilkaya

The field should contain either your account ID or the full URL to the script. Multiple accounts can be used.

## Comscore

The field should contain your account ID.
