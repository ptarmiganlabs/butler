export const apiFileCopy = {
    schema: {
        description:
            "Copying of files is only posttible between pre-approved directories.\nDefining approved source and destination directories is done in Butler's config file.\n\nIf the source directory contains subdirectories, these will be copied too.",
        summary: 'Copy file(s) between well defined, approved locations.',
        body: {
            type: 'object',
            required: ['fromFile', 'toFile'],
            properties: {
                fromFile: {
                    type: 'string',
                    minLength: 1,
                    description: 'Name of source file.',
                    examples: ['subfolder/file1.qvd'],
                },
                toFile: {
                    type: 'string',
                    minLength: 1,
                    description: 'Name of destination file. Can be different from source file name, if needed.',
                    examples: ['archive/file1_20200925.qvd'],
                },
                overwrite: {
                    type: 'boolean',
                    description:
                        'Controls whether destination file should be overwritten if it already exists. Note that the copy operation will silently fail if you set this to false and the destination exists. Defaults to false.',
                    examples: [false],
                    default: false,
                },
                preserveTimestamp: {
                    type: 'boolean',
                    description:
                        'When true, the timestamp of the source file(s) will be preserved on the destination file(s). When false, timestamp behaviour is OS-dependent. Defaults to false.',
                    examples: [false],
                    default: false,
                },
            },
        },
        response: {
            201: {
                description: 'File copied.',
                type: 'object',
                properties: {
                    fromFile: {
                        type: 'string',
                        description: 'Name of source file.',
                        examples: ['subfolder/file1.qvd'],
                    },
                    toFile: {
                        type: 'string',
                        description: 'Name of destination file. Can be different from source file name, if needed.',
                        examples: ['archive/file1_20200925.qvd'],
                    },
                    overwrite: {
                        type: 'boolean',
                        description:
                            'Controls whether destination file should be overwritten if it already exists. Note that the copy operation will silently fail if you set this to false and the destination exists. Defaults to false.',
                        examples: [false],
                    },
                    preserveTimestamp: {
                        type: 'boolean',
                        description:
                            'When true, the timestamp of the source file(s) will be preserved on the destination file(s). When false, timestamp behaviour is OS-dependent. Defaults to false.',
                        examples: [false],
                    },
                },
            },
            400: {
                description: '"Required parameter missing" or "fromFile not found".',
                type: 'object',
                properties: {
                    statusCode: { type: 'number' },
                    code: { type: 'string' },
                    error: { type: 'string' },
                    message: { type: 'string' },
                    time: { type: 'string' },
                },
            },
            403: {
                description:
                    'No approved fromDir/toDir for file copy, or UNC path used when Butler is running on non-Windows operating system',
                type: 'object',
                properties: {
                    statusCode: { type: 'number' },
                    code: { type: 'string' },
                    error: { type: 'string' },
                    message: { type: 'string' },
                    time: { type: 'string' },
                },
            },
            500: {
                description: 'Internal error.',
                type: 'object',
                properties: {
                    statusCode: { type: 'number' },
                    code: { type: 'string' },
                    error: { type: 'string' },
                    message: { type: 'string' },
                    time: { type: 'string' },
                },
            },
        },
    },
};

export const apiFileMove = {
    schema: {
        description:
            "Moving of files is only posttible between pre-approved directories.\nDefining approved source and destination directories is done in Butler's config file.\n\nIf the source directory contains subdirectories, these will be moved too.",
        summary: 'Move file(s) between well defined, approved locations.',
        body: {
            type: 'object',
            required: ['fromFile', 'toFile'],
            properties: {
                fromFile: {
                    type: 'string',
                    minLength: 1,
                    description: 'Name of source file.',
                    examples: ['subfolder/file1.qvd'],
                },
                toFile: {
                    type: 'string',
                    minLength: 1,
                    description: 'Name of destination file. Can be different from source file name, if needed.',
                    examples: ['archive/file1_20200925.qvd'],
                },
                overwrite: {
                    type: 'boolean',
                    description: 'Controls whether destination file should be overwritten if it already exists. Defaults to false.',
                    examples: [false],
                    default: false,
                },
            },
        },
        response: {
            201: {
                description: 'File moved.',
                type: 'object',
                properties: {
                    fromFile: {
                        type: 'string',
                        description: 'Name of source file.',
                        examples: ['subfolder/file1.qvd'],
                    },
                    toFile: {
                        type: 'string',
                        description: 'Name of destination file. Can be different from source file name, if needed.',
                        examples: ['archive/file1_20200925.qvd'],
                    },
                    overwrite: {
                        type: 'boolean',
                        description: 'Controls whether destination file should be overwritten if it already exists. Defaults to false.',
                        examples: [false],
                    },
                },
            },
            400: {
                description: '"Required parameter missing" or "fromFile not found".',
                type: 'object',
                properties: {
                    statusCode: { type: 'number' },
                    code: { type: 'string' },
                    error: { type: 'string' },
                    message: { type: 'string' },
                    time: { type: 'string' },
                },
            },
            403: {
                description: 'No approved fromDir/toDir for file copy.',
                type: 'object',
                properties: {
                    statusCode: { type: 'number' },
                    code: { type: 'string' },
                    error: { type: 'string' },
                    message: { type: 'string' },
                    time: { type: 'string' },
                },
            },
            500: {
                description: 'Internal error.',
                type: 'object',
                properties: {
                    statusCode: { type: 'number' },
                    code: { type: 'string' },
                    error: { type: 'string' },
                    message: { type: 'string' },
                    time: { type: 'string' },
                },
            },
        },
    },
};

