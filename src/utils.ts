import { join, normalize } from '@angular-devkit/core';
import { Rule, Tree, SchematicContext } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';

import stripJsonComments from 'strip-json-comments';

function serializeJson(json: unknown): string {
    return `${JSON.stringify(json, null, 2)}\n`;
}

function readJsonInTree<T = any>(host: Tree, path: string): T {
    if (!host.exists(path)) {
        throw new Error(`Cannot find ${path}`);
    }
    const contents = stripJsonComments((host.read(path) as Buffer).toString('utf-8'));
    try {
        return JSON.parse(contents);
    } catch (e) {
        throw new Error(`Cannot parse ${path}: ${e.message}`);
    }
}

export function sortObjectByKeys(obj: Record<string, unknown>): Record<string, unknown> {
    return Object.keys(obj)
        .sort()
        .reduce((result, key) => {
            return {
                ...result,
                [key]: obj[key]
            };
        }, {});
}

/**
 * This method is specifically for updating JSON in a Tree
 * @param path Path of JSON file in the Tree
 * @param callback Manipulation of the JSON data
 * @returns A rule which updates a JSON file file in a Tree
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function updateJsonInTree<T = any, O = T>(path: string, callback: (json: T, context: SchematicContext) => O): Rule {
    return (host: Tree, context: SchematicContext): Tree => {
        if (!host.exists(path)) {
            host.create(path, serializeJson(callback({} as T, context)));
            return host;
        }
        host.overwrite(path, serializeJson(callback(readJsonInTree(host, path), context)));
        return host;
    };
}

function addPackageJsonDeps(
    packageJson: Record<'dependencies' | 'devDependencies', Record<string, string>>,
    options: Partial<Record<'dependencies' | 'devDependencies', Record<string, string>>>
): object {
    if (typeof packageJson !== 'object') {
        return packageJson;
    }

    function addDeps(section: 'dependencies' | 'devDependencies'): void {
        if (!options[section]) {
            return;
        }
        if (!(section in packageJson)) {
            packageJson[section] = {};
        }
        Object.entries(options[section] ?? {}).forEach(([packageToAdd, version]) => {
            packageJson[section][packageToAdd] = version;
        });
    }

    addDeps('dependencies');
    addDeps('devDependencies');

    return packageJson;
}

function createProjectESLintConfig(prefix: string) {
    return {
        root: true,
        ignorePatterns: ['projects/**/*'],
        overrides: [
            {
                files: ['*.ts'],
                parserOptions: {
                    project: ['tsconfig.json'],
                    createDefaultProgram: true
                },
                extends: [
                    'eslint:recommended',
                    'plugin:@typescript-eslint/recommended',
                    'plugin:@typescript-eslint/recommended-requiring-type-checking',
                    'plugin:rxjs/recommended',
                    'plugin:@angular-eslint/recommended',
                    'plugin:@angular-eslint/recommended--extra',
                    'plugin:@angular-eslint/template/process-inline-templates',
                    'plugin:import/recommended',
                    'plugin:import/typescript',
                    'plugin:prettier/recommended'
                ],
                settings: {
                    'import/resolver': {
                        typescript: {
                            alwaysTryTypes: true,
                            project: ['tsconfig.json']
                        }
                    }
                },
                rules: {
                    'prettier/prettier': 'error',
                    '@angular-eslint/component-selector': ['error', { type: 'element', prefix, style: 'kebab-case' }],
                    '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix, style: 'camelCase' }],
                    '@angular-eslint/use-lifecycle-interface': 'error', // override
                    '@typescript-eslint/dot-notation': 'off',
                    '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
                    '@typescript-eslint/explicit-member-accessibility': ['error', { accessibility: 'no-public' }],
                    '@typescript-eslint/lines-between-class-members': [
                        'error',
                        'always',
                        { exceptAfterSingleLine: true }
                    ],
                    // TODO Consider using this rule with specified option in tsconfig.json
                    '@typescript-eslint/no-inferrable-types': 'off', // override
                    '@typescript-eslint/typedef': [
                        'error',
                        {
                            propertyDeclaration: true,
                            variableDeclaration: true,
                            parameter: true,
                            memberVariableDeclaration: true,
                            arrowParameter: false
                        }
                    ],
                    'no-shadow': 'off',
                    '@typescript-eslint/no-shadow': 'error',
                    '@typescript-eslint/no-unused-expressions': 'error',
                    '@typescript-eslint/prefer-for-of': 'error',
                    'import/no-extraneous-dependencies': 'error',
                    'import/order': 'error',
                    'import/prefer-default-export': 'off',
                    'rxjs/finnish': [
                        'error',
                        {
                            functions: true,
                            methods: true,
                            names: {
                                '^(canActivate|canActivateChild|canDeactivate|canLoad|intercept|resolve|validate)$':
                                    false
                            },
                            parameters: true,
                            properties: true,
                            strict: false,
                            types: {
                                '^EventEmitter$': false
                            },
                            variables: true
                        }
                    ],
                    'rxjs/no-topromise': 'error',
                    'rxjs/suffix-subjects': [
                        'error',
                        {
                            parameters: true,
                            properties: true,
                            suffix: '$',
                            types: {
                                '^EventEmitter$': false
                            },
                            variables: true
                        }
                    ],
                    curly: 'error',
                    'default-case': 'error',
                    eqeqeq: ['error', 'smart'],
                    'guard-for-in': 'error',
                    'no-caller': 'error',
                    'no-duplicate-imports': 'error',
                    'no-else-return': ['error', { allowElseIf: false }],
                    'no-eval': 'error',
                    'no-new-wrappers': 'error',
                    'no-plusplus': 'error',
                    'no-restricted-imports': [
                        'error',
                        {
                            paths: [
                                {
                                    name: 'rxjs/Rx',
                                    message: "Please import directly from 'rxjs' instead"
                                }
                            ],
                            patterns: [
                                {
                                    group: ['lodash/*', 'lodash'],
                                    message: 'Please use lodash-es that uses es modules'
                                }
                            ]
                        }
                    ],
                    'no-useless-constructor': 'error',
                    radix: 'error',
                    'spaced-comment': ['error', 'always', { markers: ['/'] }]
                }
            },
            {
                files: ['*.html'],
                extends: ['plugin:@angular-eslint/template/recommended'],
                rules: {}
            }
        ]
    };
}

