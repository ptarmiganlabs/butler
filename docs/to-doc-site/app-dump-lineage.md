# App dump endpoints now include lineage data

The REST endpoints below now include Qlik Sense Engine lineage data in their JSON response:

- `/v4/senseappdump/:appId`
- `/v4/app/:appId/dump`

## What changed

Butler now calls the Qlik Sense Engine API `GetLineage` method while serializing an app dump. The returned data is added to a new top-level `lineage` object in the app dump payload.

## Response shape

The existing dump payload is unchanged except for the added `lineage` property and a root-level `appId`:

```json
{
  "appId": "210832b5-6174-4572-bd19-3e61eda675ef",
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

Each `lineage.qLineage[]` item can include:

- `qDiscriminator`: origin of the lineage entry
- `qStatement`: related `LOAD` or `SELECT` statement from the app script

Qlik documents these `qDiscriminator` value categories:

- Local file path (`[filename]` in the Qlik docs is placeholder notation for any local file path), for example `\\192.168.1.124\testdata\tedtalk\ted_main.csv`
- `INLINE`
- `RESIDENT`
- `AUTOGENERATE`
- Connector provider name (`Provider` in the Qlik docs)
- Web file (`[webfile]`)
- `STORE`
- `EXTENSION`

In the API schema source code, the same Windows path example appears with escaped backslashes because it is written as a JSON/JavaScript string literal.