export const apiFileDelete = {
    schema: {
        description:
            "It is only possible to delete files in pre-approved directories, or subdirectories thereof.\nDefining approved directories is done in Butler's config file.",
        summary: 'Delete file(s) in well defined, approved locations.',
        body: {
            type: 'object',
            required: ['deleteFile'],
            properties: {
                deleteFile: {
                    type: 'string',
                    minLength: 1,
                    description:
                        'Name of file to be deleted. Use forward/backward slashes in paths as needed, depending on whether Butler runs on Windows/non-Windows platform.',
                    examples: ['data/qvdstore/sales/file1.qvd'],
                },
            },
        },
        response: {
            204: {
                description: 'File deleted.',
                type: 'object',
            },
            400: {
                description: '"Required parameter missing" or "File requested for delete not found".',
                type: 'object',
                properties: {
                    statusCode: { type: 'number' },
                    code: { type: 'string' },
                    error: { type: 'string' },
                    message: { type: 'string' },
                    time: { type: 'string' },
                },
            },
            403: {
                description: 'No approved directory matches the delete request.',
                type: 'object',
                properties: {
                    statusCode: { type: 'number' },
                    code: { type: 'string' },
                    error: { type: 'string' },
                    message: { type: 'string' },
                    time: { type: 'string' },
                },
            },
            500: {
                description: 'Internal error.',
                type: 'object',
                properties: {
                    statusCode: { type: 'number' },
                    code: { type: 'string' },
                    error: { type: 'string' },
                    message: { type: 'string' },
                    time: { type: 'string' },
                },
            },
        },
    },
};

export const apiCreateDir = {
    schema: {
        description:
            "If the directory already exists nothing will happen.\nIf permissions don't allow a directory to be created, or if the path is invalid, an error will be returned.",
        summary: 'Creates a directory anywhere in the file system.',
        body: {
            type: 'object',
            required: ['directory'],
            properties: {
                directory: {
                    type: 'string',
                    minLength: 1,
                    description: 'Path to directory that should be created. Can be a relative or absolute path.',
                    examples: ['/Users/joe/data/qvds/2020'],
                },
            },
        },
        response: {
            201: {
                description: 'Directory created.',
                type: 'object',
                properties: {
                    directory: {
                        type: 'string',
                        description: 'Directory that was created.',
                        examples: ['/Users/joe/data/qvds/2020'],
                    },
                },
            },
            400: {
                description: 'Required parameter missing.',
                type: 'object',
                properties: {
                    statusCode: { type: 'number' },
                    code: { type: 'string' },
                    error: { type: 'string' },
                    message: { type: 'string' },
                    time: { type: 'string' },
                },
            },
            500: {
                description: 'Internal error (file system permissions etc).',
                type: 'object',
                properties: {
                    statusCode: { type: 'number' },
                    code: { type: 'string' },
                    error: { type: 'string' },
                    message: { type: 'string' },
                    time: { type: 'string' },
                },
            },
        },
    },
};

export const apiCreateDirQvd = {
    schema: {
        description: "Creates a directory in QVD directory (which is defined in Butler's config file).",
        summary: 'Creates a directory in designated QVD directory.',
        body: {
            type: 'object',
            required: ['directory'],
            properties: {
                directory: {
                    type: 'string',
                    minLength: 1,
                    description: 'Directory that should be created.',
                    examples: ['subfolder/2020-10'],
                },
            },
        },
        response: {
            201: {
                description: 'Directory created.',
                type: 'object',
                properties: {
                    directory: {
                        type: 'string',
                        description: 'Directory that was created.',
                        examples: ['subfolder/2020-10'],
                    },
                },
            },
            400: {
                description: 'Required parameter missing.',
                type: 'object',
                properties: {
                    statusCode: { type: 'number' },
                    code: { type: 'string' },
                    error: { type: 'string' },
                    message: { type: 'string' },
                    time: { type: 'string' },
                },
            },
            500: {
                description: 'Internal error.',
                type: 'object',
                properties: {
                    statusCode: { type: 'number' },
                    code: { type: 'string' },
                    error: { type: 'string' },
                    message: { type: 'string' },
                    time: { type: 'string' },
                },
            },
        },
    },
};
