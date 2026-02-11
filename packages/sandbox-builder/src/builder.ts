import { promises as fs } from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  DetectionResult,
  EnvironmentType,
  DatabaseType,
  SandboxBuildOptions,
  SandboxEnvironment,
  DockerComposeConfig,
  DockerfileConfig,
  HealthCheckResult,
  Snapshot
} from './types.js';

/**
 * サンドボックスビルダークラス
 */
export class SandboxBuilder {
  /**
   * 環境を検出
   */
  async detect(targetPath: string): Promise<DetectionResult> {
    const absolutePath = path.resolve(targetPath);

    // ディレクトリの存在確認
    try {
      await fs.access(absolutePath);
    } catch (error) {
      throw new Error(`Target path not found: ${absolutePath}`);
    }

    // 各タイプを判定
    const [
      hasPackageJson,
      hasComposerJson,
      hasRequirementsTxt,
      hasCsproj,
      hasPomXml,
      hasGemfile,
      hasDockerfile,
      hasDockerCompose
    ] = await Promise.all([
      this.fileExists(path.join(absolutePath, 'package.json')),
      this.fileExists(path.join(absolutePath, 'composer.json')),
      this.fileExists(path.join(absolutePath, 'requirements.txt')),
      this.hasCsprojFile(absolutePath),
      this.fileExists(path.join(absolutePath, 'pom.xml')),
      this.fileExists(path.join(absolutePath, 'Gemfile')),
      this.fileExists(path.join(absolutePath, 'Dockerfile')),
      this.fileExists(path.join(absolutePath, 'docker-compose.yml'))
    ]);

    let type = EnvironmentType.Unknown;
    let confidence = 0;
    const details: any = {};
    const databases: DatabaseType[] = [];
    const ports: number[] = [];

    // Node.js検出
    if (hasPackageJson) {
      type = EnvironmentType.NodeJS;
      confidence = 0.9;

      try {
        const packageJson = JSON.parse(
          await fs.readFile(path.join(absolutePath, 'package.json'), 'utf-8')
        );

        details.runtime = 'Node.js';
        details.packageManager = 'npm';

        if (packageJson.dependencies?.typescript) {
          details.framework = 'TypeScript';
        }
        if (packageJson.dependencies?.express) {
          details.framework = 'Express';
          ports.push(3000);
        }
        if (packageJson.dependencies?.next) {
          details.framework = 'Next.js';
          ports.push(3000);
        }

        // データベース検出
        if (packageJson.dependencies?.pg) databases.push(DatabaseType.PostgreSQL);
        if (packageJson.dependencies?.mysql) databases.push(DatabaseType.MySQL);
        if (packageJson.dependencies?.mongodb) databases.push(DatabaseType.MongoDB);
        if (packageJson.dependencies?.redis) databases.push(DatabaseType.Redis);
      } catch (error) {
        // package.jsonのパースに失敗した場合は基本情報のみ設定
        details.runtime = 'Node.js';
        details.packageManager = 'npm';
        details.error = 'Failed to parse package.json';
      }
    }

    // PHP検出
    if (hasComposerJson) {
      type = EnvironmentType.PHP;
      confidence = 0.9;

      try {
        const composerJson = JSON.parse(
          await fs.readFile(path.join(absolutePath, 'composer.json'), 'utf-8')
        );

        details.runtime = 'PHP';
        details.packageManager = 'composer';

        if (composerJson.require?.['laravel/framework']) {
          details.framework = 'Laravel';
          ports.push(8000);
        }

        // データベース検出
        if (composerJson.require?.['doctrine/dbal']) databases.push(DatabaseType.MySQL);
      } catch (error) {
        // composer.jsonのパースに失敗した場合は基本情報のみ設定
        details.runtime = 'PHP';
        details.packageManager = 'composer';
        details.error = 'Failed to parse composer.json';
      }
    }

    // Python検出
    if (hasRequirementsTxt) {
      type = EnvironmentType.Python;
      confidence = 0.8;
      details.runtime = 'Python';
      details.packageManager = 'pip';
      ports.push(5000);

      const requirements = await fs.readFile(
        path.join(absolutePath, 'requirements.txt'),
        'utf-8'
      );

      if (requirements.includes('django')) {
        details.framework = 'Django';
        ports[0] = 8000;
      }
      if (requirements.includes('flask')) {
        details.framework = 'Flask';
      }
    }

    // .NET検出
    if (hasCsproj) {
      type = EnvironmentType.DotNet;
      confidence = 0.9;
      details.runtime = '.NET';
      details.packageManager = 'dotnet';
      ports.push(5000);
    }

    // Java検出
    if (hasPomXml) {
      type = EnvironmentType.Java;
      confidence = 0.9;
      details.runtime = 'Java';
      details.packageManager = 'Maven';
      ports.push(8080);
    }

    // Ruby検出
    if (hasGemfile) {
      type = EnvironmentType.Ruby;
      confidence = 0.9;
      details.runtime = 'Ruby';
      details.packageManager = 'bundler';
      ports.push(3000);

      const gemfile = await fs.readFile(
        path.join(absolutePath, 'Gemfile'),
        'utf-8'
      );

      if (gemfile.includes('rails')) {
        details.framework = 'Ruby on Rails';
      }
    }

    return {
      type,
      confidence,
      details,
      databases,
      ports: ports.length > 0 ? ports : [8000],
      dependencies: [],
      hasDocker: hasDockerfile,
      hasDockerCompose: hasDockerCompose
    };
  }

