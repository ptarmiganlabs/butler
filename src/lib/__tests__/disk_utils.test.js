import isDirectoryChildOf from '../disk_utils.js';

describe('disk_utils', () => {
    describe('isDirectoryChildOf', () => {
        test('should return true when child is same as parent', () => {
            expect(isDirectoryChildOf('/path/to/dir', '/path/to/dir')).toBe(true);
        });

        test('should return true when child is subdirectory of parent', () => {
            expect(isDirectoryChildOf('/path/to/dir/subdir', '/path/to/dir')).toBe(true);
            expect(isDirectoryChildOf('/path/to/dir/subdir/deep', '/path/to/dir')).toBe(true);
        });

        test('should return false when child is not subdirectory of parent', () => {
            expect(isDirectoryChildOf('/different/path', '/path/to/dir')).toBe(false);
            expect(isDirectoryChildOf('/path/to/other', '/path/to/dir')).toBe(false);
        });

        test('should return false when child is parent of parent', () => {
            expect(isDirectoryChildOf('/path', '/path/to/dir')).toBe(false);
        });

        test('should return false when paths are siblings', () => {
            expect(isDirectoryChildOf('/path/to/dir1', '/path/to/dir2')).toBe(false);
        });

        test('should handle root directory correctly', () => {
            expect(isDirectoryChildOf('/some/path', '/')).toBe(true);
            expect(isDirectoryChildOf('/', '/')).toBe(true);
        });

        test('should handle empty segments correctly', () => {
            expect(isDirectoryChildOf('/path//to/dir', '/path/to')).toBe(true);
            expect(isDirectoryChildOf('/path/to//dir/', '/path/to')).toBe(true);
        });

        test('should handle trailing slashes correctly', () => {
            expect(isDirectoryChildOf('/path/to/dir/', '/path/to/')).toBe(true);
            expect(isDirectoryChildOf('/path/to/dir', '/path/to/')).toBe(true);
        });
    });
});
