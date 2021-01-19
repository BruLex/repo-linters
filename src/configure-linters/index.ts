import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { externalSchematic, chain } from '@angular-devkit/schematics';
import {
    addPrettierPackages,
    addESLintPluginsPackages,
    updateESLintConfigForProject,
    addStylelintPackages,
    addStylelintConfigForProject,
    addPackageInstallTask,
    addPrettierConfigForProject,
    determineTargetProjectName
} from '../utils';

export interface Schema {
    project: string;
}

export function configureLinters(schema: Schema): Rule {
    return (tree: Tree, _context: SchematicContext) => {
        const projectName = determineTargetProjectName(tree, schema.project);
        if (!projectName) {
            throw new Error(
                '\n' +
                    `
Error: You must specify a project to add ESLint to because you have multiple projects in your angular.json
E.g. npx ng g angular-brulex-lint:configure-linters {{YOUR_PROJECT_NAME_GOES_HERE}}
        `.trim()
            );
        }
        return chain([
            externalSchematic('@angular-eslint/schematics', 'add-eslint-to-project', {
                project: projectName
            }),
            addPrettierPackages(),
            addPrettierConfigForProject(projectName),
            addESLintPluginsPackages(),
            updateESLintConfigForProject(projectName),
            addStylelintPackages(),
            addStylelintConfigForProject(projectName),
            addPackageInstallTask()
        ]);
    };
}
