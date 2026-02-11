import { RepositoryAnalyzer } from '@it-supervisor/repo-analyzer';
import { LogLevel } from '@it-supervisor/logger';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  console.log('=== Repository Analysis Example ===\n');

  // 1. Initialize the analyzer
  const analyzer = new RepositoryAnalyzer();

  // For this example, we'll analyze the parent monorepo
  const repoPath = path.resolve(__dirname, '../../..');

  try {
    // 2. Run comprehensive repository analysis
    console.log(`Analyzing repository: ${repoPath}\n`);

    const result = await analyzer.analyzeLocal(repoPath, {
      maxFiles: 1000,
      excludePatterns: ['node_modules', '.git', 'dist', 'coverage', '.tmp'],
      calculateComplexity: true,
    });

    // 3. Display metadata
    console.log('=== Repository Metadata ===\n');
    console.log(`Name: ${result.metadata.name || 'Unknown'}`);
    console.log(`Description: ${result.metadata.description || 'N/A'}`);
    console.log(`Default Branch: ${result.metadata.defaultBranch || 'N/A'}`);
    console.log(`Has README: ${result.metadata.hasReadme ? 'Yes' : 'No'}`);
    console.log(`Has LICENSE: ${result.metadata.hasLicense ? 'Yes' : 'No'}`);
    console.log(`Has Dockerfile: ${result.metadata.hasDockerfile ? 'Yes' : 'No'}`);

    // 4. Display file statistics
    console.log('\n=== File Statistics ===\n');
    console.log(`Total Files: ${result.fileStats.totalFiles}`);
    console.log(`Total Lines: ${result.fileStats.totalLines.toLocaleString()}`);
    console.log(`Code Lines: ${result.fileStats.codeLines.toLocaleString()}`);
    console.log(`Comment Lines: ${result.fileStats.commentLines.toLocaleString()}`);
    console.log(`Blank Lines: ${result.fileStats.blankLines.toLocaleString()}`);
    console.log(`Average Lines per File: ${result.fileStats.avgLinesPerFile.toFixed(1)}`);

    // 5. Display language statistics
    console.log('\n=== Language Distribution ===\n');
    const sortedLanguages = result.techStack.languages
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5); // Top 5 languages

    sortedLanguages.forEach((lang, index) => {
      const bar = '█'.repeat(Math.round(lang.percentage / 2));
      console.log(
        `${index + 1}. ${lang.name.padEnd(15)} ${lang.percentage.toFixed(1)}% ${bar}`
      );
      console.log(`   Files: ${lang.fileCount}, Lines: ${lang.lineCount.toLocaleString()}`);
    });

    // 6. Display detected frameworks
    if (result.techStack.frameworks.length > 0) {
      console.log('\n=== Detected Frameworks ===\n');
      result.techStack.frameworks.forEach((fw) => {
        console.log(`- ${fw.name} (${fw.type}) ${fw.version ? `v${fw.version}` : ''}`);
      });
    }

    // 7. Display dependencies summary
    if (result.techStack.dependencies.length > 0) {
      console.log('\n=== Dependencies Summary ===\n');

      const prodDeps = result.techStack.dependencies.filter(d => d.type === 'production');
      const devDeps = result.techStack.dependencies.filter(d => d.type === 'development');

      console.log(`Production: ${prodDeps.length} packages`);
      console.log(`Development: ${devDeps.length} packages`);

      // Show top 5 production dependencies
      if (prodDeps.length > 0) {
        console.log('\nTop Production Dependencies:');
        prodDeps.slice(0, 5).forEach((dep) => {
          console.log(`  - ${dep.name}@${dep.version || 'latest'}`);
        });
      }
    }

    // 8. Display Git history
    if (result.gitHistory) {
      console.log('\n=== Git History ===\n');
      console.log(`Total Commits: ${result.gitHistory.totalCommits}`);
      console.log(`Contributors: ${result.gitHistory.contributors.length}`);
      console.log(`First Commit: ${result.gitHistory.firstCommit?.toISOString().split('T')[0]}`);
      console.log(`Last Commit: ${result.gitHistory.lastCommit?.toISOString().split('T')[0]}`);

      // Show top contributors
      if (result.gitHistory.contributors.length > 0) {
        console.log('\nTop Contributors:');
        result.gitHistory.contributors
          .sort((a, b) => b.commits - a.commits)
          .slice(0, 3)
          .forEach((contributor, index) => {
            console.log(`  ${index + 1}. ${contributor.name} (${contributor.commits} commits)`);
          });
      }
    }

    // 9. Display complexity metrics (if available)
    const complexFiles = result.fileStats.filesByComplexity?.slice(0, 5);
    if (complexFiles && complexFiles.length > 0) {
      console.log('\n=== Most Complex Files ===\n');
      complexFiles.forEach((file, index) => {
        console.log(`${index + 1}. ${file.path}`);
        console.log(`   Complexity: ${file.complexity}, Lines: ${file.lines}`);
      });
    }

    // 10. Display entry points (if detected)
    if (result.fileStats.entryPoints && result.fileStats.entryPoints.length > 0) {
      console.log('\n=== Detected Entry Points ===\n');
      result.fileStats.entryPoints.forEach((entry) => {
        console.log(`- ${entry}`);
      });
    }

    console.log('\n✓ Analysis completed successfully');

  } catch (error) {
    console.error('\n✗ Analysis failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run the example
main().catch(console.error);