export function updateESLintConfigForProject(projectName: string): Rule {
    return (tree: Tree) => {
        const angularJSON = readJsonInTree(tree, 'angular.json');
        const { prefix = 'app' } = angularJSON.projects[projectName];

        return updateJsonInTree('.eslintrc.json', () => createProjectESLintConfig(prefix));
    };
}

function createProjectStylelintConfig() {
    return {
        extends: ['stylelint-config-standard', 'stylelint-config-recommended-scss', 'stylelint-prettier/recommended'],
        plugins: ['stylelint-scss', 'stylelint-order', 'stylelint-prettier'],
        rules: {
            'at-rule-no-vendor-prefix': true,
            'color-named': 'never',
            'declaration-block-no-duplicate-properties': true,
            'declaration-no-important': true,
            'font-family-name-quotes': 'always-where-recommended',
            'function-url-quotes': 'always',
            'max-nesting-depth': 5,
            'media-feature-name-no-vendor-prefix': true,
            'property-no-vendor-prefix': true,
            'selector-max-id': 0,
            'selector-no-vendor-prefix': true,
            'selector-pseudo-element-no-unknown': [true, { ignorePseudoElements: ['ng-deep'] }],
            'value-no-vendor-prefix': true,

            'order/properties-alphabetical-order': true,

            'scss/at-each-key-value-single-line': true,
            'scss/at-else-closing-brace-newline-after': 'always-last-in-chain',
            'scss/at-else-empty-line-before': 'never',
            'scss/at-else-if-parentheses-space-before': 'always',
            'scss/at-extend-no-missing-placeholder': true,
            'scss/at-function-parentheses-space-before': 'never',
            'scss/at-if-closing-brace-newline-after': 'always-last-in-chain',
            'scss/at-if-closing-brace-space-after': 'always-intermediate',
            'scss/at-if-no-null': true,
            'scss/at-mixin-argumentless-call-parentheses': 'never',
            'scss/at-mixin-named-arguments': 'never',
            'scss/at-mixin-parentheses-space-before': 'never',
            'scss/comment-no-empty': true,
            'scss/comment-no-loud': true,
            'scss/declaration-nested-properties': 'never',
            'scss/dollar-variable-colon-space-after': 'always',
            'scss/dollar-variable-colon-space-before': 'never',
            'scss/dollar-variable-empty-line-after': [
                'always',
                { except: ['last-nested', 'before-comment', 'before-dollar-variable'] }
            ],
            'scss/dollar-variable-empty-line-before': [
                'always',
                { except: ['first-nested', 'after-comment', 'after-dollar-variable'] }
            ],
            'scss/dollar-variable-first-in-block': [true, { except: ['function'], ignore: ['comments', 'imports'] }],
            'scss/dollar-variable-no-missing-interpolation': true,
            'scss/double-slash-comment-whitespace-inside': 'always',
            'scss/function-quote-no-quoted-strings-inside': true,
            'scss/function-unquote-no-unquoted-strings-inside': true,
            'scss/no-duplicate-dollar-variables': [
                true,
                { ignoreInside: ['nested-at-rule'], ignoreInsideAtRules: ['function'] }
            ],
            'scss/no-duplicate-mixins': true,
            'scss/operator-no-newline-after': true,
            'scss/operator-no-newline-before': true,
            'scss/operator-no-unspaced': true,
            'scss/selector-nest-combinators': 'always',
            'scss/selector-no-union-class-name': true,

            'prettier/prettier': true
        }
    };
}

export function addStylelintConfigForProject(projectName: string): Rule {
    return (tree: Tree) => {
        const angularJSON = readJsonInTree(tree, 'angular.json');
        const { root: projectRoot } = angularJSON.projects[projectName];

        return updateJsonInTree(join(normalize(projectRoot), '.stylelintrc.json'), () =>
            createProjectStylelintConfig()
        );
    };
}

