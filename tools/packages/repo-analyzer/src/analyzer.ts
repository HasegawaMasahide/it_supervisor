import { promises as fs } from 'fs';
import * as path from 'path';
import { simpleGit, SimpleGit } from 'simple-git';
import {
  RepositoryAnalysisResult,
  AnalysisOptions,
  FileStats,
  TechStack,
  DirectoryNode,
  GitHistory,
  Language,
  Framework,
  Dependency,
  Contributor,
  LanguageStats
} from './types.js';

/**
 * リポジトリ解析クラス
 */
export class RepositoryAnalyzer {
  private git: SimpleGit | null = null;

  /**
   * ローカルリポジトリを解析
   */
  async analyzeLocal(
    repoPath: string,
    options: AnalysisOptions = {}
  ): Promise<RepositoryAnalysisResult> {
    const absolutePath = path.resolve(repoPath);

    // ディレクトリの存在確認
    try {
      await fs.access(absolutePath);
    } catch (error) {
      throw new Error(`Repository path not found: ${absolutePath}`);
    }

    const excludePatterns = options.excludePatterns || [
      'node_modules',
      'vendor',
      'dist',
      'build',
      '.git',
      'coverage',
      '.next',
      '__pycache__'
    ];

    // Git初期化
    const hasGit = await this.checkGitRepository(absolutePath);
    if (hasGit) {
      this.git = simpleGit(absolutePath);
    }

    // 並行解析
    const [fileStats, structure, techStack, gitHistory, metadata] = await Promise.all([
      this.analyzeFileStats(absolutePath, excludePatterns),
      this.analyzeStructure(absolutePath, excludePatterns, options.maxDepth || 5),
      this.analyzeTechStack(absolutePath, options.includeDependencies !== false),
      hasGit && options.includeGitHistory !== false
        ? this.analyzeGitHistory()
        : Promise.resolve(undefined),
      this.analyzeMetadata(absolutePath)
    ]);

    return {
      path: absolutePath,
      analyzedAt: new Date(),
      techStack,
      fileStats,
      structure,
      gitHistory,
      metadata
    };
  }