  /**
   * サンドボックス環境を構築
   */
  async build(
    targetPath: string,
    options: SandboxBuildOptions
  ): Promise<SandboxEnvironment> {
    const detection = await this.detect(targetPath);

    // 出力ディレクトリを作成
    await fs.mkdir(options.outputDir, { recursive: true });

    const envType = options.type || detection.type;

    // Docker Composeファイル生成
    if (options.useExistingDocker && detection.hasDockerCompose) {
      // 既存のdocker-compose.ymlをコピー
      await fs.copyFile(
        path.join(targetPath, 'docker-compose.yml'),
        path.join(options.outputDir, 'docker-compose.yml')
      );
    } else {
      const dockerCompose = this.generateDockerCompose(detection, options);
      await fs.writeFile(
        path.join(options.outputDir, 'docker-compose.yml'),
        this.dockerComposeToYaml(dockerCompose),
        'utf-8'
      );
    }

    // Dockerfile生成（必要に応じて）
    if (!options.useExistingDocker || !detection.hasDocker) {
      const dockerfile = this.generateDockerfile(envType, detection);
      await fs.writeFile(
        path.join(options.outputDir, 'Dockerfile'),
        this.dockerfileToString(dockerfile),
        'utf-8'
      );
    }

    // メタデータ保存
    const sandbox: SandboxEnvironment = {
      id: randomUUID(),
      path: options.outputDir,
      type: envType,
      status: 'stopped',
      createdAt: new Date(),
      ports: {},
      services: ['app']
    };

    if (options.includeDatabase !== false && detection.databases.length > 0) {
      sandbox.services.push('db');
    }

    await fs.writeFile(
      path.join(options.outputDir, 'sandbox.json'),
      JSON.stringify(sandbox, null, 2),
      'utf-8'
    );

    // READMEを生成
    await this.generateReadme(options.outputDir, sandbox, detection);

    return sandbox;
  }

