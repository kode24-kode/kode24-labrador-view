# Baseview builds
Baseview delivers both bundles and builds for use in the editor, server side rendering and client side rendering.
Webpack is used for some builds, custom JS running Node JS is used for others.

The action `npm run build` is a shortcut to create all builds.
For an overview of actions and watchers, see `package.json`.

## build/front/baseview.js

This file is consumed by Labrador when rendering server side. We run the V8 engine using an old PHP library that do not support modern vanilla JS.
Example of unsupported JS: Optional chaining (`user.address?.country`).

What            | Where / how
---             | ---
Build file:     | build/front/baseview.js
Build source:   | index_front.js
Build trigger:  | webpack.config.front.cjs
Command:        | npm run build:front

## build/modules/client_modules.js

JS modules for use in Labrador running client side.  
See [docs/readme/readme-client-rendering.md](readme-client-rendering.md) for more info.

What            | Where / how
---             | ---
Build file:     | build/modules/client_modules.js
Build source:   | index_client.js
Build trigger:  | webpack.config.client.cjs
Command:        | npm run build:client:modules

## build/modules/client_package.js

Config, properties and templates for use in Labrador running client side. To reduce bandwith we only use a subset of the view client side. To support rendering a new element type client side we must add it to this build.  
See [docs/readme/readme-client-rendering.md](readme-client-rendering.md) for more info.

What            | Where / how
---             | ---
Build file:     | build/modules/client_package.js
Build source:   | client/config.json, client/configPaths.json, client/resources.json
Build trigger:  | client/buildHelpers/builder.js
Command:        | npm run build:client:resources

## build/modules/editor_modules.js

Bundle for use in the editor. The goal of this is to reduce the number of HTTP requests.
Labrador reads the module `index_editor.js` that exports this build file.

What            | Where / how
---             | ---
Build file:     | build/modules/editor_modules.js
Build source:   | modules/index_editor.js
Build trigger:  | webpack.config.editor.cjs
Command:        | npm run build:editor:modules

## public/common/build/baseview_dependencie_modules.js

Consumed by `public/common/baseview/moduleHandlers.js`. 
Imports Labrador rendering engine and support files for rendering client side.
See [docs/readme/readme-client-rendering.md](readme-client-rendering.md) for more info.

What            | Where / how
---             | ---
Build file:     | public/common/build/baseview_dependencie_modules.js
Build source:   | public/common/labrador/index.js
Build trigger:  | webpack.config.dependencieModules.cjs
Command:        | npm run build:dependencieModules

## public/common/build/baseview_dependencies_dom.js

Bundle of JS logic to use client side. Like toggle in the menus for customers using Dachser2.

What            | Where / how
---             | ---
Build file:     | public/common/build/baseview_dependencies_dom.js
Build source:   | [manual list]
Build trigger:  | webpack.config.dependencies.cjs
Command:        | npm run build:dependencies