  /**
   * Gitリポジトリかチェック
   */
  private async checkGitRepository(repoPath: string): Promise<boolean> {
    try {
      const gitPath = path.join(repoPath, '.git');
      await fs.access(gitPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * ファイル統計を解析
   */
  private async analyzeFileStats(
    repoPath: string,
    excludePatterns: string[]
  ): Promise<FileStats> {
    const files = await this.getAllFiles(repoPath, excludePatterns);

    const byExtension: Record<string, number> = {};
    const byLanguage: Record<string, LanguageStats> = {};

    let totalLines = 0;
    let totalCodeLines = 0;
    let totalBlankLines = 0;
    let totalCommentLines = 0;

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      byExtension[ext] = (byExtension[ext] || 0) + 1;

      // ファイル内容を解析
      const stats = await this.analyzeFile(file);
      totalLines += stats.lines;
      totalCodeLines += stats.codeLines;
      totalBlankLines += stats.blankLines;
      totalCommentLines += stats.commentLines;

      // 言語別に集計
      const language = this.detectLanguage(ext);
      if (!byLanguage[language]) {
        byLanguage[language] = {
          files: 0,
          lines: 0,
          blankLines: 0,
          commentLines: 0,
          codeLines: 0
        };
      }
      byLanguage[language].files++;
      byLanguage[language].lines += stats.lines;
      byLanguage[language].blankLines += stats.blankLines;
      byLanguage[language].commentLines += stats.commentLines;
      byLanguage[language].codeLines += stats.codeLines;
    }

    return {
      totalFiles: files.length,
      totalLines,
      totalCodeLines,
      totalBlankLines,
      totalCommentLines,
      byLanguage,
      byExtension
    };
  }

  /**
   * ディレクトリ構造を解析
   */
  private async analyzeStructure(
    repoPath: string,
    excludePatterns: string[],
    maxDepth: number
  ): Promise<DirectoryNode> {
    const buildNode = async (
      nodePath: string,
      depth: number
    ): Promise<DirectoryNode> => {
      const stats = await fs.stat(nodePath);
      const name = path.basename(nodePath);

      if (stats.isFile()) {
        return {
          name,
          path: nodePath,
          type: 'file',
          size: stats.size
        };
      }

      // ディレクトリ
      const node: DirectoryNode = {
        name,
        path: nodePath,
        type: 'directory',
        children: []
      };

      if (depth < maxDepth) {
        const entries = await fs.readdir(nodePath);

        for (const entry of entries) {
          // 除外パターンチェック
          if (excludePatterns.some(pattern => entry === pattern)) {
            continue;
          }

          const entryPath = path.join(nodePath, entry);
          try {
            const childNode = await buildNode(entryPath, depth + 1);
            node.children!.push(childNode);
          } catch (error) {
            // アクセス権限エラー等は無視
          }
        }
      }

      return node;
    };

    return buildNode(repoPath, 0);
  }

  /**
   * 技術スタックを解析
   */
  private async analyzeTechStack(
    repoPath: string,
    includeDependencies: boolean
  ): Promise<TechStack> {
    const [languages, frameworks, dependencies] = await Promise.all([
      this.detectLanguages(repoPath),
      this.detectFrameworks(repoPath),
      includeDependencies ? this.detectDependencies(repoPath) : Promise.resolve([])
    ]);

    return { languages, frameworks, dependencies };
  }

  /**
   * 言語を検出
   */
  private async detectLanguages(repoPath: string): Promise<Language[]> {
    // 実装簡略化のため、拡張子ベースで検出
    const files = await this.getAllFiles(repoPath, ['node_modules', 'vendor', 'dist']);
    const languageMap = new Map<string, { files: number; lines: number }>();

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      const language = this.detectLanguage(ext);

      if (!languageMap.has(language)) {
        languageMap.set(language, { files: 0, lines: 0 });
      }

      const stats = languageMap.get(language)!;
      stats.files++;

      // 行数カウント（簡易版）
      try {
        const content = await fs.readFile(file, 'utf-8');
        stats.lines += content.split('\n').length;
      } catch {
        // バイナリファイル等は無視
      }
    }

    const totalLines = Array.from(languageMap.values()).reduce((sum, s) => sum + s.lines, 0);

    return Array.from(languageMap.entries()).map(([name, stats]) => ({
      name,
      extensions: this.getExtensionsForLanguage(name),
      files: stats.files,
      lines: stats.lines,
      percentage: totalLines > 0 ? (stats.lines / totalLines) * 100 : 0
    }));
  }

  /**
   * フレームワークを検出
   */
  private async detectFrameworks(repoPath: string): Promise<Framework[]> {
    const frameworks: Framework[] = [];

    // package.json (Node.js)
    try {
      const packageJson = JSON.parse(
        await fs.readFile(path.join(repoPath, 'package.json'), 'utf-8')
      );

      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      if (deps['react']) frameworks.push({ name: 'React', version: deps['react'], detectionMethod: 'package.json', confidence: 'high' });
      if (deps['vue']) frameworks.push({ name: 'Vue.js', version: deps['vue'], detectionMethod: 'package.json', confidence: 'high' });
      if (deps['@angular/core']) frameworks.push({ name: 'Angular', version: deps['@angular/core'], detectionMethod: 'package.json', confidence: 'high' });
      if (deps['express']) frameworks.push({ name: 'Express', version: deps['express'], detectionMethod: 'package.json', confidence: 'high' });
      if (deps['next']) frameworks.push({ name: 'Next.js', version: deps['next'], detectionMethod: 'package.json', confidence: 'high' });
    } catch {
      // package.jsonがない
    }

    // composer.json (PHP)
    try {
      const composerJson = JSON.parse(
        await fs.readFile(path.join(repoPath, 'composer.json'), 'utf-8')
      );

      const deps = { ...composerJson.require, ...composerJson['require-dev'] };

      if (deps['laravel/framework']) frameworks.push({ name: 'Laravel', version: deps['laravel/framework'], detectionMethod: 'composer.json', confidence: 'high' });
      if (deps['symfony/symfony']) frameworks.push({ name: 'Symfony', version: deps['symfony/symfony'], detectionMethod: 'composer.json', confidence: 'high' });
    } catch {
      // composer.jsonがない
    }

    // pom.xml (Java Maven)
    try {
      const pomXml = await fs.readFile(path.join(repoPath, 'pom.xml'), 'utf-8');
      if (pomXml.includes('spring-boot')) frameworks.push({ name: 'Spring Boot', detectionMethod: 'pom.xml', confidence: 'high' });
    } catch {
      // pom.xmlがない
    }

    // *.csproj (C# .NET)
    try {
      const files = await fs.readdir(repoPath);
      const csprojFiles = files.filter(f => f.endsWith('.csproj'));
      if (csprojFiles.length > 0) {
        const csproj = await fs.readFile(path.join(repoPath, csprojFiles[0]), 'utf-8');
        if (csproj.includes('Microsoft.AspNetCore')) frameworks.push({ name: 'ASP.NET Core', detectionMethod: '*.csproj', confidence: 'high' });
      }
    } catch {
      // .csprojがない
    }

    return frameworks;
  }

  /**
   * 依存関係を検出
   */
  private async detectDependencies(repoPath: string): Promise<Dependency[]> {
    const dependencies: Dependency[] = [];

    // package.json
    try {
      const packageJson = JSON.parse(
        await fs.readFile(path.join(repoPath, 'package.json'), 'utf-8')
      );

      if (packageJson.dependencies) {
        Object.entries(packageJson.dependencies).forEach(([name, version]) => {
          dependencies.push({ name, version: version as string, type: 'direct', ecosystem: 'npm' });
        });
      }

      if (packageJson.devDependencies) {
        Object.entries(packageJson.devDependencies).forEach(([name, version]) => {
          dependencies.push({ name, version: version as string, type: 'dev', ecosystem: 'npm' });
        });
      }
    } catch {
      // package.jsonがない
    }

    // composer.json
    try {
      const composerJson = JSON.parse(
        await fs.readFile(path.join(repoPath, 'composer.json'), 'utf-8')
      );

      if (composerJson.require) {
        Object.entries(composerJson.require).forEach(([name, version]) => {
          dependencies.push({ name, version: version as string, type: 'direct', ecosystem: 'composer' });
        });
      }

      if (composerJson['require-dev']) {
        Object.entries(composerJson['require-dev']).forEach(([name, version]) => {
          dependencies.push({ name, version: version as string, type: 'dev', ecosystem: 'composer' });
        });
      }
    } catch {
      // composer.jsonがない
    }

    return dependencies;
  }

  /**
   * Git履歴を解析
   */
  private async analyzeGitHistory(): Promise<GitHistory | undefined> {
    if (!this.git) return undefined;

    try {
      const log = await this.git.log();
      const branches = await this.git.branchLocal();
      const tags = await this.git.tags();

      // コントリビューター集計
      const contributorMap = new Map<string, Contributor>();

      for (const commit of log.all) {
        const key = `${commit.author_name}:${commit.author_email}`;

        if (!contributorMap.has(key)) {
          contributorMap.set(key, {
            name: commit.author_name,
            email: commit.author_email,
            commits: 0,
            firstCommit: new Date(commit.date),
            lastCommit: new Date(commit.date)
          });
        }

        const contributor = contributorMap.get(key)!;
        contributor.commits++;

        const commitDate = new Date(commit.date);
        if (commitDate < contributor.firstCommit) {
          contributor.firstCommit = commitDate;
        }
        if (commitDate > contributor.lastCommit) {
          contributor.lastCommit = commitDate;
        }
      }

      const contributors = Array.from(contributorMap.values());

      // コミット頻度計算
      const firstCommit = log.all.length > 0 ? new Date(log.all[log.all.length - 1].date) : undefined;
      const lastCommit = log.all.length > 0 ? new Date(log.all[0].date) : undefined;

      let commitFrequency = { daily: 0, weekly: 0, monthly: 0, yearly: 0 };

      if (firstCommit && lastCommit) {
        const days = Math.max(1, (lastCommit.getTime() - firstCommit.getTime()) / (1000 * 60 * 60 * 24));
        commitFrequency = {
          daily: log.total / days,
          weekly: (log.total / days) * 7,
          monthly: (log.total / days) * 30,
          yearly: (log.total / days) * 365
        };
      }

      return {
        totalCommits: log.total,
        firstCommit,
        lastCommit,
        contributors,
        commitFrequency,
        branches: branches.all,
        tags: tags.all
      };
    } catch (error) {
      console.error('Failed to analyze git history:', error);
      return undefined;
    }
  }

  /**
   * メタデータを解析
   */
  private async analyzeMetadata(repoPath: string) {
    const checkFile = async (filename: string) => {
      try {
        await fs.access(path.join(repoPath, filename));
        return true;
      } catch {
        return false;
      }
    };

    const [hasGit, hasReadme, hasLicense, hasDockerfile, hasCI] = await Promise.all([
      checkFile('.git'),
      Promise.any([
        checkFile('README.md'),
        checkFile('README.txt'),
        checkFile('readme.md')
      ]).then(() => true).catch(() => false),
      Promise.any([
        checkFile('LICENSE'),
        checkFile('LICENSE.md'),
        checkFile('LICENSE.txt')
      ]).then(() => true).catch(() => false),
      Promise.any([
        checkFile('Dockerfile'),
        checkFile('docker-compose.yml')
      ]).then(() => true).catch(() => false),
      Promise.any([
        checkFile('.github/workflows'),
        checkFile('.gitlab-ci.yml'),
        checkFile('Jenkinsfile')
      ]).then(() => true).catch(() => false)
    ]);

    const packageManagers: string[] = [];
    if (await checkFile('package.json')) packageManagers.push('npm');
    if (await checkFile('composer.json')) packageManagers.push('composer');
    if (await checkFile('pom.xml')) packageManagers.push('maven');
    if (await checkFile('build.gradle')) packageManagers.push('gradle');
    if (await checkFile('requirements.txt')) packageManagers.push('pip');
    if (await checkFile('Gemfile')) packageManagers.push('bundler');

    return {
      hasGit,
      hasReadme,
      hasLicense,
      hasDockerfile,
      hasCI,
      packageManagers
    };
  }

  /**
   * 全ファイルを再帰的に取得
   */
  private async getAllFiles(dir: string, excludePatterns: string[]): Promise<string[]> {
    const files: string[] = [];

    const walk = async (currentPath: string) => {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        // 除外パターンチェック
        if (excludePatterns.some(pattern => entry.name === pattern)) {
          continue;
        }

        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile()) {
          files.push(fullPath);
        }
      }
    };

