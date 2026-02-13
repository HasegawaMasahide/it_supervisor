#!/usr/bin/env tsx

/**
 * Package Dependency Graph Generator
 *
 * Analyzes the monorepo structure and generates a dependency graph
 * showing relationships between packages.
 *
 * Output formats:
 * - JSON: Machine-readable dependency data
 * - Mermaid: Visual diagram in Markdown
 * - DOT: GraphViz format for advanced visualization
 */

import fs from 'fs';
import path from 'path';

interface PackageInfo {
  name: string;
  version: string;
  location: string;
  dependencies: string[];
  devDependencies: string[];
  peerDependencies: string[];
}

interface DependencyGraph {
  packages: Record<string, PackageInfo>;
  edges: Array<{ from: string; to: string; type: 'runtime' | 'dev' | 'peer' }>;
  cycles: string[][];
}

/**
 * Load package.json from a directory
 */
function loadPackageJson(dir: string): any {
  const pkgPath = path.join(dir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    return null;
  }
  const content = fs.readFileSync(pkgPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Extract workspace packages
 */
function getWorkspacePackages(rootDir: string): PackageInfo[] {
  const packages: PackageInfo[] = [];
  const packagesDir = path.join(rootDir, 'packages');

  if (!fs.existsSync(packagesDir)) {
    return packages;
  }

  const dirs = fs.readdirSync(packagesDir, { withFileTypes: true });

  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;

    const pkgDir = path.join(packagesDir, dir.name);
    const pkg = loadPackageJson(pkgDir);

    if (!pkg) continue;

    packages.push({
      name: pkg.name,
      version: pkg.version,
      location: `packages/${dir.name}`,
      dependencies: Object.keys(pkg.dependencies || {}),
      devDependencies: Object.keys(pkg.devDependencies || {}),
      peerDependencies: Object.keys(pkg.peerDependencies || {}),
    });
  }

  return packages;
}

/**
 * Build dependency graph
 */
function buildDependencyGraph(packages: PackageInfo[]): DependencyGraph {
  const graph: DependencyGraph = {
    packages: {},
    edges: [],
    cycles: [],
  };

  // Build packages map
  for (const pkg of packages) {
    graph.packages[pkg.name] = pkg;
  }

  // Build edges
  for (const pkg of packages) {
    // Runtime dependencies
    for (const dep of pkg.dependencies) {
      if (graph.packages[dep]) {
        graph.edges.push({ from: pkg.name, to: dep, type: 'runtime' });
      }
    }

    // Dev dependencies
    for (const dep of pkg.devDependencies) {
      if (graph.packages[dep]) {
        graph.edges.push({ from: pkg.name, to: dep, type: 'dev' });
      }
    }

    // Peer dependencies
    for (const dep of pkg.peerDependencies) {
      if (graph.packages[dep]) {
        graph.edges.push({ from: pkg.name, to: dep, type: 'peer' });
      }
    }
  }

  // Detect cycles
  graph.cycles = detectCycles(graph);

  return graph;
}

/**
 * Detect circular dependencies using DFS
 */
function detectCycles(graph: DependencyGraph): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string): void {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const outgoing = graph.edges
      .filter((e) => e.from === node && e.type === 'runtime')
      .map((e) => e.to);

    for (const neighbor of outgoing) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (recursionStack.has(neighbor)) {
        // Found a cycle
        const cycleStart = path.indexOf(neighbor);
        const cycle = path.slice(cycleStart).concat(neighbor);
        cycles.push(cycle);
      }
    }

    path.pop();
    recursionStack.delete(node);
  }

  for (const pkg of Object.keys(graph.packages)) {
    if (!visited.has(pkg)) {
      dfs(pkg);
    }
  }

  return cycles;
}

/**
 * Generate JSON output
 */
function generateJSON(graph: DependencyGraph): string {
  return JSON.stringify(graph, null, 2);
}

/**
 * Generate Mermaid diagram
 */
