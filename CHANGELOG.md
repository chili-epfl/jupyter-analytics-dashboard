# Changelog

<!-- <START NEW CHANGELOG ENTRY> -->

## 5.0.0

([Full Changelog](https://github.com/chili-epfl/jupyter-analytics-dashboard/compare/v4.0.21...ad1c9cadc7a47e77e689b2bc4dee929787fd2d28))

### Merged PRs

- feat: add PendingUpdatesChart component for visualizing student update actions and response times [#1](https://github.com/chili-epfl/jupyter-analytics-dashboard/pull/1) ([@Harkeerat2002](https://github.com/Harkeerat2002), [@zy-cai](https://github.com/zy-cai))

### Contributors to this release

The following people contributed discussions, new ideas, code and documentation contributions, and review.
See [our definition of contributors](https://github-activity.readthedocs.io/en/latest/use/#how-does-this-tool-define-contributions-in-the-reports).

([GitHub contributors page for this release](https://github.com/chili-epfl/jupyter-analytics-dashboard/graphs/contributors?from=2025-04-23&to=2026-02-04&type=c))

@Harkeerat2002 ([activity](https://github.com/search?q=repo%3Achili-epfl%2Fjupyter-analytics-dashboard+involves%3AHarkeerat2002+updated%3A2025-04-23..2026-02-04&type=Issues)) | @zy-cai ([activity](https://github.com/search?q=repo%3Achili-epfl%2Fjupyter-analytics-dashboard+involves%3Azy-cai+updated%3A2025-04-23..2026-02-04&type=Issues))

<!-- <END NEW CHANGELOG ENTRY> -->

## 4.0.21

Adding a real-time sync functionality that allows the teacher to push notebook and cell-level updates to the connected students.

## 4.0.20

No merged PRs

## 4.0.19

No merged PRs

## 4.0.18

Releasing new login system that requires signing up with a username and password.

## 4.0.17

Lazy loading and text filter fix in Cell dashboard

## 4.0.16

Lazy loading bug fix

## 4.0.15

No merged PRs

## 4.0.14

Widget.attach JupyterLab 3 compatibility fix

## 4.0.13

- Removing salt hashing in server extension
- Auto update of the filters without Ok/Cancel buttons
- Adding red circle + highlight default options in filters
- Playback feature
- Lazy loading cell dashboard
- Fixing bugs

## 4.0.12

- Changing DashboardInteraction signal name to a string
- Logging group filter interaction

## 4.0.11

- Switching to socketio protocol to establish websocket connections with the backend.
- Encoding the backend URL as a setting and adding a checkbox to switch to local backend routing.

## 4.0.10

No merged PRs

## 4.0.9

- Adding new dropdown filters
- Notebook-specific persistence of filters

## 4.0.8

No merged PRs

## 4.0.7

- Feature: adding text-based filtering in Cell dashboard
- Adding server extension component
- Generating or retrieving persistent user identifier
- Small bug fixes

## 4.0.6

Fixed incompatibility with JupyterLab 3.

## 4.0.5

Changes since last release:

- Bug fixes
- Dashboard usage data collection
- Export notebook data to CSV
- Removing cell list check for robustness to cell list incompatibility
- Cleaning up redux store
- Emit authorized notebooks for telemetry extension to catch to avoid displaying your own data in the dashboard.
- Switching to JWT authentication
- Handling token refresh

## 4.0.4

No merged PRs

## 4.0.3

- Smoother Cell dashboard refresh
- Reading userId for authentication

## 4.0.2

Changing package name

## 4.0.1

Major changes :

- Adding websocket connection
- Refresh request over websocket sent by backend to enable real-time visualization
- Cleaning code
- Adding CompatibilityManager and making the extension compatible with JupyterLab 3
- Adding PanelManager to run the notebook checks and share the checks between all sidebar widgets
- Adding DashboardPanel abstract parent class to define shared logic between Right and Left dashboards

## 4.0.0

First release through the releaser. The extension was seeded with a template for JupyterLab 4.x.

New features :

- Including markdown executions to the dashboard using JupyterLab API
- Clicking on the TOC dashboard tile opens the corresponding cell dashboard
- Time filter is shared between both dashboard
- Refresh is shared between both dashboard
- Re-rendering is made smoother by not reloading the charts completely
