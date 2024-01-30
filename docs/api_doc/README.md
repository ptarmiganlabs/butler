# Generate API docs

```bash
npm i -g @redocly/cli@latest
node src/butler.js -c ./src/config/config-gen-api-docs.yaml --no-qs-connection &
sleep 10
curl localhost:8081/documentation/yaml > ./docs/api_doc/butler-api.yaml
curl localhost:8081/documentation/json > ./docs/api_doc/butler-api.json
npx @redocly/cli build-docs ./docs/api_doc/butler-api.yaml --output ./docs/api_doc/butler-api.html
ls -la ./docs/api_doc
pkill -f 'node src/butler.js'
```
