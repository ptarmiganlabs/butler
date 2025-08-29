# jjsontree Upgrade Guide

This document outlines the process for upgrading jjsontree (JsonTree.js) to the latest version in the Butler application.

## Current Status

- **Current Version**: 2.9.0 (as of the last update)
- **Location**: `/static/configvis/`
- **Files Involved**:
  - `jsontree.js` - Main library (minified, 1713 lines)
  - `jsontree.js.css` - Styling
  - `jsontree.js.map` - Source map
  - `jsontree.js.css.map` - CSS source map

## Integration Points

jjsontree is used in Butler's configuration visualization feature:

1. **HTML Template**: `/static/configvis/index.html`
   - Includes jsontree.js and jsontree.js.css
   - Uses `data-jsontree-js` attribute for configuration
   - Shows Butler config as interactive JSON tree

2. **SEA Build**: `/build-script/sea-config.json`
   - jsontree files are embedded in Single Executable Application builds
   - Must be updated if files are renamed or new files are added

3. **Application Server**: `/src/app.js`
   - Serves static files from `/static/configvis/`
   - No direct dependencies on jsontree API

## Current API Usage

The HTML template uses jsontree with this configuration:
```javascript
data-jsontree-js="{
    title: {
        show: false,
        showTreeControls: true,
        showCopyButton: true
    },
    showCounts: true, 
    sortPropertyNames: false, 
    sortPropertyNamesInAlphabeticalOrder: false, 
    data: {{butlerConfigJsonEncoded}}
}"
```

## Upgrade Process

### Prerequisites
1. Internet access to download latest jjsontree files
2. Node.js environment for testing
3. Git access for version control

### Steps

1. **Research Latest Version**
   - Visit: https://github.com/williamtroup/JsonTree.js/releases
   - Check changelog for breaking changes
   - Note version number and release date

2. **Download Latest Files**
   ```bash
   # Example URLs (update with latest version)
   wget https://github.com/williamtroup/JsonTree.js/releases/download/v[VERSION]/dist/jsontree.min.js -O jsontree.js
   wget https://github.com/williamtroup/JsonTree.js/releases/download/v[VERSION]/dist/jsontree.min.css -O jsontree.js.css
   wget https://github.com/williamtroup/JsonTree.js/releases/download/v[VERSION]/dist/jsontree.min.js.map -O jsontree.js.map
   wget https://github.com/williamtroup/JsonTree.js/releases/download/v[VERSION]/dist/jsontree.min.css.map -O jsontree.js.css.map
   ```

3. **Backup Current Files**
   ```bash
   mkdir -p backup/$(date +%Y%m%d)
   cp static/configvis/jsontree.* backup/$(date +%Y%m%d)/
   ```

4. **Replace Files**
   ```bash
   cp new-jsontree-files/* static/configvis/
   ```

5. **Update Version Reference**
   - Check for version info in the new jsontree.js file
   - Update documentation with new version number

6. **Test Functionality**
   ```bash
   # Run validation tests
   npm test -- src/test/jsontree-upgrade.test.js
   
   # Start Butler with config visualization
   node src/butler.js -c ./src/config/config-gen-api-docs.yaml --no-qs-connection
   
   # Visit http://localhost:3100/ and test:
   # - JSON tree view tab
   # - Tree expansion/collapse
   # - Copy functionality
   # - Tree controls (❐ ↓ ↑ buttons)
   # - Data display accuracy
   ```

7. **Check for API Changes**
   - Review breaking changes in changelog
   - Test all configuration options used in index.html
   - Update configuration if needed

8. **Update Build Configuration**
   - Verify SEA build includes new files correctly
   - Test SEA build: `npm run build`

9. **Run Full Test Suite**
   ```bash
   npm run lint
   npm run test
   npm run format
   ```

10. **Update Documentation**
    - Update this file with new version info
    - Commit changes with descriptive message

## Troubleshooting

### Common Issues After Upgrade

1. **Tree Not Rendering**
   - Check browser console for JavaScript errors
   - Verify jsontree.js loaded correctly
   - Check if API configuration changed

2. **Styling Issues**
   - Verify jsontree.js.css loaded
   - Check for CSS class name changes
   - Inspect CSS source maps

3. **Configuration Errors**
   - Review changelog for configuration option changes
   - Test with minimal configuration first
   - Check data-jsontree-js attribute syntax

4. **SEA Build Issues**
   - Verify all files listed in sea-config.json exist
   - Check file paths and names
   - Test SEA functionality

### Rollback Procedure

If issues occur:
```bash
# Restore from backup
cp backup/[DATE]/jsontree.* static/configvis/

# Test restoration
npm test -- src/test/jsontree-upgrade.test.js
```

## Version History

- **v2.9.0**: Current version (baseline for upgrades)
- **v[NEW]**: [To be updated after upgrade]

## Additional Notes

- jjsontree is a static dependency, not managed through npm
- Files must be manually downloaded and replaced
- Configuration is embedded in HTML template, not JavaScript
- Testing should include both development and SEA builds
- Consider browser compatibility when upgrading