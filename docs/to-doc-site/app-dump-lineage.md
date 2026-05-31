# App dump endpoints now include lineage data

The REST endpoints below now include Qlik Sense Engine lineage data in their JSON response:

- `/v4/senseappdump/:appId`
- `/v4/app/:appId/dump`

## What changed

Butler now calls the Qlik Sense Engine API `GetLineage` method while serializing an app dump. The returned data is added to a new top-level `lineage` object in the app dump payload.

## Response shape

The existing dump payload is unchanged except for the added `lineage` property:

```json
{
  "properties": {},
  "loadScript": "",
  "lineage": {
    "qLineage": []
  },
  "sheets": [],
  "stories": [],
  "masterobjects": [],
  "appprops": [],
  "dataconnections": [],
  "dimensions": [],
  "bookmarks": [],
  "embeddedmedia": [],
  "snapshots": [],
  "fields": [],
  "variables": [],
  "measures": []
}
```

## Lineage source

The `lineage` object is returned directly from the Qlik Sense Engine API `GetLineage` call for the app being dumped. In practice, the `qLineage` array contains lineage entries for statements such as `LOAD` and `STORE`, which can be used for governance, troubleshooting, and understanding app data dependencies.