    await walk(dir);
    return files;
  }

  /**
   * ファイルを解析
   */
  private async analyzeFile(filePath: string): Promise<LanguageStats> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      let blankLines = 0;
      let commentLines = 0;

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === '') {
          blankLines++;
        } else if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*')) {
          commentLines++;
        }
      }

      return {
        files: 1,
        lines: lines.length,
        blankLines,
        commentLines,
        codeLines: lines.length - blankLines - commentLines
      };
    } catch {
      // バイナリファイルなど
      return {
        files: 1,
        lines: 0,
        blankLines: 0,
        commentLines: 0,
        codeLines: 0
      };
    }
  }

  /**
   * 拡張子から言語を判定
   */
  private detectLanguage(ext: string): string {
    const languageMap: Record<string, string> = {
      '.js': 'JavaScript',
      '.jsx': 'JavaScript',
      '.ts': 'TypeScript',
      '.tsx': 'TypeScript',
      '.php': 'PHP',
      '.py': 'Python',
      '.java': 'Java',
      '.cs': 'C#',
      '.cpp': 'C++',
      '.c': 'C',
      '.rb': 'Ruby',
      '.go': 'Go',
      '.rs': 'Rust',
      '.swift': 'Swift',
      '.kt': 'Kotlin',
      '.html': 'HTML',
      '.css': 'CSS',
      '.scss': 'SCSS',
      '.sass': 'Sass',
      '.json': 'JSON',
      '.xml': 'XML',
      '.yml': 'YAML',
      '.yaml': 'YAML',
      '.md': 'Markdown',
      '.sql': 'SQL',
      '.sh': 'Shell'
    };

    return languageMap[ext] || 'Unknown';
  }

  /**
   * 言語の拡張子を取得
   */
  private getExtensionsForLanguage(language: string): string[] {
    const extensionMap: Record<string, string[]> = {
      'JavaScript': ['.js', '.jsx'],
      'TypeScript': ['.ts', '.tsx'],
      'PHP': ['.php'],
      'Python': ['.py'],
      'Java': ['.java'],
      'C#': ['.cs'],
      'C++': ['.cpp', '.cc', '.cxx'],
      'C': ['.c', '.h'],
      'Ruby': ['.rb'],
      'Go': ['.go'],
      'Rust': ['.rs'],
      'Swift': ['.swift'],
      'Kotlin': ['.kt'],
      'HTML': ['.html', '.htm'],
      'CSS': ['.css'],
      'SCSS': ['.scss'],
      'Sass': ['.sass'],
      'JSON': ['.json'],
      'XML': ['.xml'],
      'YAML': ['.yml', '.yaml'],
      'Markdown': ['.md'],
      'SQL': ['.sql'],
      'Shell': ['.sh']
    };

    return extensionMap[language] || [];
  }
}