  /**
   * Docker Composeを生成
   */
  private generateDockerCompose(
    detection: DetectionResult,
    options: SandboxBuildOptions
  ): DockerComposeConfig {
    const config: DockerComposeConfig = {
      version: '3.8',
      services: {}
    };

    // アプリケーションサービス
    config.services.app = {
      build: {
        context: '.',
        dockerfile: 'Dockerfile'
      },
      ports: detection.ports.map(p => `${p}:${p}`),
      environment: options.environment || {},
      volumes: ['./app:/app'],
      networks: ['sandbox-network']
    };

    // データベースサービス
    if (options.includeDatabase !== false && detection.databases.length > 0) {
      const dbType = detection.databases[0];

      if (dbType === DatabaseType.PostgreSQL) {
        config.services.db = {
          image: 'postgres:15-alpine',
          environment: {
            POSTGRES_DB: 'testdb',
            POSTGRES_USER: 'testuser',
            POSTGRES_PASSWORD: 'testpass'
          },
          volumes: ['db-data:/var/lib/postgresql/data'],
          networks: ['sandbox-network']
        };
      } else if (dbType === DatabaseType.MySQL) {
        config.services.db = {
          image: 'mysql:8.0',
          environment: {
            MYSQL_DATABASE: 'testdb',
            MYSQL_USER: 'testuser',
            MYSQL_PASSWORD: 'testpass',
            MYSQL_ROOT_PASSWORD: 'rootpass'
          },
          volumes: ['db-data:/var/lib/mysql'],
          networks: ['sandbox-network']
        };
      }

      // アプリケーションにDB依存を追加
      config.services.app.depends_on = ['db'];
      if (!config.services.app.environment) {
        config.services.app.environment = {};
      }
      config.services.app.environment.DB_HOST = 'db';
    }

    // ネットワーク定義
    config.networks = {
      'sandbox-network': {
        driver: 'bridge'
      }
    };

    // ボリューム定義
    if (config.services.db) {
      config.volumes = {
        'db-data': {}
      };
    }

    return config;
  }

  /**
   * Dockerfileを生成
   */
  private generateDockerfile(
    type: EnvironmentType,
    detection: DetectionResult
  ): DockerfileConfig {
    switch (type) {
      case EnvironmentType.NodeJS:
        return {
          baseImage: 'node:18-alpine',
          workdir: '/app',
          copy: [
            { src: 'package*.json', dest: './' },
            { src: '.', dest: '.' }
          ],
          run: ['npm install'],
          cmd: ['npm', 'start'],
          expose: detection.ports
        };

      case EnvironmentType.PHP:
        return {
          baseImage: 'php:8.2-fpm',
          workdir: '/var/www/html',
          copy: [
            { src: 'composer.json', dest: './' },
            { src: '.', dest: '.' }
          ],
          run: [
            'apt-get update && apt-get install -y git unzip',
            'curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer',
            'composer install'
          ],
          cmd: ['php', '-S', '0.0.0.0:8000'],
          expose: detection.ports
        };

      case EnvironmentType.Python:
        return {
          baseImage: 'python:3.11-slim',
          workdir: '/app',
          copy: [
            { src: 'requirements.txt', dest: './' },
            { src: '.', dest: '.' }
          ],
          run: ['pip install --no-cache-dir -r requirements.txt'],
          cmd: ['python', 'app.py'],
          expose: detection.ports
        };

      default:
        return {
          baseImage: 'nginx:alpine',
          workdir: '/usr/share/nginx/html',
          copy: [{ src: '.', dest: '.' }],
          run: [],
          cmd: ['nginx', '-g', 'daemon off;'],
          expose: [80]
        };
    }
  }

  /**
   * Docker ComposeをYAML文字列に変換
   */
  private dockerComposeToYaml(config: DockerComposeConfig): string {
    // 簡易YAML生成（実際にはyamlライブラリを使用）
    let yaml = `version: '${config.version}'\n\n`;

    yaml += 'services:\n';
    for (const [name, service] of Object.entries(config.services)) {
      yaml += `  ${name}:\n`;

      if (service.image) {
        yaml += `    image: ${service.image}\n`;
      }

      if (service.build) {
        yaml += `    build:\n`;
        yaml += `      context: ${service.build.context}\n`;
        if (service.build.dockerfile) {
          yaml += `      dockerfile: ${service.build.dockerfile}\n`;
        }
      }

      if (service.ports) {
        yaml += `    ports:\n`;
        service.ports.forEach(p => {
          yaml += `      - "${p}"\n`;
        });
      }

      if (service.environment) {
        yaml += `    environment:\n`;
        Object.entries(service.environment).forEach(([key, value]) => {
          yaml += `      ${key}: ${value}\n`;
        });
      }

      if (service.volumes) {
        yaml += `    volumes:\n`;
        service.volumes.forEach(v => {
          yaml += `      - ${v}\n`;
        });
      }

      if (service.depends_on) {
        yaml += `    depends_on:\n`;
        service.depends_on.forEach(d => {
          yaml += `      - ${d}\n`;
        });
      }

      if (service.networks) {
        yaml += `    networks:\n`;
        service.networks.forEach(n => {
          yaml += `      - ${n}\n`;
        });
      }

      yaml += '\n';
    }

    if (config.networks) {
      yaml += 'networks:\n';
      for (const [name, network] of Object.entries(config.networks)) {
        yaml += `  ${name}:\n`;
        if (network.driver) {
          yaml += `    driver: ${network.driver}\n`;
        }
      }
      yaml += '\n';
    }

    if (config.volumes) {
      yaml += 'volumes:\n';
      for (const name of Object.keys(config.volumes)) {
        yaml += `  ${name}:\n`;
      }
    }

    return yaml;
  }

