# Baseview
View resources for Labrador CMS
https://github.com/publishlab/baseview

## Installation steps
Install Volta (Node and package manager):

Mac/Linux:

`curl https://get.volta.sh | bash`

`curl -fsSL https://get.pnpm.io/install.sh | sh -`

Windows:

`winget install Volta.Volta`

`Invoke-WebRequest https://get.pnpm.io/install.ps1 -UseBasicParsing | Invoke-Expression`

[![Run unit test with Mocha and end-to-end test with Cypress](https://github.com/publishlab/baseview/actions/workflows/pr-tests.yml/badge.svg)](https://github.com/publishlab/baseview/actions/workflows/pr-tests.yml)  
[![Visual testing with Percy](https://github.com/publishlab/baseview/actions/workflows/percy.yml/badge.svg)](https://github.com/publishlab/baseview/actions/workflows/percy.yml)  
[![Code Review with OpenAI](https://github.com/publishlab/baseview/actions/workflows/code-review.yml/badge.svg)](https://github.com/publishlab/baseview/actions/workflows/code-review.yml)

Baseview is a comprehensive set of view resources for Labrador CMS. It serves as a foundation for building custom views, providing definitions for various page components such as front pages, article pages, article teasers, factboxes, and more.

For detailed documentation on setting up your own view, visit the `/support` URL on any running Labrador installation.

---

## File Structure

The following table outlines the structure of the Baseview repository:

| Path                     | Required | Description                                                                 |
|--------------------------|----------|-----------------------------------------------------------------------------|
| **build/**               | No       | Contains build files.                                                      |
| **build/front/**         | No       | Build files for server-side rendering.                                      |
| **build/modules/**       | No       | Build files for editor and client-side rendering.                          |
| **build/buildHelpers/**  | No       | Tools for creating builds.                                                 |
| **client/**              | No       | Definitions of resources for client-side rendering.                        |
| **client/buildHelpers/** | No       | Tools for creating client-side builds.                                     |
| **config/**              | No       | JSON files for configuration.                                              |
| **config/presentation/** | No       | Configuration for server-side rendering in presentation mode.              |
| **config/edit/**         | No       | Configuration for running the view in the editor.                          |
| **cypress/**             | No       | Tools for continuous integration and testing.                              |
| **dashboard/**           | No       | Separate view resources for running Labrador Dashboard.                    |
| **docs/**                | No       | Documentation files (README files).                                        |
| **lib/**                 | No       | Support frameworks and utilities.                                          |
| **modules/**             | No       | JavaScript modules.                                                        |
| **modules/apps/**        | No       | Apps for the editor.                                                       |
| **modules/behaviours/**  | No       | Behaviors for each element type.                                           |
| **modules/collections/** | No       | Collections for the editor.                                                |
| **node_modules/**        | No       | Node.js dependencies.                                                      |
| **public/**              | No       | Public files available at `/`.                                             |
| **public/common/**       | No       | Public files shared across sites.                                          |
| **releasenotes/**        | No       | JSON files containing logs of new features and changes.                    |
| **test/**                | No       | Resources for testing.                                                     |
| **view/**                | Yes      | Templates and properties for each supported element type in the view.      |
| **index_client.js**      | No       | Exports modules for client-side rendering using the Labrador rendering engine. |
| **index_editor.js**      | Yes      | Exports modules for the Labrador editor.                                   |
| **index_front.js**       | Yes      | Exports modules for server-side rendering.                                 |
| **package.json**         | No       | Node.js project file for builds, tests, and other scripts.                 |

---

## License

Use of Baseview requires a valid license from Labrador CMS.  
For more information, visit [Labrador CMS](https://labradorcms.com).

--- testing ---
