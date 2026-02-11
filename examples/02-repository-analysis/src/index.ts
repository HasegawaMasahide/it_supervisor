import { RepositoryAnalyzer } from '@it-supervisor/repo-analyzer';
import { createLogger, LogLevel } from '@it-supervisor/logger';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logger = createLogger({ name: 'example', level: LogLevel.INFO });

async function main() {
  logger.info('=== Repository Analysis Example ===\n');

  // 1. Initialize the analyzer
  const analyzer = new RepositoryAnalyzer();

  // For this example, we'll analyze the parent monorepo
  const repoPath = path.resolve(__dirname, '../../..');

  try {
    // 2. Run comprehensive repository analysis
    logger.info(`Analyzing repository: ${repoPath}\n`);

    const result = await analyzer.analyzeLocal(repoPath, {
      maxFiles: 1000,
      excludePatterns: ['node_modules', '.git', 'dist', 'coverage', '.tmp'],
      calculateComplexity: true,
    });

    // 3. Display metadata
    logger.info('=== Repository Metadata ===\n');
    logger.info(`Name: ${result.metadata.name || 'Unknown'}`);
    logger.info(`Description: ${result.metadata.description || 'N/A'}`);
    logger.info(`Default Branch: ${result.metadata.defaultBranch || 'N/A'}`);
    logger.info(`Has README: ${result.metadata.hasReadme ? 'Yes' : 'No'}`);
    logger.info(`Has LICENSE: ${result.metadata.hasLicense ? 'Yes' : 'No'}`);
    logger.info(`Has Dockerfile: ${result.metadata.hasDockerfile ? 'Yes' : 'No'}`);

    // 4. Display file statistics
    logger.info('\n=== File Statistics ===\n');
    logger.info(`Total Files: ${result.fileStats.totalFiles}`);
    logger.info(`Total Lines: ${result.fileStats.totalLines.toLocaleString()}`);
    logger.info(`Code Lines: ${result.fileStats.codeLines.toLocaleString()}`);
    logger.info(`Comment Lines: ${result.fileStats.commentLines.toLocaleString()}`);
    logger.info(`Blank Lines: ${result.fileStats.blankLines.toLocaleString()}`);
    logger.info(`Average Lines per File: ${result.fileStats.avgLinesPerFile.toFixed(1)}`);

    // 5. Display language statistics
    logger.info('\n=== Language Distribution ===\n');
    const sortedLanguages = result.techStack.languages
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5); // Top 5 languages

    sortedLanguages.forEach((lang, index) => {
      const bar = '█'.repeat(Math.round(lang.percentage / 2));
      logger.info(
        `${index + 1}. ${lang.name.padEnd(15)} ${lang.percentage.toFixed(1)}% ${bar}`
      );
      logger.info(`   Files: ${lang.fileCount}, Lines: ${lang.lineCount.toLocaleString()}`);
    });

    // 6. Display detected frameworks
    if (result.techStack.frameworks.length > 0) {
      logger.info('\n=== Detected Frameworks ===\n');
      result.techStack.frameworks.forEach((fw) => {
        logger.info(`- ${fw.name} (${fw.type}) ${fw.version ? `v${fw.version}` : ''}`);
      });
    }

    // 7. Display dependencies summary
    if (result.techStack.dependencies.length > 0) {
      logger.info('\n=== Dependencies Summary ===\n');

      const prodDeps = result.techStack.dependencies.filter(d => d.type === 'production');
      const devDeps = result.techStack.dependencies.filter(d => d.type === 'development');

      logger.info(`Production: ${prodDeps.length} packages`);
      logger.info(`Development: ${devDeps.length} packages`);

      // Show top 5 production dependencies
      if (prodDeps.length > 0) {
        logger.info('\nTop Production Dependencies:');
        prodDeps.slice(0, 5).forEach((dep) => {
          logger.info(`  - ${dep.name}@${dep.version || 'latest'}`);
        });
      }
    }

    // 8. Display Git history
    if (result.gitHistory) {
      logger.info('\n=== Git History ===\n');
      logger.info(`Total Commits: ${result.gitHistory.totalCommits}`);
      logger.info(`Contributors: ${result.gitHistory.contributors.length}`);
      logger.info(`First Commit: ${result.gitHistory.firstCommit?.toISOString().split('T')[0]}`);
      logger.info(`Last Commit: ${result.gitHistory.lastCommit?.toISOString().split('T')[0]}`);

      // Show top contributors
      if (result.gitHistory.contributors.length > 0) {
        logger.info('\nTop Contributors:');
        result.gitHistory.contributors
          .sort((a, b) => b.commits - a.commits)
          .slice(0, 3)
          .forEach((contributor, index) => {
            logger.info(`  ${index + 1}. ${contributor.name} (${contributor.commits} commits)`);
          });
      }
    }

    // 9. Display complexity metrics (if available)
    const complexFiles = result.fileStats.filesByComplexity?.slice(0, 5);
    if (complexFiles && complexFiles.length > 0) {
      logger.info('\n=== Most Complex Files ===\n');
      complexFiles.forEach((file, index) => {
        logger.info(`${index + 1}. ${file.path}`);
        logger.info(`   Complexity: ${file.complexity}, Lines: ${file.lines}`);
      });
    }

    // 10. Display entry points (if detected)
    if (result.fileStats.entryPoints && result.fileStats.entryPoints.length > 0) {
      logger.info('\n=== Detected Entry Points ===\n');
      result.fileStats.entryPoints.forEach((entry) => {
        logger.info(`- ${entry}`);
      });
    }

    logger.info('\n✓ Analysis completed successfully');

  } catch (error) {
    logger.error('\n✗ Analysis failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run the example
main().catch((err) => logger.error(err));