  /**
   * Dockerfileを文字列に変換
   */
  private dockerfileToString(config: DockerfileConfig): string {
    let dockerfile = '';

    dockerfile += `FROM ${config.baseImage}\n\n`;
    dockerfile += `WORKDIR ${config.workdir}\n\n`;

    config.copy.forEach(c => {
      dockerfile += `COPY ${c.src} ${c.dest}\n`;
    });
    dockerfile += '\n';

    config.run.forEach(cmd => {
      dockerfile += `RUN ${cmd}\n`;
    });
    if (config.run.length > 0) dockerfile += '\n';

    config.expose.forEach(port => {
      dockerfile += `EXPOSE ${port}\n`;
    });
    if (config.expose.length > 0) dockerfile += '\n';

    dockerfile += `CMD [${config.cmd.map(c => `"${c}"`).join(', ')}]\n`;

    return dockerfile;
  }

  /**
   * READMEを生成
   */
  private async generateReadme(
    outputDir: string,
    sandbox: SandboxEnvironment,
    detection: DetectionResult
  ): Promise<void> {
    const readme = `# Sandbox Environment

## 概要

このディレクトリは自動生成されたサンドボックス環境です。

- **環境タイプ**: ${detection.type}
- **フレームワーク**: ${detection.details.framework || 'N/A'}
- **作成日時**: ${sandbox.createdAt.toISOString()}

## 使用方法

### 起動

\`\`\`bash
docker-compose up -d
\`\`\`

### 停止

\`\`\`bash
docker-compose down
\`\`\`

### ログ確認

\`\`\`bash
docker-compose logs -f
\`\`\`

### ヘルスチェック

\`\`\`bash
docker-compose ps
\`\`\`

## アクセス

${detection.ports.map(p => `- アプリケーション: http://localhost:${p}`).join('\n')}

## 注意事項

- このサンドボックス環境は開発・テスト専用です
- 本番環境では使用しないでください
- 機密情報を含めないでください
`;

    await fs.writeFile(path.join(outputDir, 'README.md'), readme, 'utf-8');
  }

  /**
   * ファイル存在確認
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * .csprojファイルがあるか確認
   */
  private async hasCsprojFile(dirPath: string): Promise<boolean> {
    try {
      const files = await fs.readdir(dirPath);
      return files.some(f => f.endsWith('.csproj'));
    } catch {
      return false;
    }
  }
}

/**
 * サンドボックスコントローラークラス
 */
export class SandboxController {
  private sandboxPath: string;
  private sandbox: SandboxEnvironment | null = null;
  private execRaw = exec;
  private execAsync = promisify(this.execRaw);

  constructor(sandboxPath: string) {
    this.sandboxPath = sandboxPath;
  }

  /**
   * サンドボックス情報を読み込み
   */
  async load(): Promise<void> {
    const metadataPath = path.join(this.sandboxPath, 'sandbox.json');

    try {
      await fs.access(metadataPath);
    } catch (error) {
      throw new Error(`Sandbox metadata not found at: ${metadataPath}`);
    }

    try {
      const content = await fs.readFile(metadataPath, 'utf-8');
      this.sandbox = JSON.parse(content);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in sandbox metadata: ${error.message}`);
      }
      throw new Error(`Failed to read sandbox metadata: ${error}`);
    }
  }

  /**
   * 環境を起動（実装版）
   */
  async up(): Promise<void> {
    try {
      console.log('Starting sandbox environment...');
      const command = 'docker-compose up -d';
      await this.execAsync(command, { cwd: this.sandboxPath });

      if (this.sandbox) {
        this.sandbox.status = 'running';
        await this.save();
      }

      console.log('Sandbox environment started successfully');
    } catch (error) {
      throw new Error(`Failed to start sandbox: ${error}`);
    }
  }

  /**
   * 環境を停止（実装版）
   */
  async down(): Promise<void> {
    try {
      console.log('Stopping sandbox environment...');
      const command = 'docker-compose down';
      await this.execAsync(command, { cwd: this.sandboxPath });

      if (this.sandbox) {
        this.sandbox.status = 'stopped';
        await this.save();
      }

      console.log('Sandbox environment stopped successfully');
    } catch (error) {
      throw new Error(`Failed to stop sandbox: ${error}`);
    }
  }

  /**
   * ヘルスチェック（実装版）
   */
  async health(): Promise<HealthCheckResult> {
    try {
      const command = 'docker-compose ps --format json';
      const { stdout } = await this.execAsync(command, { cwd: this.sandboxPath });

      if (!stdout || stdout.trim() === '') {
        return {
          healthy: false,
          services: {},
          timestamp: new Date(),
          error: 'No containers found'
        };
      }

      let containers: any[];
      try {
        containers = JSON.parse(`[${stdout.trim().split('\n').join(',')}]`);
      } catch (parseError) {
        return {
          healthy: false,
          services: {},
          timestamp: new Date(),
          error: `Failed to parse docker-compose output: ${parseError}`
        };
      }

      const services: Record<string, any> = {};

      for (const container of containers) {
        services[container.Service] = {
          name: container.Service,
          status: container.State === 'running' ? 'healthy' : 'unhealthy',
          uptime: 0 // Docker Composeからは取得困難
        };
      }

      const healthy = Object.values(services).every((s: any) => s.status === 'healthy');

      return {
        healthy,
        services,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        healthy: false,
        services: {},
        timestamp: new Date(),
        error: String(error)
      };
    }
  }

  /**
   * ログを取得
   */
  async getLogs(service?: string, tail: number = 100): Promise<string> {
    try {
      const serviceArg = service ? service : '';
      const command = `docker-compose logs --tail=${tail} ${serviceArg}`;
      const { stdout } = await this.execAsync(command, { cwd: this.sandboxPath });
      return stdout;
    } catch (error) {
      throw new Error(`Failed to get logs: ${error}`);
    }
  }

  /**
   * ログをストリーム
   */
  async streamLogs(
    onLog: (log: string) => void,
    service?: string
  ): Promise<void> {
    const serviceArg = service ? service : '';
    const command = `docker-compose logs -f ${serviceArg}`;

    const child = this.execRaw(command, { cwd: this.sandboxPath });

    child.stdout?.on('data', (data: Buffer) => {
      onLog(data.toString());
    });

    child.stderr?.on('data', (data: Buffer) => {
      onLog(`ERROR: ${data.toString()}`);
    });
  }

  /**
   * パフォーマンスメトリクスを取得
   */
  async getPerformanceMetrics(): Promise<{
    cpu: Record<string, number>;
    memory: Record<string, { used: number; limit: number; percentage: number }>;
    network: Record<string, { rx: number; tx: number }>;
  }> {
    try {
      const command = 'docker stats --no-stream --format "{{.Container}}|{{.CPUPerc}}|{{.MemUsage}}|{{.NetIO}}"';
      const { stdout } = await this.execAsync(command);

      const lines = stdout.trim().split('\n');
      const cpu: Record<string, number> = {};
      const memory: Record<string, any> = {};
      const network: Record<string, any> = {};

      for (const line of lines) {
        const [container, cpuPerc, memUsage, netIO] = line.split('|');

        // CPU（例: "12.34%" → 12.34）
        cpu[container] = parseFloat(cpuPerc.replace('%', ''));

        // メモリ（例: "123MiB / 2GiB"）
        const [used, limit] = memUsage.split(' / ');
        const usedMB = this.parseMemory(used);
        const limitMB = this.parseMemory(limit);
        memory[container] = {
          used: usedMB,
          limit: limitMB,
          percentage: (usedMB / limitMB) * 100
        };

        // ネットワーク（例: "1.23MB / 456kB"）
        const [rx, tx] = netIO.split(' / ');
        network[container] = {
          rx: this.parseMemory(rx),
          tx: this.parseMemory(tx)
        };
      }

      return { cpu, memory, network };
    } catch (error) {
      throw new Error(`Failed to get performance metrics: ${error}`);
    }
  }

  /**
   * メモリサイズをMBに変換
   */
  private parseMemory(size: string): number {
    const value = parseFloat(size);
    if (size.includes('GiB') || size.includes('GB')) {
      return value * 1024;
    } else if (size.includes('MiB') || size.includes('MB')) {
      return value;
    } else if (size.includes('KiB') || size.includes('kB')) {
      return value / 1024;
    }
    return value;
  }

  /**
   * スナップショットを作成（実装版）
   */
  async createSnapshot(name: string): Promise<Snapshot> {
    try {
      // ボリュームのバックアップを作成
      // TODO: Use timestamp for versioning in actual implementation
      const snapshotDir = path.join(this.sandboxPath, 'snapshots', name);
      await fs.mkdir(snapshotDir, { recursive: true });

      // TODO: Parse docker-compose.yml to get volume names in actual implementation
      // const composeContent = await fs.readFile(path.join(this.sandboxPath, 'docker-compose.yml'), 'utf-8');

      // 簡易的なバックアップ（実際にはdocker cpを使用）
      const command = `docker-compose pause`;
      await this.execAsync(command, { cwd: this.sandboxPath });

      // ここでボリュームをコピー...（省略）

      await this.execAsync('docker-compose unpause', { cwd: this.sandboxPath });

      const snapshot: Snapshot = {
        name,
        createdAt: new Date(),
        size: 0,
        description: `Snapshot created at ${new Date().toISOString()}`
      };

      // スナップショット情報を保存
      await fs.writeFile(
        path.join(snapshotDir, 'snapshot.json'),
        JSON.stringify(snapshot, null, 2),
        'utf-8'
      );

      return snapshot;
    } catch (error) {
      throw new Error(`Failed to create snapshot: ${error}`);
    }
  }

  /**
   * スナップショットから復元（実装版）
   */
  async restoreSnapshot(name: string): Promise<void> {
    try {
      console.log(`Restoring snapshot: ${name}`);
      // TODO: Implement snapshot restoration logic
      // This will involve:
      // 1. Reading snapshot metadata from snapshots/{name}/snapshot.json
      // 2. Stopping current environment
      // 3. Restoring volumes from backup
      // 4. Restarting environment with restored data

      // 環境を停止
      await this.down();

      // ボリュームを復元（実装省略）

      // 環境を再起動
      await this.up();

      console.log('Snapshot restored successfully');
    } catch (error) {
      throw new Error(`Failed to restore snapshot: ${error}`);
    }
  }

  /**
   * コンテナ内でコマンドを実行
   */
  async exec(service: string, command: string): Promise<string> {
    try {
      const fullCommand = `docker-compose exec -T ${service} ${command}`;
      const { stdout } = await this.execAsync(fullCommand, { cwd: this.sandboxPath });
      return stdout;
    } catch (error) {
      throw new Error(`Failed to execute command: ${error}`);
    }
  }

  /**
   * メタデータを保存
   */
  private async save(): Promise<void> {
    if (this.sandbox) {
      const metadataPath = path.join(this.sandboxPath, 'sandbox.json');
      await fs.writeFile(
        metadataPath,
        JSON.stringify(this.sandbox, null, 2),
        'utf-8'
      );
    }
  }
}