function createPrettierConfig() {
    return {
        singleQuote: true,
        tabWidth: 4,
        printWidth: 120,
        trailingComma: 'none',
        arrowParens: 'avoid',
        endOfLine: 'auto',
        attributeGroups: [
            '$ANGULAR_ELEMENT_REF',
            '$ANGULAR_STRUCTURAL_DIRECTIVE',
            '$CLASS',
            '$ID',
            '$DEFAULT',
            '$ANGULAR_ANIMATION',
            '$ANGULAR_ANIMATION_INPUT',
            '$ANGULAR_INPUT',
            '$ANGULAR_TWO_WAY_BINDING',
            '$ANGULAR_OUTPUT'
        ]
    };
}

export function addPrettierConfigForProject(projectName: string): Rule {
    return (tree: Tree) => {
        const angularJSON = readJsonInTree(tree, 'angular.json');
        console.log(projectName, angularJSON.projects);
        const { root: projectRoot } = angularJSON.projects[projectName];

        return updateJsonInTree(join(normalize(projectRoot), '.prettierrc.json'), () => createPrettierConfig());
    };
}

export function addPrettierPackages(): Rule {
    return (host: Tree, context: SchematicContext) => {
        if (!host.exists('package.json')) {
            throw new Error('Could not find a `package.json` file at the root of your workspace');
        }
        const projectPackageJSON = (host.read('package.json') as Buffer).toString('utf-8');
        const json = JSON.parse(projectPackageJSON);

        addPackageJsonDeps(json, {
            devDependencies: {
                prettier: '2.4.1',
                'prettier-plugin-organize-attributes': '^0.0.4'
            }
        });

        json.devDependencies = sortObjectByKeys(json.devDependencies);
        host.overwrite('package.json', JSON.stringify(json, null, 4));

        context.logger.info(`
The following prettier packages was added to project 🎉
  * prettier
  * prettier-plugin-organize-attributes
`);

        return host;
    };
}

export function addESLintPluginsPackages(): Rule {
    return (host: Tree, context: SchematicContext) => {
        if (!host.exists('package.json')) {
            throw new Error('Could not find a `package.json` file at the root of your workspace');
        }

        const projectPackageJSON = (host.read('package.json') as Buffer).toString('utf-8');
        const json = JSON.parse(projectPackageJSON);

        addPackageJsonDeps(json, {
            devDependencies: {
                'eslint-plugin-import': '^2.24.2',
                'eslint-import-resolver-typescript': '^2.5.0',
                'eslint-plugin-rxjs': '^3.3.7',
                'eslint-config-prettier': '^8.3.0',
                'eslint-plugin-prettier': '^4.0.0'
            }
        });

        json.devDependencies = sortObjectByKeys(json.devDependencies);
        host.overwrite('package.json', JSON.stringify(json, null, 4));

        context.logger.info(`
The following eslint plugins was added to project 🎉
  * eslint-plugin-prettier
  * eslint-config-prettier
  * eslint-import-resolver-typescript
  * eslint-plugin-import
  * eslint-plugin-rxjs
`);

        return host;
    };
}

export function addStylelintPackages(): Rule {
    return (host: Tree, context: SchematicContext) => {
        if (!host.exists('package.json')) {
            throw new Error('Could not find a `package.json` file at the root of your workspace');
        }
        const projectPackageJSON = (host.read('package.json') as Buffer).toString('utf-8');
        const json = JSON.parse(projectPackageJSON);

        addPackageJsonDeps(json, {
            devDependencies: {
                stylelint: '^13.13.1',
                'stylelint-config-prettier': '^8.0.2',
                'stylelint-config-standard': '^22.0.0',
                'stylelint-config-recommended-scss': '4.3.0',
                'stylelint-order': '^4.1.0',
                'stylelint-prettier': '^1.2.0',
                'stylelint-scss': '^3.21.0'
            }
        });

        json.devDependencies = sortObjectByKeys(json.devDependencies);
        host.overwrite('package.json', JSON.stringify(json, null, 4));

        context.logger.info(`
The following stylelint related packages was added to project 🎉
  * stylelint
  * stylelint-config-prettier
  * stylelint-config-standard
  * stylelint-order
  * stylelint-prettier
  * stylelint-scss
`);
        return host;
    };
}

export function addPackageInstallTask(): Rule {
    return (host: Tree, context: SchematicContext) => {
        context.addTask(new NodePackageInstallTask());
        return host;
    };
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getWorkspacePath(host: Tree) {
    const possibleFiles = ['/workspace.json', '/angular.json', '/.angular.json'];
    return possibleFiles.filter(path => host.exists(path))[0];
}

export function determineTargetProjectName(tree: Tree, maybeProject?: string): string | null {
    if (maybeProject) {
        return maybeProject;
    }
    const workspaceJson = readJsonInTree(tree, getWorkspacePath(tree));
    const projects = Object.keys(workspaceJson.projects);
    if (projects.length === 1) {
        return projects[0];
    }
    return null;
}