function generateMermaid(graph: DependencyGraph): string {
  let output = '# Package Dependency Graph\n\n';
  output += '```mermaid\ngraph TD\n';

  // Add nodes
  for (const [name, pkg] of Object.entries(graph.packages)) {
    const label = name.replace('@it-supervisor/', '');
    output += `  ${sanitizeMermaidId(name)}["${label}<br/>${pkg.version}"]\n`;
  }

  output += '\n';

  // Add edges
  const runtimeEdges = graph.edges.filter((e) => e.type === 'runtime');
  const devEdges = graph.edges.filter((e) => e.type === 'dev');

  for (const edge of runtimeEdges) {
    output += `  ${sanitizeMermaidId(edge.from)} --> ${sanitizeMermaidId(edge.to)}\n`;
  }

  if (devEdges.length > 0) {
    output += '\n  %% Dev dependencies\n';
    for (const edge of devEdges) {
      output += `  ${sanitizeMermaidId(edge.from)} -.-> ${sanitizeMermaidId(edge.to)}\n`;
    }
  }

  output += '```\n\n';

  // Add legend
  output += '## Legend\n\n';
  output += '- **Solid line (→)**: Runtime dependency\n';
  output += '- **Dashed line (⇢)**: Dev dependency\n\n';

  // Add cycle warnings
  if (graph.cycles.length > 0) {
    output += '## ⚠️ Circular Dependencies Detected\n\n';
    for (let i = 0; i < graph.cycles.length; i++) {
      const cycle = graph.cycles[i];
      output += `${i + 1}. ${cycle.join(' → ')}\n`;
    }
    output += '\n';
  } else {
    output += '## ✅ No Circular Dependencies\n\n';
  }

  return output;
}

/**
 * Sanitize package name for Mermaid ID
 */
function sanitizeMermaidId(name: string): string {
  return name.replace(/[@/.-]/g, '_');
}

/**
 * Generate DOT (GraphViz) format
 */
function generateDOT(graph: DependencyGraph): string {
  let output = 'digraph PackageDependencies {\n';
  output += '  rankdir=LR;\n';
  output += '  node [shape=box, style=rounded];\n\n';

  // Add nodes
  for (const [name, pkg] of Object.entries(graph.packages)) {
    const label = `${name.replace('@it-supervisor/', '')}\\n${pkg.version}`;
    const color = graph.cycles.some((cycle) => cycle.includes(name)) ? 'red' : 'black';
    output += `  "${name}" [label="${label}", color="${color}"];\n`;
  }

  output += '\n';

  // Add edges
  for (const edge of graph.edges) {
    const style = edge.type === 'runtime' ? 'solid' : 'dashed';
    const color = edge.type === 'runtime' ? 'black' : 'gray';
    output += `  "${edge.from}" -> "${edge.to}" [style=${style}, color=${color}];\n`;
  }

  output += '}\n';

  return output;
}

/**
 * Main function
 */
function main() {
  const rootDir = process.cwd();
  const outputDir = path.join(rootDir, '.tmp');

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('🔍 Analyzing package dependencies...\n');

  // Load packages
  const packages = getWorkspacePackages(rootDir);
  console.log(`Found ${packages.length} packages:\n`);
  for (const pkg of packages) {
    console.log(`  - ${pkg.name} (${pkg.version})`);
  }
  console.log();

  // Build dependency graph
  const graph = buildDependencyGraph(packages);

  console.log(`📊 Dependency Statistics:\n`);
  console.log(`  - Packages: ${Object.keys(graph.packages).length}`);
  console.log(`  - Dependencies: ${graph.edges.filter((e) => e.type === 'runtime').length}`);
  console.log(`  - Dev Dependencies: ${graph.edges.filter((e) => e.type === 'dev').length}`);
  console.log(`  - Circular Dependencies: ${graph.cycles.length}\n`);

  // Generate outputs
  const jsonPath = path.join(outputDir, 'dependency-graph.json');
  const mermaidPath = path.join(outputDir, 'dependency-graph.md');
  const dotPath = path.join(outputDir, 'dependency-graph.dot');

  fs.writeFileSync(jsonPath, generateJSON(graph));
  console.log(`✅ JSON output: ${jsonPath}`);

  fs.writeFileSync(mermaidPath, generateMermaid(graph));
  console.log(`✅ Mermaid output: ${mermaidPath}`);

  fs.writeFileSync(dotPath, generateDOT(graph));
  console.log(`✅ DOT output: ${dotPath}`);

  console.log();

  // Display warnings
  if (graph.cycles.length > 0) {
    console.log('⚠️  WARNING: Circular dependencies detected!');
    console.log('   This can cause issues with module resolution and bundling.\n');
    for (let i = 0; i < graph.cycles.length; i++) {
      const cycle = graph.cycles[i];
      console.log(`   ${i + 1}. ${cycle.join(' → ')}`);
    }
    console.log();
    process.exit(1);
  } else {
    console.log('✅ No circular dependencies found.\n');
    console.log('📦 Dependency graph generated successfully!');
    process.exit(0);
  }
}

// Run
main();
